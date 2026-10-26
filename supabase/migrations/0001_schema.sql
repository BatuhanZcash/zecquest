-- =====================================================================
-- ZecQuest — 0001: Tablolar ve yardımcı fonksiyonlar
-- Tüm veri erişimi güvenlik denetimli RPC fonksiyonlarıyla yapılır.
-- Tablolarda RLS açıktır ve hiçbir politika yoktur: istemci tablolara
-- doğrudan erişemez (doğru cevaplar, Zcash adresleri vb. asla sızmaz).
-- =====================================================================

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('player', 'creator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quiz_status as enum ('draft', 'pending', 'published', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.game_mode as enum ('hosted', 'scheduled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.game_status as enum ('lobby', 'question', 'reveal', 'leaderboard', 'ended', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Profiller
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 32),
  country text check (country ~ '^[A-Z]{2}$'),
  team text check (char_length(team) <= 64),
  role public.user_role not null default 'player',
  banned boolean not null default false,
  creator_request_at timestamptz,
  creator_request_note text check (char_length(creator_request_note) <= 500),
  created_at timestamptz not null default now()
);

-- Ödül ödemeleri için varsayılan Zcash adresi (sadece sahibi ve yöneticiler görür)
create table if not exists public.user_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  zcash_address text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Quizler ve sorular
-- ---------------------------------------------------------------------
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  title jsonb not null,
  description jsonb,
  icon text not null default 'shield',
  tags text[] not null default '{}',
  author_id uuid references public.profiles (id) on delete set null,
  status public.quiz_status not null default 'draft',
  default_time int not null default 20 check (default_time between 5 and 120),
  featured boolean not null default false,
  question_count int not null default 0,
  review_note text,
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quizzes_status_idx on public.quizzes (status);
create index if not exists quizzes_author_idx on public.quizzes (author_id);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null,
  text jsonb not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 4),
  correct smallint not null,
  time_limit int check (time_limit between 5 and 120),
  explanation jsonb,
  unique (quiz_id, position),
  check (correct >= 0 and correct < jsonb_array_length(options))
);

-- ---------------------------------------------------------------------
-- Canlı oyunlar (sunucu yönetimli odalar + planlı global yarışmalar)
-- ---------------------------------------------------------------------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[0-9]{6}$'),
  quiz_id uuid references public.quizzes (id) on delete set null,
  host_id uuid references public.profiles (id) on delete set null,
  mode public.game_mode not null,
  status public.game_status not null default 'lobby',
  visibility text not null default 'unlisted' check (visibility in ('public', 'unlisted')),
  title jsonb,
  question_count int not null,
  current_q int not null default -1,
  phase_started_at timestamptz,
  phase_ends_at timestamptz,
  starts_at timestamptz,
  reveal_secs int not null default 6 check (reveal_secs between 3 and 60),
  board_secs int not null default 6 check (board_secs between 3 and 60),
  prize jsonb,
  prize_places int not null default 0 check (prize_places between 0 and 10),
  last_reveal jsonb,
  leaderboard jsonb not null default '[]',
  state_version int not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
-- Aynı anda aktif iki odada aynı kod olamaz
create unique index if not exists games_active_code_idx
  on public.games (code) where status not in ('ended', 'cancelled');
create index if not exists games_due_idx on public.games (phase_ends_at)
  where status not in ('ended', 'cancelled');
create index if not exists games_public_idx on public.games (starts_at)
  where mode = 'scheduled' and visibility = 'public';

-- Oyun başlarken soruların anlık kopyası: quiz sonradan düzenlense de oyun etkilenmez
create table if not exists public.game_questions (
  game_id uuid not null references public.games (id) on delete cascade,
  q_index int not null,
  text jsonb not null,
  options jsonb not null,
  correct smallint not null,
  time_limit int not null,
  explanation jsonb,
  primary key (game_id, q_index)
);

create table if not exists public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  country text,
  team text,
  score int not null default 0,
  correct int not null default 0,
  streak int not null default 0,
  kicked boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index if not exists game_players_rank_idx on public.game_players (game_id, score desc);

