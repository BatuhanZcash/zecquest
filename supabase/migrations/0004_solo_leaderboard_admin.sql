-- =====================================================================
-- ZecQuest — 0004: Solo oyun, liderlik, ödüller, yönetim ve yetkiler
-- =====================================================================

-- ---------------------------------------------------------------------
-- Solo (sunucu doğrulamalı: doğru cevap ancak cevap verildikten sonra gelir)
-- ---------------------------------------------------------------------
create or replace function public._solo_question(p_quiz uuid, p_idx int)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('index', p_idx, 'text', x.text, 'options', x.options,
                            'time_limit', _answer_secs())
    from (select * from questions where quiz_id = p_quiz order by position offset p_idx limit 1) x
    join quizzes z on z.id = x.quiz_id
$$;

create or replace function public.solo_start(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; qz quizzes; sid uuid;
begin
  me := _require_user();
  select * into qz from quizzes where id = p_quiz_id;
  if not found then raise exception 'not_found'; end if;
  if qz.status <> 'published' and qz.author_id <> me.id and not is_admin() then raise exception 'forbidden'; end if;
  if qz.question_count = 0 then raise exception 'questions_required'; end if;
  insert into solo_sessions (user_id, quiz_id, total) values (me.id, qz.id, qz.question_count)
  returning id into sid;
  return jsonb_build_object('session_id', sid, 'total', qz.question_count, 'score', 0, 'streak', 0,
                            'question', _solo_question(qz.id, 0), 'server_now', _now_ms(clock_timestamp()),
                            'started_at', _now_ms(now()));
end $$;

-- Yarım kalan oturuma dönmek için (sayfa yenilendiğinde)
create or replace function public.solo_resume(p_session uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s solo_sessions;
begin
  perform _require_user();
  select * into s from solo_sessions where id = p_session and user_id = auth.uid();
  if not found or s.finished_at is not null then return null; end if;
  return jsonb_build_object('session_id', s.id, 'total', s.total, 'score', s.score, 'streak', s.streak,
                            'correct', s.correct, 'answered', s.answered,
                            'question', _solo_question(s.quiz_id, s.current_q),
                            'server_now', _now_ms(clock_timestamp()), 'started_at', _now_ms(s.q_started_at));
end $$;

create or replace function public.solo_answer(p_session uuid, p_choice int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s solo_sessions; x questions; lim int; el int; ok boolean; pts int;
begin
  perform _require_user();
  select * into s from solo_sessions where id = p_session and user_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if s.finished_at is not null or s.answered then raise exception 'already_answered'; end if;
  select * into x from questions where quiz_id = s.quiz_id order by position offset s.current_q limit 1;
  lim := _answer_secs();
  el := greatest(0, (_now_ms(now()) - _now_ms(s.q_started_at))::int - _latency_grace_ms());
  -- Süre dolduktan sonra gelen cevap boş sayılır
  if p_choice is not null and el > lim * 1000 + _late_accept_ms() then p_choice := null; end if;
  ok := p_choice is not null and p_choice = x.correct;
  pts := _points(ok, el, lim, s.streak);
  update solo_sessions set
    answered = true, score = score + pts, correct = correct + ok::int,
    streak = case when ok then streak + 1 else 0 end
  where id = s.id;
  return jsonb_build_object('correct', x.correct, 'is_correct', ok, 'choice', p_choice, 'points', pts,
                            'score', s.score + pts, 'streak', case when ok then s.streak + 1 else 0 end,
                            'explanation', x.explanation, 'is_last', s.current_q + 1 >= s.total);
end $$;

create or replace function public.solo_next(p_session uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s solo_sessions; rnk bigint; best int;
begin
  perform _require_user();
  select * into s from solo_sessions where id = p_session and user_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if s.finished_at is not null then raise exception 'finished'; end if;
  if not s.answered then raise exception 'answer_first'; end if;

  if s.current_q + 1 >= s.total then
    update solo_sessions set finished_at = now() where id = s.id;
    insert into score_events (user_id, source, ref_id, quiz_id, score, correct, total)
    values (s.user_id, 'solo', s.id, s.quiz_id, s.score, s.correct, s.total)
    on conflict do nothing;
    select max(score) into best from score_events where user_id = s.user_id and quiz_id = s.quiz_id;
    select count(*) + 1 into rnk from (
      select user_id, max(score) m from score_events where quiz_id = s.quiz_id group by user_id
    ) t where t.m > best;
    return jsonb_build_object('finished', true, 'score', s.score, 'correct', s.correct, 'total', s.total,
                              'best', best, 'quiz_rank', rnk);
  end if;

  update solo_sessions set current_q = current_q + 1, answered = false, q_started_at = now() where id = s.id;
  return jsonb_build_object('finished', false, 'question', _solo_question(s.quiz_id, s.current_q + 1),
                            'server_now', _now_ms(clock_timestamp()), 'started_at', _now_ms(now()));
end $$;

-- ---------------------------------------------------------------------
-- Liderlik
--   p_group: 'player' | 'country' | 'team'
--   p_range: 'all' | 'month' | 'week' | 'today'
-- ---------------------------------------------------------------------
create or replace function public.get_leaderboard(
  p_group text default 'player', p_range text default 'all', p_quiz uuid default null, p_limit int default 50)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare since timestamptz; lim int := least(greatest(p_limit, 1), 200); me_row jsonb := null;
begin
  since := case p_range
    when 'today' then date_trunc('day', now())
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '30 days'
    else null end;

  if p_group = 'country' or p_group = 'team' then
    return jsonb_build_object('rows', coalesce((
      select jsonb_agg(r order by r.score desc) from (
        select case when p_group = 'country' then p.country else p.team end as key,
               sum(t.score)::bigint as score, count(distinct t.user_id) as players
          from _user_totals(since, p_quiz) t join profiles p on p.id = t.user_id
         where not p.banned and (case when p_group = 'country' then p.country else p.team end) is not null
         group by 1 order by 2 desc limit lim
      ) r), '[]'::jsonb));
  end if;

  if auth.uid() is not null then
    select jsonb_build_object('rank', (select count(*) + 1 from _user_totals(since, p_quiz) o where o.score > t.score),
                              'score', t.score, 'games', t.games)
      into me_row from _user_totals(since, p_quiz) t where t.user_id = auth.uid();
  end if;

  return jsonb_build_object('rows', coalesce((
    select jsonb_agg(r order by r.score desc, r.username) from (
      select p.username, p.display_name, p.country, p.team, t.score, t.games
        from _user_totals(since, p_quiz) t join profiles p on p.id = t.user_id
       where not p.banned and p.username is not null
       order by t.score desc limit lim
    ) r), '[]'::jsonb), 'me', me_row);
end $$;

-- ---------------------------------------------------------------------
-- Ödüller (oyuncu tarafı)
-- ---------------------------------------------------------------------
create or replace function public.my_prizes()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_user();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'place', c.place, 'status', c.status, 'address', c.address, 'txid', c.txid,
      'created_at', c.created_at, 'paid_at', c.paid_at,
      'game', jsonb_build_object('id', g.id, 'title', g.title, 'prize', g.prize, 'ended_at', g.ended_at))
      order by c.created_at desc)
    from prize_claims c join games g on g.id = c.game_id
    where c.user_id = auth.uid()
  ), '[]'::jsonb);
