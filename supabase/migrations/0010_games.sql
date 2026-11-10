-- =====================================================================
-- 0010 — Oyna / Play: Zeki platformer scores + Arena 1v1 knowledge duels
--
-- Zeki
--   * game_scores: best result per (user, game, level); game_runs: every accepted run
--     (weekly boards are computed from runs).
--   * submit_game_score sanity-checks every run against per-level bounds
--     (_game_level_limits: minimum plausible time, maximum possible score/coins).
--   * XP: first finish -> game_level, all coins -> game_stars (0008 award_xp, once per ref).
--
-- Arena
--   * Matchmaking queue: arena_find pairs two waiting players with the same question
--     language; after ~8 s without an opponent the server starts a match against a
--     clearly labelled practice bot whose accuracy/speed follow the player's rating.
--   * 5 questions from published quizzes, 10-second rule, speed bonus, all scoring on
--     the server. Correct answers are never sent before a question is revealed.
--   * Elo rating (K=32 vs people, K=16 vs the practice bot), leagues
--     Bronze < 1100 <= Silver < 1300 <= Gold < 1500 <= Shielded.
--   * Realtime: every match update broadcasts {version} on "arena:<id>"; clients then
--     refetch their own view with arena_state (polling fallback). The broadcast carries
--     no game data, so nothing can leak through it.
--   * Guests (profiles.is_guest) can play; they are excluded from public leaderboards.
-- =====================================================================

-- ---------------------------------------------------------------------
-- XP sources: keep every existing case, add arena_win (first 3 wins per day)
-- ---------------------------------------------------------------------
create or replace function public._xp_amount(p_source text) returns int
language sql immutable as $$
  select case p_source
    when 'lesson'      then 20
    when 'lesson_quiz' then 30
    when 'glossary'    then 2
    when 'news_read'   then 5
    when 'game_level'  then 50
    when 'game_stars'  then 25
    when 'event_join'  then 15
    when 'arena_win'   then 10   -- Arena galibiyeti (günde ilk 3; ref: YYYY-MM-DD:n)
    else null
  end
$$;

-- XP for a specific user (used when the server, not the caller, earns XP for someone)
create or replace function public._xp_give(p_user uuid, p_source text, p_ref text)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare v_amt int := public._xp_amount(p_source); n int;
begin
  if v_amt is null or p_user is null then return 0; end if;
  insert into xp_events (user_id, source, ref, amount) values (p_user, p_source, p_ref, v_amt)
  on conflict (user_id, source, ref) do nothing;
  get diagnostics n = row_count;
  if n > 0 then update profiles set xp = xp + v_amt where id = p_user; return v_amt; end if;
  return 0;
end $$;

-- =====================================================================
-- ZEKI — scores
-- =====================================================================
create table if not exists public.game_scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game ~ '^[a-z0-9_]{2,20}$'),
  level int not null check (level between 1 and 99),
  best_score int not null default 0,
  best_time_ms int,
  coins int not null default 0,
  stars int not null default 0,          -- bitmask: 1 finished, 2 all coins, 4 no hits
  runs int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, game, level)
);
create index if not exists game_scores_board_idx on public.game_scores (game, level, best_score desc);