create table if not exists public.game_answers (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  q_index int not null,
  choice smallint not null,
  elapsed_ms int not null,
  is_correct boolean not null,
  points int not null default 0,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id, q_index)
);
create index if not exists game_answers_q_idx on public.game_answers (game_id, q_index);

-- ---------------------------------------------------------------------
-- Solo oturumlar
-- ---------------------------------------------------------------------
create table if not exists public.solo_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  total int not null,
  current_q int not null default 0,
  q_started_at timestamptz not null default now(),
  answered boolean not null default false,
  score int not null default 0,
  correct int not null default 0,
  streak int not null default 0,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists solo_sessions_user_idx on public.solo_sessions (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Skor kayıtları (liderlik tablosunun kaynağı)
-- ---------------------------------------------------------------------
create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('live', 'solo')),
  ref_id uuid not null,
  quiz_id uuid references public.quizzes (id) on delete set null,
  score int not null,
  correct int not null,
  total int not null,
  created_at timestamptz not null default now(),
  unique (source, ref_id, user_id)
);
create index if not exists score_events_time_idx on public.score_events (created_at);
create index if not exists score_events_user_idx on public.score_events (user_id);
create index if not exists score_events_quiz_idx on public.score_events (quiz_id);

-- ---------------------------------------------------------------------
-- Ödül talepleri
-- ---------------------------------------------------------------------
create table if not exists public.prize_claims (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  place int not null,
  status text not null default 'awaiting_address'
    check (status in ('awaiting_address', 'pending', 'paid', 'void')),
  address text,
  txid text,
  admin_note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (game_id, user_id)
);

-- ---------------------------------------------------------------------
-- RLS: hepsi açık, politika yok → tablolara doğrudan erişim kapalı
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_private enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.games enable row level security;
alter table public.game_questions enable row level security;
alter table public.game_players enable row level security;
alter table public.game_answers enable row level security;
alter table public.solo_sessions enable row level security;
alter table public.score_events enable row level security;
alter table public.prize_claims enable row level security;

-- =====================================================================
-- Yardımcılar
-- =====================================================================

create or replace function public._now_ms(t timestamptz default now())
returns bigint language sql immutable as $$
  select (extract(epoch from t) * 1000)::bigint
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and not banned)
$$;

create or replace function public.is_creator()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('creator', 'admin') and not banned)
$$;

-- Oturum açmış, profilini tamamlamış ve engellenmemiş kullanıcıyı döndürür
create or replace function public._require_user()
returns public.profiles language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p profiles;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select * into p from profiles where id = auth.uid();
  if not found or p.username is null then raise exception 'profile_incomplete' using errcode = 'P0001'; end if;
  if p.banned then raise exception 'banned' using errcode = '42501'; end if;
  return p;
end $$;

-- 10 SANİYE KURALI: Her soru için cevap süresi (canlı yarışma, oda ve solo).
-- Quiz verisinde farklı süre yazsa bile sunucu bunu kullanır. Değiştirmek için sadece bu sayıyı düzenleyin.
create or replace function public._answer_secs()
returns int language sql immutable as $$ select 10 $$;

-- Puan: doğruysa 500 taban + hıza göre 0–500 + seri başına 100 (en fazla 5)
create or replace function public._points(is_correct boolean, elapsed_ms int, limit_s int, streak int)
returns int language sql immutable as $$
  select case when not is_correct then 0 else
    500
    + round(500 * (1 - least(1, greatest(0, elapsed_ms::numeric / (limit_s * 1000)))))::int
    + least(streak, 5) * 100
  end
$$;

-- Zcash adres biçimi denetimi (şeffaf t1/t3, TEX, Sapling zs, Unified u1)
create or replace function public.is_valid_zcash_address(a text)
returns boolean language sql immutable as $$
  select a is not null and (
       a ~ '^t[13][1-9A-HJ-NP-Za-km-z]{33}$'
    or a ~ '^tex1[02-9ac-hj-np-z]{38}$'
    or a ~ '^zs1[02-9ac-hj-np-z]{75}$'
    or (a ~ '^u1[02-9ac-hj-np-z]{100,}$' and char_length(a) <= 500)
  )
$$;

-- Yeni kullanıcı → profil satırı
create or replace function public._handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'player'), '@', 1)
    ), 32)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public._handle_new_user();
