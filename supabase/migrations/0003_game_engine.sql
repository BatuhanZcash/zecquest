-- =====================================================================
-- ZecQuest — 0003: Canlı oyun motoru
--
-- Oyunun tüm durumu bu tablolarda yaşar; tarayıcılar yalnızca görüntüler.
--  * Host ya da oyuncu sayfayı yenilerse kaldığı yerden devam eder.
--  * Süre ve puan sunucu saatiyle hesaplanır; doğru cevap, cevap
--    gösterilene kadar istemciye hiç gönderilmez.
--  * Faz geçişleri: host'un "ileri" komutu (hosted) ya da zaman dolunca
--    tick_game / tick_due_games (scheduled + süre dolumları).
--    tick'i herhangi bir istemci veya pg_cron çağırabilir; tekrarlı
--    çağrılar güvenlidir (idempotent).
--  * Her durum değişikliği Supabase Realtime "game:<id>" kanalına yayınlanır.
-- =====================================================================

-- Yanıt süresinde ağ gecikmesine tanınan pay (uzak ülkelerdeki oyuncular için adalet)
create or replace function public._latency_grace_ms() returns int language sql immutable as $$ select 800 $$;
-- Süre bittikten sonra hâlâ kabul edilen geç cevap payı
create or replace function public._late_accept_ms() returns int language sql immutable as $$ select 1500 $$;

-- ---------------------------------------------------------------------
-- Durum (herkese açık; doğru cevabı yalnızca reveal'dan sonra içerir)
-- ---------------------------------------------------------------------
create or replace function public._game_state(g public.games)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q game_questions;
begin
  if g.current_q >= 0 and g.status in ('question', 'reveal') then
    select * into q from game_questions where game_id = g.id and q_index = g.current_q;
  end if;
  return jsonb_build_object(
    'id', g.id, 'code', g.code, 'mode', g.mode, 'status', g.status, 'visibility', g.visibility,
    'title', g.title,
    'quiz', (select jsonb_build_object('id', z.id, 'slug', z.slug, 'title', z.title, 'icon', z.icon)
             from quizzes z where z.id = g.quiz_id),
    'host', (select jsonb_build_object('username', h.username, 'display_name', h.display_name)
             from profiles h where h.id = g.host_id),
    'question_count', g.question_count,
    'current_q', g.current_q,
    'phase_started_at', _now_ms(g.phase_started_at),
    'phase_ends_at', _now_ms(g.phase_ends_at),
    'starts_at', _now_ms(g.starts_at),
    'ended_at', _now_ms(g.ended_at),
    'reveal_secs', g.reveal_secs, 'board_secs', g.board_secs,
    'question', case when q.q_index is not null then jsonb_build_object(
        'index', q.q_index, 'text', q.text, 'options', q.options, 'time_limit', q.time_limit) end,
    'reveal', case when g.status in ('reveal', 'leaderboard', 'ended') then g.last_reveal end,
    'leaderboard', case when g.status in ('reveal', 'leaderboard', 'ended') then g.leaderboard else '[]'::jsonb end,
    'prize', g.prize, 'prize_places', g.prize_places,
    'version', g.state_version
  );
end $$;

create or replace function public._game_top(p_game uuid, p_limit int)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(t order by t.rank, t.joined_at), '[]'::jsonb) from (
    select p.user_id, p.name, p.country, p.team, p.score, p.correct, p.joined_at,
           rank() over (order by p.score desc) as rank
    from game_players p
    where p.game_id = p_game and not p.kicked
    order by p.score desc, p.joined_at
    limit p_limit
  ) t
$$;

-- Sürüm sayacı + realtime yayını
create or replace function public._games_before_update()
returns trigger language plpgsql as $$
begin
  new.state_version := old.state_version + 1;
  return new;
end $$;

create or replace function public._games_broadcast()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
    begin
      perform realtime.send(_game_state(new), 'state', 'game:' || new.id::text, false);
    exception when others then
      -- Yayın hatası oyunu asla bozmamalı; istemciler yoklamayla da günceller
      raise warning 'realtime broadcast failed: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

drop trigger if exists games_before_update on public.games;
create trigger games_before_update before update on public.games
  for each row execute function public._games_before_update();