create table if not exists public.game_runs (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  level int not null,
  score int not null,
  time_ms int not null,
  coins int not null,
  no_hit boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists game_runs_board_idx on public.game_runs (game, level, created_at desc);
create index if not exists game_runs_user_idx on public.game_runs (user_id, created_at desc);

alter table public.game_scores enable row level security;
alter table public.game_runs enable row level security;

-- Per-level bounds. Generated from components/games/zeki (sim.ts parseLevel: maxScore,
-- minTimeMs, totals.coins). Update together with the level maps.
create or replace function public._game_level_limits(p_game text, p_level int)
returns jsonb language sql immutable as $$
  select case p_game || ':' || p_level
    when 'zeki:1' then '{"min_ms": 14848, "max_score": 9550, "coins": 39}'::jsonb
    when 'zeki:2' then '{"min_ms": 18433, "max_score": 10700, "coins": 43}'::jsonb
    when 'zeki:3' then '{"min_ms": 6354, "max_score": 9250, "coins": 34}'::jsonb
    else null
  end
$$;

create or replace function public._game_row(s public.game_scores)
returns jsonb language sql stable as $$
  select jsonb_build_object('level', s.level, 'best_score', s.best_score, 'best_time_ms', s.best_time_ms,
                            'coins', s.coins, 'stars', s.stars, 'runs', s.runs)
$$;

-- A finished run. p_no_hit: finished without losing a life.
create or replace function public.submit_game_score(
  p_game text, p_level int, p_score int, p_time_ms int, p_coins int, p_no_hit boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me profiles; lim jsonb; prev game_scores; cur game_scores; bits int; xp int := 0; rnk bigint;
  ref text := p_game || ':' || p_level;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select * into me from profiles where id = auth.uid();
  if not found then raise exception 'profile_incomplete'; end if;
  if me.banned then raise exception 'banned' using errcode = '42501'; end if;
  lim := _game_level_limits(p_game, p_level);
  if lim is null then raise exception 'unknown_level'; end if;
  if p_score is null or p_time_ms is null or p_coins is null
     or p_score < 0 or p_score > (lim ->> 'max_score')::int
     or p_coins < 0 or p_coins > (lim ->> 'coins')::int
     or p_time_ms < (lim ->> 'min_ms')::int or p_time_ms > 3600000 then
    raise exception 'implausible_score';
  end if;
  -- one run per 3 seconds per user is more than any human can finish
  if exists (select 1 from game_runs where user_id = me.id and created_at > now() - interval '3 seconds') then
    raise exception 'too_many_requests';
  end if;

  bits := 1 | case when p_coins >= (lim ->> 'coins')::int then 2 else 0 end | case when p_no_hit then 4 else 0 end;
  insert into game_runs (user_id, game, level, score, time_ms, coins, no_hit)
  values (me.id, p_game, p_level, p_score, p_time_ms, p_coins, coalesce(p_no_hit, false));

  select * into prev from game_scores where user_id = me.id and game = p_game and level = p_level;
  insert into game_scores (user_id, game, level, best_score, best_time_ms, coins, stars, runs)
  values (me.id, p_game, p_level, p_score, p_time_ms, p_coins, bits, 1)
  on conflict (user_id, game, level) do update set
    best_score = greatest(game_scores.best_score, excluded.best_score),
    best_time_ms = least(coalesce(game_scores.best_time_ms, excluded.best_time_ms), excluded.best_time_ms),
    coins = greatest(game_scores.coins, excluded.coins),
    stars = game_scores.stars | excluded.stars,
    runs = game_scores.runs + 1,
    updated_at = now()
  returning * into cur;

  xp := xp + _xp_give(me.id, 'game_level', ref);
  if bits & 2 = 2 then xp := xp + _xp_give(me.id, 'game_stars', ref); end if;

  if not me.is_guest then
    select count(*) + 1 into rnk from game_scores g join profiles p on p.id = g.user_id
     where g.game = p_game and g.level = p_level and not p.is_guest and not p.banned
       and (g.best_score > cur.best_score or (g.best_score = cur.best_score and g.best_time_ms < cur.best_time_ms));
  end if;

  return _game_row(cur) || jsonb_build_object(
    'new_best', prev.user_id is null or p_score > prev.best_score,
    'new_best_time', prev.user_id is null or p_time_ms < coalesce(prev.best_time_ms, 2147483647),
    'rank', rnk, 'xp_awarded', xp);
end $$;

create or replace function public.my_game_progress(p_game text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(_game_row(s) order by s.level), '[]'::jsonb)
    from game_scores s where s.user_id = auth.uid() and s.game = p_game
$$;

-- p_period: 'all' (best ever) | 'week' (best run in the last 7 days)
create or replace function public.game_leaderboard(p_game text, p_level int, p_period text default 'all', p_limit int default 20)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare lim int := least(greatest(coalesce(p_limit, 20), 1), 100); rows jsonb; me_row jsonb;
begin
  with best as (
    select s.user_id, s.best_score as score, s.best_time_ms as time_ms, s.coins
      from game_scores s where s.game = p_game and s.level = p_level and coalesce(p_period, 'all') <> 'week'
    union all
    select * from (
      select distinct on (r.user_id) r.user_id, r.score, r.time_ms, r.coins
        from game_runs r
       where r.game = p_game and r.level = p_level and p_period = 'week' and r.created_at > now() - interval '7 days'
       order by r.user_id, r.score desc, r.time_ms) w
  ), ranked as (
    select b.*, p.username, p.display_name, p.country,
           rank() over (order by b.score desc, b.time_ms) as rank
      from best b join profiles p on p.id = b.user_id
     where not p.is_guest and not p.banned and p.username is not null
  )
  select coalesce((select jsonb_agg(jsonb_build_object('rank', rank, 'username', username, 'display_name', display_name,
                     'country', country, 'score', score, 'time_ms', time_ms, 'coins', coins) order by rank, time_ms)
                     from (select * from ranked order by rank, time_ms limit lim) t), '[]'::jsonb),
         (select jsonb_build_object('rank', rank, 'score', score, 'time_ms', time_ms) from ranked where user_id = auth.uid())
    into rows, me_row;
  return jsonb_build_object('rows', rows, 'me', me_row);
end $$;

-- =====================================================================
-- ARENA
-- =====================================================================
create table if not exists public.arena_ratings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rating int not null default 1000,
  matches int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  streak int not null default 0,
  best_streak int not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists arena_ratings_idx on public.arena_ratings (rating desc);

create table if not exists public.arena_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lang text not null,
  rating int not null,
  joined_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);

create table if not exists public.arena_matches (
  id uuid primary key default gen_random_uuid(),
  lang text not null,
  p1 uuid not null references public.profiles (id) on delete cascade,
  p2 uuid references public.profiles (id) on delete cascade, -- null: practice bot
  bot jsonb,                                                 -- {name, acc, speed_ms}
  p1_rating int not null,
  p2_rating int not null,
  status text not null default 'intro' check (status in ('intro', 'question', 'reveal', 'ended')),
  current_q int not null default -1,
  q_count int not null default 5,
  phase_started_at timestamptz not null default now(),
  phase_ends_at timestamptz,
  p1_score int not null default 0,
  p2_score int not null default 0,
  p1_correct int not null default 0,
  p2_correct int not null default 0,
  p1_delta int,
  p2_delta int,
  winner smallint,                     -- 1, 2 or 0 (draw)
  version int not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists arena_matches_p1_idx on public.arena_matches (p1, created_at desc);
create index if not exists arena_matches_p2_idx on public.arena_matches (p2, created_at desc);
create index if not exists arena_matches_active_idx on public.arena_matches (status) where status <> 'ended';

create table if not exists public.arena_questions (
  match_id uuid not null references public.arena_matches (id) on delete cascade,
  q_index int not null,
  quiz_id uuid references public.quizzes (id) on delete set null,
  text jsonb not null,
  options jsonb not null,
  correct smallint not null,
  explanation jsonb,
  primary key (match_id, q_index)
);

create table if not exists public.arena_answers (
  match_id uuid not null references public.arena_matches (id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  q_index int not null,
  choice smallint,
  elapsed_ms int not null,
  is_correct boolean not null,
  points int not null default 0,
  created_at timestamptz not null default now(),
  primary key (match_id, slot, q_index)
);

create table if not exists public.arena_results (
  match_id uuid not null references public.arena_matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score int not null,
  outcome smallint not null,          -- 1 win, 0 draw, -1 loss
  delta int not null,
  rating_after int not null,
  vs_bot boolean not null,
  badges text[] not null default '{}',
  xp int not null default 0,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
create index if not exists arena_results_week_idx on public.arena_results (created_at desc);
create index if not exists arena_results_user_idx on public.arena_results (user_id, created_at desc);

alter table public.arena_ratings enable row level security;
alter table public.arena_queue enable row level security;
alter table public.arena_matches enable row level security;
alter table public.arena_questions enable row level security;
alter table public.arena_answers enable row level security;
alter table public.arena_results enable row level security;

-- ---------- constants ----------
create or replace function public._arena_intro_secs() returns int language sql immutable as $$ select 3 $$;
create or replace function public._arena_reveal_secs() returns int language sql immutable as $$ select 3 $$;
create or replace function public._arena_bot_wait_secs() returns int language sql immutable as $$ select 8 $$;
create or replace function public._arena_q_count() returns int language sql immutable as $$ select 5 $$;

create or replace function public._arena_league(p_rating int) returns text language sql immutable as $$
  select case when p_rating >= 1500 then 'shielded' when p_rating >= 1300 then 'gold'
              when p_rating >= 1100 then 'silver' else 'bronze' end
$$;

-- 100 for a correct answer + up to 50 speed bonus
create or replace function public._arena_points(p_correct boolean, p_elapsed int) returns int
language sql immutable as $$
  select case when not p_correct then 0
    else 100 + round(50 * (1 - least(1, greatest(0, p_elapsed::numeric / (_answer_secs() * 1000)))))::int end
$$;

create or replace function public._arena_rating(p_user uuid) returns public.arena_ratings
language plpgsql security definer set search_path = public, pg_temp as $$
declare r arena_ratings;
begin
  insert into arena_ratings (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into r from arena_ratings where user_id = p_user;
  return r;
end $$;

-- Question language: the requested language if it has enough published questions, else English.
create or replace function public._arena_pool_size(p_lang text) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from questions x join quizzes z on z.id = x.quiz_id
   where z.status = 'published'
     and (split_part(z.language, '-', 1) = p_lang or (z.language is null and p_lang in ('tr', 'en')))
$$;

create or replace function public._arena_lang(p_lang text) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare l text := lower(split_part(coalesce(nullif(trim(p_lang), ''), 'en'), '-', 1));
begin
  if l !~ '^[a-z]{2,3}$' then l := 'en'; end if;
  if _arena_pool_size(l) >= _arena_q_count() then return l; end if;
  if _arena_pool_size('en') >= _arena_q_count() then return 'en'; end if;
  raise exception 'not_enough_questions';
end $$;

-- ---------- realtime ----------
create or replace function public._arena_before_update() returns trigger language plpgsql as $$
begin
  new.version := old.version + 1;
  return new;
end $$;

create or replace function public._arena_broadcast() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
    begin
      perform realtime.send(jsonb_build_object('version', new.version, 'status', new.status), 'state', 'arena:' || new.id::text, false);
    exception when others then
      raise warning 'arena broadcast failed: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

drop trigger if exists arena_before_update on public.arena_matches;
create trigger arena_before_update before update on public.arena_matches
  for each row execute function public._arena_before_update();
drop trigger if exists arena_broadcast on public.arena_matches;
create trigger arena_broadcast after insert or update on public.arena_matches
  for each row execute function public._arena_broadcast();

-- ---------- match lifecycle (internal) ----------
create or replace function public._arena_create(p_lang text, p_p1 uuid, p_p2 uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare r1 arena_ratings; r2 arena_ratings; mid uuid; n int; bot jsonb := null; r2v int;
begin
  r1 := _arena_rating(p_p1);
  if p_p2 is not null then
    r2 := _arena_rating(p_p2);
    r2v := r2.rating;
  else
    -- Practice bot tuned to the player's rating: accuracy 30–92 %, typical answer 2.5–8 s
    r2v := r1.rating;
    bot := jsonb_build_object(
      'name', (array['Lumen', 'Pixel', 'Nova', 'Echo', 'Orbit', 'Quill'])[1 + floor(random() * 6)::int],
      'acc', round(least(0.92, greatest(0.30, 0.55 + (r1.rating - 1000) / 1000.0 * 0.6))::numeric, 2),
      'speed_ms', least(8000, greatest(2500, 6500 - (r1.rating - 1000) * 4)));
  end if;
  insert into arena_matches (lang, p1, p2, bot, p1_rating, p2_rating, status, phase_started_at, phase_ends_at, q_count)
  values (p_lang, p_p1, p_p2, bot, r1.rating, r2v, 'intro', now(), now() + make_interval(secs => _arena_intro_secs()), _arena_q_count())
  returning id into mid;

  insert into arena_questions (match_id, q_index, quiz_id, text, options, correct, explanation)
  select mid, (row_number() over () - 1)::int, q.quiz_id, q.text, q.options, q.correct, q.explanation
    from (select x.* from questions x join quizzes z on z.id = x.quiz_id
           where z.status = 'published'
             and (split_part(z.language, '-', 1) = p_lang or (z.language is null and p_lang in ('tr', 'en')))
           order by random() limit _arena_q_count()) q;
  get diagnostics n = row_count;
  if n < _arena_q_count() then raise exception 'not_enough_questions'; end if;
  delete from arena_queue where user_id in (p_p1, p_p2);
  return mid;
end $$;

create or replace function public._arena_start_q(p_match uuid, p_idx int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare m arena_matches; q arena_questions; ok boolean; ch int; el int; n_opt int;
begin
  update arena_matches set status = 'question', current_q = p_idx, phase_started_at = now(),
         phase_ends_at = now() + make_interval(secs => _answer_secs())
   where id = p_match returning * into m;
  if m.p2 is null and m.bot is not null then
    -- The bot decides now; its answer only becomes visible once its "thinking time" passes
    select * into q from arena_questions where match_id = p_match and q_index = p_idx;
    n_opt := jsonb_array_length(q.options);
    if random() < 0.95 then
      ok := random() < (m.bot ->> 'acc')::numeric;
      ch := case when ok then q.correct else (q.correct + 1 + floor(random() * (n_opt - 1))::int) % n_opt end;
      el := least(_answer_secs() * 1000 - 600, greatest(1200, (m.bot ->> 'speed_ms')::int + floor((random() - 0.5) * 3000)::int));
      insert into arena_answers (match_id, slot, q_index, choice, elapsed_ms, is_correct, points)
      values (p_match, 2, p_idx, ch, el, ok, _arena_points(ok, el));
    end if;
  end if;
end $$;

create or replace function public._arena_reveal(p_match uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update arena_matches m set status = 'reveal', phase_started_at = now(),
         phase_ends_at = now() + make_interval(secs => _arena_reveal_secs()),
         p1_score = coalesce((select sum(points) from arena_answers a where a.match_id = m.id and a.slot = 1 and a.q_index <= m.current_q), 0),
         p2_score = coalesce((select sum(points) from arena_answers a where a.match_id = m.id and a.slot = 2 and a.q_index <= m.current_q), 0),
         p1_correct = (select count(*) from arena_answers a where a.match_id = m.id and a.slot = 1 and a.q_index <= m.current_q and a.is_correct),
         p2_correct = (select count(*) from arena_answers a where a.match_id = m.id and a.slot = 2 and a.q_index <= m.current_q and a.is_correct)
   where m.id = p_match;
end $$;

create or replace function public._arena_finish_player(m public.arena_matches, p_slot int, p_delta int, p_outcome int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := case when p_slot = 1 then m.p1 else m.p2 end;
  r arena_ratings; badges text[] := '{}'; xp int := 0; wins_today int; opp_rating int;
  my_correct int := case when p_slot = 1 then m.p1_correct else m.p2_correct end;
  my_score int := case when p_slot = 1 then m.p1_score else m.p2_score end;
  before_league text;
begin
  if uid is null then return; end if;
  opp_rating := case when p_slot = 1 then m.p2_rating else m.p1_rating end;
  select * into r from arena_ratings where user_id = uid for update;
  before_league := _arena_league(r.rating);
  update arena_ratings set
    rating = greatest(0, rating + p_delta),
    matches = matches + 1,
    wins = wins + (p_outcome = 1)::int,
    losses = losses + (p_outcome = -1)::int,
    draws = draws + (p_outcome = 0)::int,
    streak = case when p_outcome = 1 then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when p_outcome = 1 then streak + 1 else 0 end),
    updated_at = now()
  where user_id = uid returning * into r;

  if my_correct = m.q_count then badges := array_append(badges, 'perfect'); end if;
  if my_correct = m.q_count and not exists (
      select 1 from arena_answers a where a.match_id = m.id and a.slot = p_slot and a.elapsed_ms >= 5000) then
    badges := array_append(badges, 'lightning');
  end if;
  if p_outcome = 1 and r.wins = 1 then badges := array_append(badges, 'first_win'); end if;
  if p_outcome = 1 and r.streak >= 3 then badges := array_append(badges, 'on_fire'); end if;
  if p_outcome = 1 and m.p2 is not null and opp_rating - (r.rating - p_delta) >= 100 then badges := array_append(badges, 'giant_slayer'); end if;
  if _arena_league(r.rating) <> before_league and p_delta > 0 then badges := array_append(badges, 'promoted'); end if;

  if p_outcome = 1 then
    select count(*) + 1 into wins_today from arena_results
     where user_id = uid and outcome = 1 and created_at >= date_trunc('day', now());
    if wins_today <= 3 then
      xp := _xp_give(uid, 'arena_win', to_char(now(), 'YYYY-MM-DD') || ':' || wins_today);
    end if;
  end if;

  insert into arena_results (match_id, user_id, score, outcome, delta, rating_after, vs_bot, badges, xp)
  values (m.id, uid, my_score, p_outcome, p_delta, r.rating, m.p2 is null, badges, xp)
  on conflict do nothing;
end $$;

create or replace function public._arena_end(p_match uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare m arena_matches; s1 numeric; e1 numeric; k int; d1 int; d2 int; w int;
begin
  select * into m from arena_matches where id = p_match;
  if m.status = 'ended' then return; end if;
  -- final totals (also covers matches closed early)
  update arena_matches x set
    p1_score = coalesce((select sum(points) from arena_answers a where a.match_id = x.id and a.slot = 1), 0),
    p2_score = coalesce((select sum(points) from arena_answers a where a.match_id = x.id and a.slot = 2), 0),
    p1_correct = (select count(*) from arena_answers a where a.match_id = x.id and a.slot = 1 and a.is_correct),
    p2_correct = (select count(*) from arena_answers a where a.match_id = x.id and a.slot = 2 and a.is_correct)
  where x.id = p_match returning * into m;

  w := case when m.p1_score > m.p2_score then 1 when m.p2_score > m.p1_score then 2 else 0 end;
  s1 := case w when 1 then 1 when 2 then 0 else 0.5 end;
  e1 := 1 / (1 + power(10, (m.p2_rating - m.p1_rating) / 400.0));
  k := case when m.p2 is null then 16 else 32 end;
  d1 := round(k * (s1 - e1));
  d2 := round(k * ((1 - s1) - (1 - e1)));
  update arena_matches set status = 'ended', ended_at = now(), phase_started_at = now(), phase_ends_at = null,
         winner = w, p1_delta = d1, p2_delta = case when p2 is null then null else d2 end
   where id = p_match returning * into m;
  perform _arena_finish_player(m, 1, d1, case w when 1 then 1 when 2 then -1 else 0 end);
  if m.p2 is not null then
    perform _arena_finish_player(m, 2, d2, case w when 2 then 1 when 1 then -1 else 0 end);
  end if;
end $$;

-- Time-based transitions. Caller must hold the row lock. Returns true if something changed.
create or replace function public._arena_tick(p_match uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare m arena_matches; n1 int; n2 int;
begin
  select * into m from arena_matches where id = p_match;
  if m.status = 'ended' then return false; end if;
  -- abandoned: nobody advanced it for 2 minutes
  if m.phase_started_at < now() - interval '2 minutes' then perform _arena_end(m.id); return true; end if;
  if m.status = 'intro' then
    if now() >= m.phase_ends_at then perform _arena_start_q(m.id, 0); return true; end if;
  elsif m.status = 'question' then
    if now() >= m.phase_ends_at then perform _arena_reveal(m.id); return true; end if;
    select count(*) into n1 from arena_answers where match_id = m.id and q_index = m.current_q and slot = 1;
    select count(*) into n2 from arena_answers a where a.match_id = m.id and a.q_index = m.current_q and a.slot = 2
       and (m.p2 is not null or m.phase_started_at + make_interval(secs => a.elapsed_ms / 1000.0) <= now());
    if n1 > 0 and n2 > 0 then perform _arena_reveal(m.id); return true; end if;
  elsif m.status = 'reveal' then
    if now() >= m.phase_ends_at then
      if m.current_q + 1 >= m.q_count then perform _arena_end(m.id); else perform _arena_start_q(m.id, m.current_q + 1); end if;
      return true;
    end if;
  end if;
  return false;
end $$;

-- Player-facing view of a match (no correct answers before reveal)
create or replace function public._arena_view(p_match uuid, p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  m arena_matches; me_slot int; opp_slot int; q arena_questions; my_ans arena_answers; opp_ans arena_answers;
  opp_visible boolean := false; res arena_results; ra arena_ratings; pips jsonb; v jsonb; reveal jsonb := null;
  question jsonb := null; result jsonb := null; me_p profiles; opp_p profiles; opp_id uuid;
begin
  select * into m from arena_matches where id = p_match;
  if not found then return null; end if;
  me_slot := case when m.p1 = p_uid then 1 when m.p2 = p_uid then 2 else 0 end;
  if me_slot = 0 then raise exception 'forbidden'; end if;
  opp_slot := 3 - me_slot;
  opp_id := case when me_slot = 1 then m.p2 else m.p1 end;
  select * into me_p from profiles where id = p_uid;
  if opp_id is not null then select * into opp_p from profiles where id = opp_id; end if;

  if m.current_q >= 0 and m.status in ('question', 'reveal') then
    select * into q from arena_questions where match_id = m.id and q_index = m.current_q;
    select * into my_ans from arena_answers where match_id = m.id and q_index = m.current_q and slot = me_slot;
    select * into opp_ans from arena_answers where match_id = m.id and q_index = m.current_q and slot = opp_slot;
    opp_visible := opp_ans.q_index is not null and (m.status <> 'question' or m.bot is null
                   or m.phase_started_at + make_interval(secs => opp_ans.elapsed_ms / 1000.0) <= now());
    question := jsonb_build_object('index', q.q_index, 'text', q.text, 'options', q.options, 'time_limit', _answer_secs());
    if m.status = 'reveal' then
      reveal := jsonb_build_object('q_index', q.q_index, 'correct', q.correct, 'explanation', q.explanation,
        'my_choice', my_ans.choice, 'my_correct', coalesce(my_ans.is_correct, false), 'my_points', coalesce(my_ans.points, 0),
        'my_ms', my_ans.elapsed_ms,
        'opp_choice', opp_ans.choice, 'opp_correct', coalesce(opp_ans.is_correct, false), 'opp_points', coalesce(opp_ans.points, 0));
    end if;
  end if;

  -- pips: only questions that have been revealed
  select coalesce(jsonb_agg(jsonb_build_object(
           'me', (select a.is_correct from arena_answers a where a.match_id = m.id and a.q_index = i and a.slot = me_slot),
           'opp', (select a.is_correct from arena_answers a where a.match_id = m.id and a.q_index = i and a.slot = opp_slot))
           order by i), '[]'::jsonb)
    into pips
    from generate_series(0, m.q_count - 1) i
   where i < m.current_q or (i = m.current_q and m.status in ('reveal', 'ended'));

  if m.status = 'ended' then
    select * into res from arena_results where match_id = m.id and user_id = p_uid;
    select * into ra from arena_ratings where user_id = p_uid;
    result := jsonb_build_object(
      'outcome', res.outcome, 'delta', res.delta, 'rating', res.rating_after, 'league', _arena_league(res.rating_after),
      'badges', to_jsonb(res.badges), 'xp', res.xp, 'streak', ra.streak, 'best_streak', ra.best_streak,
      'avg_ms', (select round(avg(elapsed_ms))::int from arena_answers where match_id = m.id and slot = me_slot),
      'questions', (select jsonb_agg(jsonb_build_object(
           'index', x.q_index, 'text', x.text, 'options', x.options, 'correct', x.correct, 'explanation', x.explanation,
           'quiz_slug', (select slug from quizzes where id = x.quiz_id),
           'my_choice', (select a.choice from arena_answers a where a.match_id = m.id and a.q_index = x.q_index and a.slot = me_slot),
           'my_correct', coalesce((select a.is_correct from arena_answers a where a.match_id = m.id and a.q_index = x.q_index and a.slot = me_slot), false))
         order by x.q_index) from arena_questions x where x.match_id = m.id));
  end if;

  return jsonb_build_object(
    'id', m.id, 'status', m.status, 'lang', m.lang, 'current_q', m.current_q, 'q_count', m.q_count,
    'phase_started_at', _now_ms(m.phase_started_at), 'phase_ends_at', _now_ms(m.phase_ends_at),
    'server_now', _now_ms(clock_timestamp()), 'version', m.version,
    'me', jsonb_build_object('slot', me_slot, 'name', coalesce(me_p.display_name, me_p.username), 'username', me_p.username,
          'country', me_p.country, 'rating', case when me_slot = 1 then m.p1_rating else m.p2_rating end,
          'score', case when me_slot = 1 then m.p1_score else m.p2_score end,
          'n_correct', case when me_slot = 1 then m.p1_correct else m.p2_correct end),
    'opp', jsonb_build_object('bot', m.p2 is null,
          'name', case when m.p2 is null then m.bot ->> 'name' else coalesce(opp_p.display_name, opp_p.username) end,
          'username', opp_p.username, 'country', opp_p.country,
          'rating', case when me_slot = 1 then m.p2_rating else m.p1_rating end,
          'score', case when me_slot = 1 then m.p2_score else m.p1_score end,
          'n_correct', case when me_slot = 1 then m.p2_correct else m.p1_correct end),
    'pips', pips,
    'question', question,
    'answered', my_ans.q_index is not null, 'my_choice', my_ans.choice,
    'opp_answered', opp_visible,
    'reveal', reveal,
    'result', result,
    'winner', case when m.status = 'ended' then m.winner end);
end $$;

-- ---------- API ----------
-- Join the queue / poll it. Returns {status:'matched', match_id} or {status:'waiting', waited_ms, bot_after_ms, lang}.
create or replace function public.arena_find(p_lang text default 'en')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; m arena_matches; l text; r arena_ratings; q arena_queue; opp arena_queue; mid uuid; waited int;
begin
  me := _require_player();
  -- serialize pairing so two players can never be matched twice
  perform pg_advisory_xact_lock(hashtext('zq_arena_queue'));

  select * into m from arena_matches where (p1 = me.id or p2 = me.id) and status <> 'ended'
   order by created_at desc limit 1 for update;
  if found then
    perform _arena_tick(m.id);
    select * into m from arena_matches where id = m.id;
    if m.status <> 'ended' then
      delete from arena_queue where user_id = me.id;
      return jsonb_build_object('status', 'matched', 'match_id', m.id, 'bot', m.p2 is null);
    end if;
  end if;

  l := _arena_lang(p_lang);
  r := _arena_rating(me.id);
  delete from arena_queue where seen_at < now() - interval '30 seconds';

  select * into opp from arena_queue
   where user_id <> me.id and lang = l and seen_at > now() - interval '6 seconds'
   order by abs(rating - r.rating), joined_at limit 1;
  if found then
    mid := _arena_create(l, opp.user_id, me.id);
    return jsonb_build_object('status', 'matched', 'match_id', mid, 'bot', false);
  end if;

  insert into arena_queue (user_id, lang, rating) values (me.id, l, r.rating)
  on conflict (user_id) do update set
    seen_at = now(), rating = excluded.rating,
    joined_at = case when arena_queue.lang = excluded.lang and arena_queue.seen_at > now() - interval '6 seconds'
                     then arena_queue.joined_at else now() end,
    lang = excluded.lang
  returning * into q;
  waited := (_now_ms(now()) - _now_ms(q.joined_at))::int;
  if waited >= _arena_bot_wait_secs() * 1000 then
    mid := _arena_create(l, me.id, null);
    return jsonb_build_object('status', 'matched', 'match_id', mid, 'bot', true);
  end if;
  return jsonb_build_object('status', 'waiting', 'waited_ms', waited, 'bot_after_ms', _arena_bot_wait_secs() * 1000, 'lang', l);
end $$;

create or replace function public.arena_cancel()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then return; end if;
  delete from arena_queue where user_id = auth.uid();
end $$;

-- Current view; also advances time-based phases (idempotent, safe to call often)
create or replace function public.arena_state(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid(); m arena_matches; i int := 0;
begin
  if me is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select * into m from arena_matches where id = p_match;
  if not found then raise exception 'match_not_found'; end if;
  if m.p1 <> me and m.p2 is distinct from me then raise exception 'forbidden'; end if;
  select * into m from arena_matches where id = p_match for update skip locked;
  if found then
    while i < 3 and _arena_tick(p_match) loop i := i + 1; end loop;
  end if;
  return _arena_view(p_match, me);
end $$;

create or replace function public.arena_answer(p_match uuid, p_q int, p_choice int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; m arena_matches; q arena_questions; slot int; el int; ok boolean;
begin
  me := _require_player();
  select * into m from arena_matches where id = p_match for key share;
  if not found then raise exception 'match_not_found'; end if;
  slot := case when m.p1 = me.id then 1 when m.p2 = me.id then 2 else 0 end;
  if slot = 0 then raise exception 'forbidden'; end if;
  if m.status <> 'question' or m.current_q <> p_q then return jsonb_build_object('accepted', false, 'reason', 'closed'); end if;
  if now() > m.phase_ends_at + make_interval(secs => _late_accept_ms() / 1000.0) then
    return jsonb_build_object('accepted', false, 'reason', 'late');
  end if;
  select * into q from arena_questions where match_id = m.id and q_index = p_q;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(q.options) then raise exception 'invalid_choice'; end if;
  el := least(_answer_secs() * 1000, greatest(0, (_now_ms(now()) - _now_ms(m.phase_started_at))::int - _latency_grace_ms()));
  ok := p_choice = q.correct;
  insert into arena_answers (match_id, slot, q_index, choice, elapsed_ms, is_correct, points)
  values (m.id, slot, p_q, p_choice, el, ok, _arena_points(ok, el))
  on conflict do nothing;
  if not found then return jsonb_build_object('accepted', false, 'reason', 'already'); end if;
  return jsonb_build_object('accepted', true);
end $$;

-- Lobby data for the current player
create or replace function public.my_arena()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; r arena_ratings; wk int; wk_rank bigint; all_rank bigint; act uuid;
begin
  me := _require_player();
  select * into r from arena_ratings where user_id = me.id;
  if not found then r.rating := 1000; r.matches := 0; r.wins := 0; r.losses := 0; r.draws := 0; r.streak := 0; r.best_streak := 0; end if;
  select coalesce(sum(score), 0) into wk from arena_results where user_id = me.id and created_at > now() - interval '7 days';
  if not me.is_guest then
    select count(*) + 1 into all_rank from arena_ratings a join profiles p on p.id = a.user_id
     where a.matches > 0 and not p.is_guest and not p.banned and p.username is not null and a.rating > r.rating;
    if wk > 0 then
      select count(*) + 1 into wk_rank from (
        select x.user_id, sum(x.score) s from arena_results x join profiles p on p.id = x.user_id
         where x.created_at > now() - interval '7 days' and not p.is_guest and not p.banned and p.username is not null
         group by x.user_id) t where t.s > wk;
    end if;
  end if;
  select id into act from arena_matches where (p1 = me.id or p2 = me.id) and status <> 'ended'
     and phase_started_at > now() - interval '2 minutes' order by created_at desc limit 1;
  return jsonb_build_object(
    'rating', r.rating, 'league', _arena_league(r.rating), 'matches', r.matches, 'wins', r.wins, 'losses', r.losses,
    'draws', r.draws, 'streak', r.streak, 'best_streak', r.best_streak,
    'weekly_points', wk, 'weekly_rank', wk_rank, 'rank', case when r.matches > 0 then all_rank end,
    'active_match', act, 'is_guest', me.is_guest);
end $$;

-- People in the Arena right now (queue + matches active in the last 2 minutes)
create or replace function public.arena_online()
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select ((select count(*) from arena_queue where seen_at > now() - interval '10 seconds')
        + (select count(*) + count(p2) from arena_matches where status <> 'ended' and phase_started_at > now() - interval '2 minutes'))::int
$$;

-- p_period: 'week' (points earned in the last 7 days) | 'all' (rating)
create or replace function public.arena_leaderboard(p_period text default 'week', p_limit int default 20)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare lim int := least(greatest(coalesce(p_limit, 20), 1), 100); rows jsonb; me_row jsonb;
begin
  if p_period = 'all' then
    with ranked as (
      select a.user_id, a.rating as value, a.wins, a.matches, p.username, p.display_name, p.country,
             rank() over (order by a.rating desc) as rank
        from arena_ratings a join profiles p on p.id = a.user_id
       where a.matches > 0 and not p.is_guest and not p.banned and p.username is not null)
    select coalesce((select jsonb_agg(to_jsonb(t) - 'user_id' || jsonb_build_object('league', _arena_league(t.value)) order by t.rank, t.username)
                       from (select * from ranked order by rank, username limit lim) t), '[]'::jsonb),
           (select jsonb_build_object('rank', rank, 'value', value) from ranked where user_id = auth.uid())
      into rows, me_row;
  else
    with ranked as (
      select x.user_id, sum(x.score)::int as value, count(*) filter (where x.outcome = 1)::int as wins, count(*)::int as matches,
             p.username, p.display_name, p.country, coalesce(max(a.rating), 1000) as rating,
             rank() over (order by sum(x.score) desc) as rank
        from arena_results x join profiles p on p.id = x.user_id left join arena_ratings a on a.user_id = x.user_id
       where x.created_at > now() - interval '7 days' and not p.is_guest and not p.banned and p.username is not null
       group by x.user_id, p.username, p.display_name, p.country)
    select coalesce((select jsonb_agg(to_jsonb(t) - 'user_id' - 'rating' || jsonb_build_object('league', _arena_league(t.rating)) order by t.rank, t.username)
                       from (select * from ranked order by rank, username limit lim) t), '[]'::jsonb),
           (select jsonb_build_object('rank', rank, 'value', value) from ranked where user_id = auth.uid())
      into rows, me_row;
  end if;
  return jsonb_build_object('rows', rows, 'me', me_row);
end $$;

-- =====================================================================
-- Permissions
-- =====================================================================
revoke all on public.game_scores, public.game_runs, public.arena_ratings, public.arena_queue, public.arena_matches,
              public.arena_questions, public.arena_answers, public.arena_results from anon, authenticated;

revoke execute on function
  public._xp_give(uuid, text, text), public._game_level_limits(text, int), public._game_row(public.game_scores),
  public._arena_intro_secs(), public._arena_reveal_secs(), public._arena_bot_wait_secs(), public._arena_q_count(),
  public._arena_league(int), public._arena_points(boolean, int), public._arena_rating(uuid), public._arena_pool_size(text),
  public._arena_lang(text), public._arena_before_update(), public._arena_broadcast(), public._arena_create(text, uuid, uuid),
  public._arena_start_q(uuid, int), public._arena_reveal(uuid), public._arena_finish_player(public.arena_matches, int, int, int),
  public._arena_end(uuid), public._arena_tick(uuid), public._arena_view(uuid, uuid),
  public.submit_game_score(text, int, int, int, int, boolean), public.my_game_progress(text),
  public.game_leaderboard(text, int, text, int), public.arena_find(text), public.arena_cancel(), public.arena_state(uuid),
  public.arena_answer(uuid, int, int), public.my_arena(), public.arena_online(), public.arena_leaderboard(text, int)
from public, anon, authenticated;
revoke execute on function public._xp_amount(text) from public, anon, authenticated;

grant execute on function
  public.submit_game_score(text, int, int, int, int, boolean), public.my_game_progress(text),
  public.arena_find(text), public.arena_cancel(), public.arena_state(uuid), public.arena_answer(uuid, int, int),
  public.my_arena()
to authenticated;
grant execute on function
  public.game_leaderboard(text, int, text, int), public.arena_online(), public.arena_leaderboard(text, int)
to anon, authenticated;