end $$;

create or replace function public.submit_prize_address(p_claim uuid, p_address text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare c prize_claims;
begin
  perform _require_user();
  select * into c from prize_claims where id = p_claim and user_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if c.status in ('paid', 'void') then raise exception 'closed'; end if;
  if not is_valid_zcash_address(trim(p_address)) then raise exception 'invalid_zcash_address'; end if;
  update prize_claims set address = trim(p_address), status = 'pending' where id = c.id;
  return my_prizes();
end $$;

-- ---------------------------------------------------------------------
-- Yönetim
-- ---------------------------------------------------------------------
create or replace function public._require_admin()
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_user();
  if not is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
end $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return jsonb_build_object(
    'users', (select count(*) from profiles where username is not null),
    'users_7d', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'quizzes_published', (select count(*) from quizzes where status = 'published'),
    'quizzes_pending', (select count(*) from quizzes where status = 'pending'),
    'creator_requests', (select count(*) from profiles where creator_request_at is not null and role = 'player'),
    'games_live', (select count(*) from games where status in ('question', 'reveal', 'leaderboard')),
    'events_upcoming', (select count(*) from games where mode = 'scheduled' and status = 'lobby'),
    'prizes_pending', (select count(*) from prize_claims where status in ('pending', 'awaiting_address')),
    'plays_7d', (select count(*) from score_events where created_at > now() - interval '7 days')
  );
end $$;

create or replace function public.admin_list_quizzes(p_status text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return coalesce((
    select jsonb_agg(_quiz_card(q) || jsonb_build_object('review_note', q.review_note, 'submitted_at', q.submitted_at)
                     order by q.submitted_at desc nulls last, q.updated_at desc)
    from quizzes q where p_status is null or q.status::text = p_status
  ), '[]'::jsonb);
end $$;

create or replace function public.review_quiz(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  update quizzes set
    status = case when p_approve then 'published'::quiz_status else 'rejected'::quiz_status end,
    published_at = case when p_approve then coalesce(published_at, now()) else published_at end,
    review_note = nullif(left(p_note, 1000), '')
  where id = p_id;
end $$;

create or replace function public.set_quiz_featured(p_id uuid, p_featured boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  update quizzes set featured = p_featured where id = p_id;
end $$;

create or replace function public.unpublish_quiz(p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  update quizzes set status = 'draft', featured = false where id = p_id;
end $$;

-- p_filter: 'requests' | 'creators' | 'admins' | 'banned' | null
create or replace function public.admin_list_users(p_search text default null, p_filter text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'username', p.username, 'display_name', p.display_name, 'country', p.country,
      'team', p.team, 'role', p.role, 'banned', p.banned, 'created_at', p.created_at,
      'creator_request_at', p.creator_request_at, 'creator_request_note', p.creator_request_note,
      'email', u.email) order by p.creator_request_at desc nulls last, p.created_at desc)
    from (select * from profiles p
           where (p_search is null or p_search = '' or p.username ilike '%' || p_search || '%'
                  or p.display_name ilike '%' || p_search || '%')
             and (p_filter is null
                  or (p_filter = 'requests' and p.creator_request_at is not null and p.role = 'player')
                  or (p_filter = 'creators' and p.role = 'creator')
                  or (p_filter = 'admins' and p.role = 'admin')
                  or (p_filter = 'banned' and p.banned))
           order by p.creator_request_at desc nulls last, p.created_at desc limit 200) p
    left join auth.users u on u.id = p.id
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'cannot_demote_self'; end if;
  update profiles set role = p_role::user_role,
                      creator_request_at = case when p_role = 'player' then creator_request_at else null end
   where id = p_user;
end $$;

create or replace function public.admin_reject_creator(p_user uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  update profiles set creator_request_at = null where id = p_user;
end $$;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  if p_user = auth.uid() then raise exception 'cannot_ban_self'; end if;
  update profiles set banned = p_banned where id = p_user;
end $$;

create or replace function public.admin_list_games(p_mode text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return coalesce((
    select jsonb_agg(_game_state(g) || jsonb_build_object(
             'player_count', (select count(*) from game_players p where p.game_id = g.id and not p.kicked),
             'created_at', g.created_at)
           order by coalesce(g.starts_at, g.created_at) desc)
    from (select * from games where p_mode is null or mode::text = p_mode
          order by coalesce(starts_at, created_at) desc limit 100) g
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_list_prizes(p_status text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'place', c.place, 'status', c.status, 'address', c.address, 'txid', c.txid,
      'admin_note', c.admin_note, 'created_at', c.created_at, 'paid_at', c.paid_at,
      'user', jsonb_build_object('username', p.username, 'display_name', p.display_name, 'country', p.country),
      'game', jsonb_build_object('id', g.id, 'title', g.title, 'prize', g.prize, 'ended_at', g.ended_at))
      order by c.created_at desc, c.place)
    from prize_claims c join profiles p on p.id = c.user_id join games g on g.id = c.game_id
    where p_status is null or c.status = p_status
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_update_prize(p_id uuid, p_status text, p_txid text default null, p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  if p_status not in ('awaiting_address', 'pending', 'paid', 'void') then raise exception 'invalid_status'; end if;
  update prize_claims set
    status = p_status,
    txid = coalesce(nullif(trim(p_txid), ''), txid),
    admin_note = coalesce(nullif(p_note, ''), admin_note),
    paid_at = case when p_status = 'paid' then now() else paid_at end
  where id = p_id;
end $$;

-- =====================================================================
-- Yetkiler: önce hepsini kapat, sonra API fonksiyonlarını aç
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Herkese açık (giriş gerekmez)
grant execute on function
  public.list_quizzes(text, text, text, int, int), public.list_tags(), public.get_quiz(text),
  public.find_game(text), public.get_game_state(uuid), public.server_time(),
  public.list_events(), public.get_game_results(uuid), public.get_leaderboard(text, text, uuid, int),
  public.get_public_profile(text), public.is_username_available(text), public.tick_game(uuid),
  public.my_game_status(uuid), public.get_my_profile(), public.is_valid_zcash_address(text)
to anon, authenticated;

-- Giriş gerekir (fonksiyonlar ayrıca kendi içinde rol denetler)
grant execute on function
  public.update_my_profile(jsonb), public.request_creator(text),
  public.list_my_quizzes(), public.get_quiz_for_edit(uuid), public.save_quiz(jsonb),
  public.submit_quiz(uuid), public.delete_quiz(uuid),
  public.create_hosted_game(uuid), public.create_event(jsonb), public.update_event(uuid, jsonb),
  public.cancel_game(uuid), public.join_game(text), public.submit_answer(uuid, int, int),
  public.advance_game(uuid), public.end_game_now(uuid), public.kick_player(uuid, uuid), public.host_view(uuid),
  public.solo_start(uuid), public.solo_resume(uuid), public.solo_answer(uuid, int), public.solo_next(uuid),
  public.my_prizes(), public.submit_prize_address(uuid, text),
  public.admin_stats(), public.admin_list_quizzes(text), public.review_quiz(uuid, boolean, text),
  public.set_quiz_featured(uuid, boolean), public.unpublish_quiz(uuid),
  public.admin_list_users(text, text), public.admin_set_role(uuid, text), public.admin_reject_creator(uuid),
  public.admin_set_banned(uuid, boolean), public.admin_list_games(text),
  public.admin_list_prizes(text), public.admin_update_prize(uuid, text, text, text)
to authenticated;