drop trigger if exists games_broadcast on public.games;
create trigger games_broadcast after insert or update on public.games
  for each row execute function public._games_broadcast();

-- ---------------------------------------------------------------------
-- Faz geçişleri (iç fonksiyonlar; API'ye açık değil)
-- ---------------------------------------------------------------------
create or replace function public._start_question(p_game uuid, p_idx int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare lim int;
begin
  select time_limit into lim from game_questions where game_id = p_game and q_index = p_idx;
  if lim is null then raise exception 'question_missing'; end if;
  update games set
    status = 'question', current_q = p_idx,
    phase_started_at = now(), phase_ends_at = now() + make_interval(secs => lim),
    last_reveal = null
  where id = p_game;
end $$;

create or replace function public._reveal(p_game uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare g games; q game_questions; cnts jsonb; n_ans int;
begin
  select * into g from games where id = p_game;
  select * into q from game_questions where game_id = p_game and q_index = g.current_q;

  -- Puanlar: seri bonusu bu sorudan önceki seriye göre
  update game_answers a
     set points = _points(a.is_correct, a.elapsed_ms, q.time_limit, p.streak)
    from game_players p
   where a.game_id = p_game and a.q_index = g.current_q
     and p.game_id = p_game and p.user_id = a.user_id;

  update game_players p
     set score = p.score + a.points,
         correct = p.correct + a.is_correct::int,
         streak = case when a.is_correct then p.streak + 1 else 0 end
    from game_answers a
   where p.game_id = p_game and a.game_id = p_game and a.q_index = g.current_q and a.user_id = p.user_id;

  update game_players p set streak = 0
   where p.game_id = p_game and p.streak <> 0
     and not exists (select 1 from game_answers a
                     where a.game_id = p_game and a.q_index = g.current_q and a.user_id = p.user_id);

  select coalesce(jsonb_agg(coalesce(c.n, 0) order by i), '[]'::jsonb), coalesce(sum(c.n), 0)
    into cnts, n_ans
    from generate_series(0, jsonb_array_length(q.options) - 1) i
    left join (select choice, count(*)::int n from game_answers
               where game_id = p_game and q_index = g.current_q group by choice) c on c.choice = i;

  update games set
    status = 'reveal',
    last_reveal = jsonb_build_object('q_index', g.current_q, 'correct', q.correct, 'counts', cnts,
                                     'answered', n_ans, 'explanation', q.explanation),
    leaderboard = _game_top(p_game, 10),
    phase_started_at = now(),
    phase_ends_at = case when g.mode = 'scheduled' then now() + make_interval(secs => g.reveal_secs) end
  where id = p_game;
end $$;

create or replace function public._board(p_game uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update games set
    status = 'leaderboard', phase_started_at = now(),
    leaderboard = _game_top(p_game, 10),
    phase_ends_at = case when mode = 'scheduled' then now() + make_interval(secs => board_secs) end
  where id = p_game;
end $$;

create or replace function public._end_game(p_game uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare g games;
begin
  select * into g from games where id = p_game;
  if g.status in ('ended', 'cancelled') then return; end if;

  update games set
    status = 'ended', ended_at = now(), phase_started_at = now(), phase_ends_at = null,
    leaderboard = _game_top(p_game, 50)
  where id = p_game;

  -- En az bir soruya cevap veren herkesin skoru liderlik tablosuna yazılır
  insert into score_events (user_id, source, ref_id, quiz_id, score, correct, total)
  select p.user_id, 'live', p_game, g.quiz_id, p.score, p.correct, g.question_count
    from game_players p
   where p.game_id = p_game and not p.kicked
     and exists (select 1 from game_answers a where a.game_id = p_game and a.user_id = p.user_id)
  on conflict do nothing;

  -- Ödüller: ilk N (puanı > 0; eşitlikte önce katılan)
  if g.prize_places > 0 then
    insert into prize_claims (game_id, user_id, place, status, address)
    select p_game, t.user_id, t.rn,
           case when up.zcash_address is not null then 'pending' else 'awaiting_address' end,
           up.zcash_address
      from (select user_id, row_number() over (order by score desc, joined_at) rn
              from game_players where game_id = p_game and not kicked and score > 0) t
      left join user_private up on up.user_id = t.user_id
     where t.rn <= g.prize_places
    on conflict do nothing;
  end if;
end $$;

-- Zamana bağlı geçişler. Çağıran satırı kilitlemiş olmalı.
create or replace function public._tick(g public.games)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare n_ans int; n_pl int;
begin
  if g.status = 'lobby' then
    if g.mode = 'scheduled' and g.starts_at <= now() then
      perform _start_question(g.id, 0); return true;
    end if;
  elsif g.status = 'question' then
    if now() >= g.phase_ends_at then
      perform _reveal(g.id); return true;
    end if;
    if g.mode = 'hosted' then
      select count(*) into n_pl from game_players where game_id = g.id and not kicked;
      select count(*) into n_ans from game_answers a
        join game_players p on p.game_id = a.game_id and p.user_id = a.user_id and not p.kicked
       where a.game_id = g.id and a.q_index = g.current_q;
      if n_pl > 0 and n_ans >= n_pl then perform _reveal(g.id); return true; end if;
    end if;
  elsif g.mode = 'scheduled' and g.phase_ends_at is not null and now() >= g.phase_ends_at then
    if g.status = 'reveal' then
      if g.current_q + 1 >= g.question_count then perform _end_game(g.id); else perform _board(g.id); end if;
      return true;
    elsif g.status = 'leaderboard' then
      perform _start_question(g.id, g.current_q + 1); return true;
    end if;
  end if;
  return false;
end $$;

create or replace function public._new_code()
returns text language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare c text; tries int := 0;
begin
  loop
    c := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    exit when not exists (select 1 from games where code = c and status not in ('ended', 'cancelled'));
    tries := tries + 1;
    if tries > 50 then raise exception 'code_space_exhausted'; end if;
  end loop;
  return c;
end $$;

create or replace function public._snapshot_questions(p_game uuid, p_quiz uuid)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare n int; dt int;
begin
  -- 10 saniye kuralı: tüm sorular sabit süre
  insert into game_questions (game_id, q_index, text, options, correct, time_limit, explanation)
  select p_game, row_number() over (order by position) - 1, text, options, correct,
         _answer_secs(), explanation
    from questions where quiz_id = p_quiz;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Oyun oluşturma
-- ---------------------------------------------------------------------
create or replace function public.create_hosted_game(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; qz quizzes; gid uuid; c text; n int;
begin
  me := _require_user();
  if not is_creator() then raise exception 'creator_required'; end if;
  select * into qz from quizzes where id = p_quiz_id;
  if not found then raise exception 'not_found'; end if;
  if qz.status <> 'published' and qz.author_id <> me.id and not is_admin() then raise exception 'forbidden'; end if;
  if qz.question_count = 0 then raise exception 'questions_required'; end if;

  c := _new_code();
  insert into games (code, quiz_id, host_id, mode, visibility, question_count, title)
  values (c, qz.id, me.id, 'hosted', 'unlisted', qz.question_count, qz.title)
  returning id into gid;
  n := _snapshot_questions(gid, qz.id);
  update games set question_count = n where id = gid;
  return jsonb_build_object('id', gid, 'code', c);
end $$;

-- p: { quiz_id, title?, starts_at, reveal_secs?, board_secs?, prize?, prize_places?, visibility? }
create or replace function public.create_event(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; qz quizzes; gid uuid; c text; n int; st timestamptz;
begin
  me := _require_user();
  if not is_admin() then raise exception 'admin_required'; end if;
  select * into qz from quizzes where id = (p ->> 'quiz_id')::uuid;
  if not found or qz.question_count = 0 then raise exception 'quiz_invalid'; end if;
  st := (p ->> 'starts_at')::timestamptz;
  if st is null or st < now() - interval '1 minute' then raise exception 'invalid_start'; end if;

  c := _new_code();
  insert into games (code, quiz_id, host_id, mode, visibility, title, question_count,
                     starts_at, phase_ends_at, reveal_secs, board_secs, prize, prize_places)
  values (c, qz.id, me.id, 'scheduled', coalesce(p ->> 'visibility', 'public'),
          coalesce(p -> 'title', qz.title), qz.question_count, st, st,
          least(60, greatest(3, coalesce((p ->> 'reveal_secs')::int, 6))),
          least(60, greatest(3, coalesce((p ->> 'board_secs')::int, 6))),
          nullif(p -> 'prize', 'null'::jsonb),
          least(10, greatest(0, coalesce((p ->> 'prize_places')::int, 0))))
  returning id into gid;
  n := _snapshot_questions(gid, qz.id);
  update games set question_count = n where id = gid;
  return jsonb_build_object('id', gid, 'code', c);
end $$;

create or replace function public.update_event(p_id uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare g games; st timestamptz;
begin
  perform _require_user();
  if not is_admin() then raise exception 'admin_required'; end if;
  select * into g from games where id = p_id for update;
  if not found or g.mode <> 'scheduled' then raise exception 'not_found'; end if;
  if g.status <> 'lobby' then raise exception 'already_started'; end if;
  st := coalesce((p ->> 'starts_at')::timestamptz, g.starts_at);
  update games set
    title = coalesce(p -> 'title', title),
    starts_at = st, phase_ends_at = st,
    reveal_secs = coalesce((p ->> 'reveal_secs')::int, reveal_secs),
    board_secs = coalesce((p ->> 'board_secs')::int, board_secs),
    prize = case when p ? 'prize' then nullif(p -> 'prize', 'null'::jsonb) else prize end,
    prize_places = coalesce((p ->> 'prize_places')::int, prize_places),
    visibility = coalesce(p ->> 'visibility', visibility)
  where id = p_id;
  return _game_state((select x from games x where x.id = p_id));
end $$;

create or replace function public.cancel_game(p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare g games;
begin
  perform _require_user();
  select * into g from games where id = p_id for update;
  if not found then return; end if;
  if g.host_id is distinct from auth.uid() and not is_admin() then raise exception 'forbidden'; end if;
  if g.status in ('ended', 'cancelled') then return; end if;
  update games set status = 'cancelled', ended_at = now(), phase_ends_at = null where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- Katılım ve durum
-- ---------------------------------------------------------------------
-- Kodla oyun bulma (katılmadan önce başlık/ödül göstermek için)
create or replace function public.find_game(p_code text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select _game_state(g) from games g
   where g.code = p_code
     and (g.status not in ('ended', 'cancelled') or g.ended_at > now() - interval '6 hours')
   order by (g.status in ('ended', 'cancelled')), g.created_at desc
   limit 1
$$;

create or replace function public.join_game(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; g games; pl game_players;
begin
  me := _require_user();
  select * into g from games
   where code = p_code and status not in ('ended', 'cancelled')
   order by created_at desc limit 1;
  if not found then raise exception 'game_not_found'; end if;
  if g.host_id = me.id and g.mode = 'hosted' then
    return jsonb_build_object('game_id', g.id, 'is_host', true);
  end if;
  select * into pl from game_players where game_id = g.id and user_id = me.id;
  if found and pl.kicked then raise exception 'kicked'; end if;
  insert into game_players (game_id, user_id, name, country, team)
  values (g.id, me.id, coalesce(me.display_name, me.username), me.country, me.team)
  on conflict (game_id, user_id) do nothing;
  return jsonb_build_object('game_id', g.id, 'is_host', false);
end $$;

create or replace function public.get_game_state(p_game_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare g games;
begin
  select * into g from games where id = p_game_id;
  if not found then return null; end if;
  return _game_state(g) || jsonb_build_object(
    'server_now', _now_ms(clock_timestamp()),
    'player_count', (select count(*) from game_players where game_id = g.id and not kicked),
    'answer_count', case when g.status = 'question'
                         then (select count(*) from game_answers where game_id = g.id and q_index = g.current_q)
                         else 0 end
  );
end $$;

create or replace function public.server_time()
returns bigint language sql volatile security definer set search_path = public, pg_temp as $$
  select public._now_ms(clock_timestamp())
$$;

-- Oyuncunun kendi durumu (yenilemeden sonra kaldığı yerden devam için)
create or replace function public.my_game_status(p_game_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); g games; pl game_players; a game_answers; rnk int;
begin
  if me is null then return jsonb_build_object('joined', false); end if;
  select * into g from games where id = p_game_id;
  if not found then return null; end if;
  select * into pl from game_players where game_id = g.id and user_id = me;
  if not found then
    return jsonb_build_object('joined', false, 'is_host', g.host_id = me);
  end if;
  select count(*) + 1 into rnk from game_players where game_id = g.id and not kicked and score > pl.score;
  if g.current_q >= 0 then
    select * into a from game_answers where game_id = g.id and user_id = me and q_index = g.current_q;
  end if;
  return jsonb_build_object(
    'joined', true, 'kicked', pl.kicked, 'is_host', g.host_id = me,
    'name', pl.name, 'score', pl.score, 'correct', pl.correct, 'streak', pl.streak, 'rank', rnk,
    'players', (select count(*) from game_players where game_id = g.id and not kicked),
    'answered_q', a.q_index, 'choice', a.choice,
    'result', case
      when g.status in ('reveal', 'leaderboard', 'ended') and a.q_index is not null
        then jsonb_build_object('q_index', a.q_index, 'is_correct', a.is_correct, 'points', a.points)
      when g.status in ('reveal', 'leaderboard') and g.current_q >= 0
        then jsonb_build_object('q_index', g.current_q, 'is_correct', false, 'points', 0, 'missed', true)
      end,
    'prize', (select jsonb_build_object('id', c.id, 'place', c.place, 'status', c.status)
              from prize_claims c where c.game_id = g.id and c.user_id = me)
  );
end $$;

create or replace function public.submit_answer(p_game_id uuid, p_q int, p_choice int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; g games; q game_questions; el int; n_ans int; n_pl int; inserted boolean;
begin
  me := _require_user();
  -- KEY SHARE: cevap kaydı sürerken faz geçişi (FOR UPDATE) bekler → cevap kaybolmaz
  select * into g from games where id = p_game_id for key share;
  if not found then raise exception 'game_not_found'; end if;
  if g.status <> 'question' or g.current_q <> p_q then
    return jsonb_build_object('accepted', false, 'reason', 'closed');
  end if;
  if now() > g.phase_ends_at + make_interval(secs => _late_accept_ms() / 1000.0) then
    return jsonb_build_object('accepted', false, 'reason', 'late');
  end if;
  if not exists (select 1 from game_players where game_id = g.id and user_id = me.id and not kicked) then
    raise exception 'not_joined';
  end if;
  select * into q from game_questions where game_id = g.id and q_index = p_q;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(q.options) then
    raise exception 'invalid_choice';
  end if;

  el := greatest(0, (_now_ms(now()) - _now_ms(g.phase_started_at))::int - _latency_grace_ms());
  insert into game_answers (game_id, user_id, q_index, choice, elapsed_ms, is_correct)
  values (g.id, me.id, p_q, p_choice, el, p_choice = q.correct)
  on conflict do nothing;
  inserted := found;
  if not inserted then return jsonb_build_object('accepted', false, 'reason', 'already'); end if;

  if g.mode = 'hosted' then
    select count(*) into n_pl from game_players where game_id = g.id and not kicked;
    select count(*) into n_ans from game_answers where game_id = g.id and q_index = p_q;
    return jsonb_build_object('accepted', true, 'all_answered', n_ans >= n_pl);
  end if;
  return jsonb_build_object('accepted', true, 'all_answered', false);
end $$;

-- Herkes çağırabilir; sadece zamanı gelmiş geçişi yapar
create or replace function public.tick_game(p_game_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare g games;
begin
  select * into g from games where id = p_game_id for update skip locked;
  if found then perform _tick(g); end if;
  return get_game_state(p_game_id);
end $$;

-- pg_cron için: zamanı gelmiş tüm oyunları ilerletir ve terk edilmiş odaları kapatır
create or replace function public.tick_due_games()
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare g games; n int := 0;
begin
  for g in
    select * from games
     where status not in ('ended', 'cancelled')
       and phase_ends_at is not null and phase_ends_at <= now()
     for update skip locked
  loop
    if _tick(g) then n := n + 1; end if;
  end loop;

  update games set status = 'cancelled', ended_at = now(), phase_ends_at = null
   where mode = 'hosted' and status = 'lobby' and created_at < now() - interval '12 hours';
  for g in
    select * from games where mode = 'hosted' and status in ('question', 'reveal', 'leaderboard')
       and phase_started_at < now() - interval '6 hours' for update skip locked
  loop
    perform _end_game(g.id);
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Host kontrolleri
-- ---------------------------------------------------------------------
create or replace function public._require_host(p_game uuid)
returns public.games language plpgsql security definer set search_path = public, pg_temp as $$
declare g games;
begin
  perform _require_user();
  select * into g from games where id = p_game for update;
  if not found then raise exception 'game_not_found'; end if;
  if g.host_id is distinct from auth.uid() and not is_admin() then raise exception 'forbidden'; end if;
  return g;
end $$;

create or replace function public.advance_game(p_game_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare g games;
begin
  g := _require_host(p_game_id);
  if g.status = 'lobby' then
    if not exists (select 1 from game_players where game_id = g.id and not kicked) then
      raise exception 'no_players';
    end if;
    perform _start_question(g.id, 0);
  elsif g.status = 'question' then
    perform _reveal(g.id);
  elsif g.status = 'reveal' then
    if g.current_q + 1 >= g.question_count then perform _end_game(g.id); else perform _board(g.id); end if;
  elsif g.status = 'leaderboard' then
    perform _start_question(g.id, g.current_q + 1);
  end if;
  return get_game_state(p_game_id);
end $$;

create or replace function public.end_game_now(p_game_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare g games;
begin
  g := _require_host(p_game_id);
  if g.status = 'question' then perform _reveal(g.id); end if;
  perform _end_game(g.id);
  return get_game_state(p_game_id);
end $$;

create or replace function public.kick_player(p_game_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_host(p_game_id);
  update game_players set kicked = true where game_id = p_game_id and user_id = p_user_id;
end $$;

create or replace function public.host_view(p_game_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare g games;
begin
  perform _require_user();
  select * into g from games where id = p_game_id;
  if not found then raise exception 'game_not_found'; end if;
  if g.host_id is distinct from auth.uid() and not is_admin() then raise exception 'forbidden'; end if;
  return get_game_state(p_game_id) || jsonb_build_object(
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'name', p.name, 'country', p.country,
                                          'team', p.team, 'score', p.score) order by p.joined_at)
        from (select * from game_players where game_id = g.id and not kicked order by joined_at limit 500) p
    ), '[]'::jsonb),
    'join_link_code', g.code
  );
end $$;

-- ---------------------------------------------------------------------
-- Yarışma listeleri ve sonuçlar
-- ---------------------------------------------------------------------
create or replace function public.list_events()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'live', coalesce((select jsonb_agg(_game_state(g) || jsonb_build_object(
                'player_count', (select count(*) from game_players p where p.game_id = g.id and not p.kicked))
              order by g.starts_at)
              from games g where g.mode = 'scheduled' and g.visibility = 'public'
               and g.status in ('question', 'reveal', 'leaderboard')), '[]'::jsonb),
    'upcoming', coalesce((select jsonb_agg(_game_state(g) || jsonb_build_object(
                'player_count', (select count(*) from game_players p where p.game_id = g.id and not p.kicked))
              order by g.starts_at)
              from games g where g.mode = 'scheduled' and g.visibility = 'public' and g.status = 'lobby'), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(x.s order by x.ended_at desc) from (
                select _game_state(g) as s, g.ended_at from games g
                 where g.mode = 'scheduled' and g.visibility = 'public' and g.status = 'ended'
                 order by g.ended_at desc limit 6) x), '[]'::jsonb),
    'server_now', _now_ms(clock_timestamp())
  )
$$;

create or replace function public.get_game_results(p_game_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare g games;
begin
  select * into g from games where id = p_game_id;
  if not found or g.status <> 'ended' then return null; end if;
  return _game_state(g) || jsonb_build_object(
    'player_count', (select count(*) from game_players where game_id = g.id and not kicked),
    'me', my_game_status(p_game_id));
end $$;
