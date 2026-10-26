-- =====================================================================
-- ZecQuest — 0002: Profil ve quiz RPC'leri
-- =====================================================================

-- ---------------------------------------------------------------------
-- Profil
-- ---------------------------------------------------------------------
create or replace function public.get_my_profile()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p profiles; addr text;
begin
  if auth.uid() is null then return null; end if;
  select * into p from profiles where id = auth.uid();
  if not found then return null; end if;
  select zcash_address into addr from user_private where user_id = p.id;
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name,
    'country', p.country, 'team', p.team, 'role', p.role, 'banned', p.banned,
    'creator_request_at', p.creator_request_at, 'zcash_address', addr,
    'created_at', p.created_at
  );
end $$;

create or replace function public.update_my_profile(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uname text; addr text;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  uname := lower(nullif(trim(p ->> 'username'), ''));
  if uname is not null and uname !~ '^[a-z0-9_]{3,20}$' then raise exception 'invalid_username'; end if;
  if uname is not null and exists (select 1 from profiles where username = uname and id <> auth.uid()) then
    raise exception 'username_taken';
  end if;
  if p ? 'country' and nullif(p ->> 'country', '') is not null and upper(p ->> 'country') !~ '^[A-Z]{2}$' then
    raise exception 'invalid_country';
  end if;

  update profiles set
    username     = coalesce(uname, username),
    display_name = coalesce(nullif(left(trim(p ->> 'display_name'), 32), ''), display_name),
    country      = case when p ? 'country' then upper(nullif(p ->> 'country', '')) else country end,
    team         = case when p ? 'team' then nullif(left(trim(p ->> 'team'), 64), '') else team end
  where id = auth.uid();

  if p ? 'zcash_address' then
    addr := nullif(trim(p ->> 'zcash_address'), '');
    if addr is not null and not is_valid_zcash_address(addr) then raise exception 'invalid_zcash_address'; end if;
    insert into user_private (user_id, zcash_address, updated_at) values (auth.uid(), addr, now())
    on conflict (user_id) do update set zcash_address = excluded.zcash_address, updated_at = now();
    -- Adres bekleyen ödüllere otomatik uygula
    if addr is not null then
      update prize_claims set address = addr, status = 'pending'
      where user_id = auth.uid() and status = 'awaiting_address';
    end if;
  end if;

  return get_my_profile();
end $$;

create or replace function public.is_username_available(p_username text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select lower(p_username) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from profiles where username = lower(p_username) and id is distinct from auth.uid())
$$;

create or replace function public.request_creator(p_note text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles;
begin
  me := _require_user();
  if me.role <> 'player' then return get_my_profile(); end if;
  update profiles set creator_request_at = now(), creator_request_note = left(p_note, 500) where id = me.id;
  return get_my_profile();
end $$;

-- ---------------------------------------------------------------------
-- Toplam puan tanımı (liderlik ve profil aynı formülü kullanır):
--   canlı oyun skorlarının toplamı + her quiz için en iyi solo skor
--   (aynı solo quizi tekrar tekrar oynayarak puan kasılamaz)
-- ---------------------------------------------------------------------
create or replace function public._user_totals(p_since timestamptz, p_quiz uuid)
returns table (user_id uuid, score bigint, games bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with ev as (
    select * from score_events
    where (p_since is null or created_at >= p_since)
      and (p_quiz is null or quiz_id = p_quiz)
  ),
  solo_best as (
    select distinct on (e.user_id, e.quiz_id) e.user_id, e.score
    from ev e where e.source = 'solo'
    order by e.user_id, e.quiz_id, e.score desc
  ),
  allrows as (
    select e.user_id, e.score from ev e where e.source = 'live'
    union all
    select s.user_id, s.score from solo_best s
  )
  select a.user_id, sum(a.score)::bigint, count(*)::bigint from allrows a group by a.user_id
$$;

create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p profiles; tot record; rnk bigint;
begin
  select * into p from profiles where username = lower(p_username) and not banned;
  if not found then return null; end if;
  select * into tot from _user_totals(null, null) t where t.user_id = p.id;
  select count(*) + 1 into rnk from _user_totals(null, null) t where t.score > coalesce(tot.score, 0);
  return jsonb_build_object(
    'username', p.username, 'display_name', p.display_name, 'country', p.country, 'team', p.team,
    'role', p.role, 'created_at', p.created_at,
    'total_score', coalesce(tot.score, 0), 'games', coalesce(tot.games, 0),
    'rank', case when tot.score is null then null else rnk end,
    'wins', (select count(*) from games g
             where g.status = 'ended' and (g.leaderboard -> 0 ->> 'user_id')::uuid = p.id),
    'recent', coalesce((
      select jsonb_agg(r order by r.created_at desc) from (
        select e.source, e.score, e.correct, e.total, e.created_at,
               q.title as quiz_title, q.slug as quiz_slug
        from score_events e left join quizzes q on q.id = e.quiz_id
        where e.user_id = p.id order by e.created_at desc limit 10
      ) r), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------
-- Quiz: herkese açık listeleme ve detay
-- ---------------------------------------------------------------------
create or replace function public._quiz_card(q quizzes)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', q.id, 'slug', q.slug, 'title', q.title, 'description', q.description,
    'icon', q.icon, 'tags', to_jsonb(q.tags), 'featured', q.featured,
    'status', q.status, 'question_count', q.question_count, 'default_time', _answer_secs(),
    'plays', (select count(*) from score_events e where e.quiz_id = q.id),
    'author', (select jsonb_build_object('username', a.username, 'display_name', a.display_name)
               from profiles a where a.id = q.author_id),
    'updated_at', q.updated_at
  )
$$;

create or replace function public.list_quizzes(
  p_search text default null, p_tag text default null, p_sort text default 'featured',
  p_limit int default 48, p_offset int default 0)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(_quiz_card(q) order by
      case when p_sort = 'featured' then (not q.featured)::int end,
      case when p_sort = 'new' or p_sort = 'featured' then q.published_at end desc nulls last,
      case when p_sort = 'az' then q.title ->> 'tr' end,
      case when p_sort = 'questions' then q.question_count end desc
    ), '[]'::jsonb)
  from (
    select * from quizzes q
    where q.status = 'published'
      and (p_tag is null or p_tag = any (q.tags))
      and (p_search is null or p_search = '' or
           (q.title::text || ' ' || coalesce(q.description::text, '') || ' ' || array_to_string(q.tags, ' '))
             ilike '%' || p_search || '%')
    order by q.featured desc, q.published_at desc nulls last
    limit least(p_limit, 100) offset greatest(p_offset, 0)
  ) q
$$;

create or replace function public.list_tags()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(t order by n desc, t), '[]'::jsonb) from (
    select unnest(tags) t, count(*) n from quizzes where status = 'published' group by 1
  ) x
$$;

create or replace function public.get_quiz(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q quizzes; avg_t numeric;
begin
  select * into q from quizzes where slug = p_slug;
  if not found then return null; end if;
  if q.status <> 'published' and q.author_id is distinct from auth.uid() and not is_admin() then return null; end if;
  avg_t := _answer_secs();
  return _quiz_card(q) || jsonb_build_object(
    'avg_time', avg_t,
    'can_host', is_creator() and (q.status = 'published' or q.author_id = auth.uid() or is_admin()),
    'top', coalesce((
      select jsonb_agg(x order by x.score desc) from (
        select * from (
          select distinct on (e.user_id) e.user_id, e.score, p.username, p.display_name, p.country
          from score_events e join profiles p on p.id = e.user_id
          where e.quiz_id = q.id and not p.banned
          order by e.user_id, e.score desc
        ) d order by d.score desc limit 10
      ) x
    ), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------
-- Stüdyo: quiz oluşturma / düzenleme (üretici ve yöneticiler)
-- ---------------------------------------------------------------------
create or replace function public.list_my_quizzes()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_user();
  return coalesce((
    select jsonb_agg(_quiz_card(q) || jsonb_build_object('review_note', q.review_note) order by q.updated_at desc)
    from quizzes q where q.author_id = auth.uid()
  ), '[]'::jsonb);
end $$;

create or replace function public.get_quiz_for_edit(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q quizzes;
begin
  perform _require_user();
  select * into q from quizzes where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if q.author_id is distinct from auth.uid() and not is_admin() then raise exception 'forbidden'; end if;
  return to_jsonb(q) || jsonb_build_object('questions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'text', x.text, 'options', x.options, 'correct', x.correct,
      'time_limit', x.time_limit, 'explanation', x.explanation) order by x.position)
    from questions x where x.quiz_id = q.id), '[]'::jsonb));
end $$;

-- p: { id?, slug, title, description, icon, tags, default_time, questions: [...] }
create or replace function public.save_quiz(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me profiles; q quizzes; qid uuid; qs jsonb; item jsonb; i int := 0; n_opts int; c int;
  v_slug text; v_title jsonb;
begin
  me := _require_user();
  if not is_creator() then raise exception 'creator_required'; end if;

  v_slug := lower(trim(p ->> 'slug'));
  v_title := p -> 'title';
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) not between 3 and 60 then
    raise exception 'invalid_slug';
  end if;
  if v_title is null or coalesce(nullif(v_title ->> 'tr', ''), nullif(v_title ->> 'en', ''), nullif(v_title #>> '{}', '')) is null then
    raise exception 'title_required';
  end if;
  qs := coalesce(p -> 'questions', '[]'::jsonb);
  if jsonb_typeof(qs) <> 'array' or jsonb_array_length(qs) = 0 then raise exception 'questions_required'; end if;
  if jsonb_array_length(qs) > 100 then raise exception 'too_many_questions'; end if;

  if p ? 'id' and nullif(p ->> 'id', '') is not null then
    select * into q from quizzes where id = (p ->> 'id')::uuid for update;
    if not found then raise exception 'not_found'; end if;
    if q.author_id is distinct from me.id and not is_admin() then raise exception 'forbidden'; end if;
    if exists (select 1 from quizzes where slug = v_slug and id <> q.id) then raise exception 'slug_taken'; end if;
    update quizzes set
      slug = v_slug, title = v_title, description = p -> 'description',
      icon = coalesce(nullif(p ->> 'icon', ''), 'shield'),
      tags = coalesce(array(select left(jsonb_array_elements_text(coalesce(p -> 'tags', '[]'::jsonb)), 24) limit 6), '{}'),
      default_time = least(120, greatest(5, coalesce((p ->> 'default_time')::int, 20))),
      -- Üretici yayındaki quizini düzenlerse yeniden incelemeye düşer; yönetici düzenlemesi durumu korur
      status = case when is_admin() then status else 'draft' end,
      updated_at = now()
    where id = q.id;
    qid := q.id;
  else
    if exists (select 1 from quizzes where slug = v_slug) then raise exception 'slug_taken'; end if;
    insert into quizzes (slug, title, description, icon, tags, default_time, author_id, status)
    values (
      v_slug, v_title, p -> 'description', coalesce(nullif(p ->> 'icon', ''), 'shield'),
      coalesce(array(select left(jsonb_array_elements_text(coalesce(p -> 'tags', '[]'::jsonb)), 24) limit 6), '{}'),
      least(120, greatest(5, coalesce((p ->> 'default_time')::int, 20))),
      me.id, 'draft')
    returning id into qid;
  end if;

  delete from questions where quiz_id = qid;
  for item in select * from jsonb_array_elements(qs) loop
    n_opts := jsonb_array_length(coalesce(item -> 'options', '[]'::jsonb));
    c := (item ->> 'correct')::int;
    if n_opts < 2 or n_opts > 4 then raise exception 'question_% invalid_options', i + 1; end if;
    if c is null or c < 0 or c >= n_opts then raise exception 'question_% invalid_correct', i + 1; end if;
    if item -> 'text' is null then raise exception 'question_% text_required', i + 1; end if;
    insert into questions (quiz_id, position, text, options, correct, time_limit, explanation)
    values (qid, i, item -> 'text', item -> 'options', c,
            case when nullif(item ->> 'time_limit', '') is null then null
                 else least(120, greatest(5, (item ->> 'time_limit')::int)) end,
            nullif(item -> 'explanation', 'null'::jsonb));
    i := i + 1;
  end loop;
  update quizzes set question_count = i where id = qid;

  return jsonb_build_object('id', qid, 'slug', v_slug);
end $$;

create or replace function public.submit_quiz(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare q quizzes;
begin
  perform _require_user();
  select * into q from quizzes where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if q.author_id is distinct from auth.uid() and not is_admin() then raise exception 'forbidden'; end if;
  if q.question_count = 0 then raise exception 'questions_required'; end if;
  if is_admin() then
    update quizzes set status = 'published', published_at = coalesce(published_at, now()), review_note = null where id = p_id;
  else
    update quizzes set status = 'pending', submitted_at = now(), review_note = null where id = p_id;
  end if;
  return jsonb_build_object('status', (select status from quizzes where id = p_id));
end $$;

create or replace function public.delete_quiz(p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare q quizzes;
begin
  perform _require_user();
  select * into q from quizzes where id = p_id;
  if not found then return; end if;
  if not is_admin() and (q.author_id is distinct from auth.uid() or q.status = 'published') then
    raise exception 'forbidden';
  end if;
  delete from quizzes where id = p_id;
end $$;
