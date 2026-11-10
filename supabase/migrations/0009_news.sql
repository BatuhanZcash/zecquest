-- =====================================================================
-- 0009: Gündem (News): daily Zcash digest built from primary sources.
--
-- Flow: a daily cron (app/api/cron/news) collects the last 24h from the Zcash
-- forum, GitHub releases and the network, scores items and writes them with the
-- service role (news_ingest). An admin (editor) composes the digest from the
-- collected items, writes the summaries and publishes. Organizers (creator role)
-- can translate a published digest into any language; admins approve.
--
-- Rules carried by the data model:
--   * every digest item has a source url (required on publish)
--   * kind = 'statement' items are attributed to a person/org ("X said…")
--   * verified = false marks single-source claims ("unverified" for the editor)
--
-- Tables have RLS on and no policies; everything goes through the RPCs below.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Key people: forum usernames whose posts raise an item's score.
create table if not exists public.news_key_people (
  username text primary key check (username ~ '^[A-Za-z0-9_.-]{1,60}$'),
  display_name text check (char_length(display_name) <= 80),
  affiliation text check (char_length(affiliation) <= 80),
  kind text not null default 'ecosystem' check (kind in ('org', 'protocol', 'zcg', 'ecosystem')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists news_key_people_lower on public.news_key_people (lower(username));

-- Single-row settings (next network upgrade is admin-editable, never hardcoded in the UI).
create table if not exists public.news_settings (
  id int primary key default 1 check (id = 1),
  next_upgrade_name text check (char_length(next_upgrade_name) <= 40),
  next_upgrade_height bigint check (next_upgrade_height > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- Raw collected items (one row per source item per digest day).
create table if not exists public.news_items (
  id bigserial primary key,
  digest_date date not null,
  external_id text not null check (char_length(external_id) <= 200),
  source text not null check (source in ('forum', 'github', 'network')),
  url text not null check (url ~ '^https?://'),
  title text not null check (char_length(title) <= 300),
  excerpt text check (char_length(excerpt) <= 2000),
  author text check (char_length(author) <= 80),
  author_is_key boolean not null default false,
  author_is_official boolean not null default false,
  category text check (char_length(category) <= 80),
  kind text not null default 'fact' check (kind in ('fact', 'statement')),
  source_created_at timestamptz,
  last_activity_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  score int not null default 0,
  score_breakdown jsonb not null default '[]'::jsonb,
  tier text not null default 'watch' check (tier in ('lead', 'brief', 'watch')),
  single_source boolean not null default true,
  dismissed boolean not null default false,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (digest_date, external_id)
);
create index if not exists news_items_date_score on public.news_items (digest_date, score desc);

-- Network snapshots (daily, so 24h deltas are real numbers).
create table if not exists public.news_snapshots (
  id bigserial primary key,
  taken_at timestamptz not null default now(),
  height bigint check (height >= 0),
  pools jsonb,      -- { "transparent", "sprout", "sapling", "orchard", "ironwood", "lockbox": ZEC } (only what the source exposes)
  source text check (char_length(source) <= 60)
);
create index if not exists news_snapshots_taken on public.news_snapshots (taken_at desc);

-- Collector run log
create table if not exists public.news_runs (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  digest_date date,
  stats jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb
);

-- Digests
create table if not exists public.news_digests (
  date date primary key,
  status text not null default 'draft' check (status in ('draft', 'published')),
  base_lang text not null default 'en' check (base_lang ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  edited_by uuid references public.profiles (id) on delete set null
);

-- Language-neutral item structure (order, section, source, flags)
create table if not exists public.news_digest_items (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null references public.news_digests (date) on delete cascade,
  position int not null,
  section text not null check (section ~ '^[a-z_]{2,24}$'),
  tier text not null default 'brief' check (tier in ('lead', 'brief', 'watch')),
  url text not null check (url ~ '^https?://' and char_length(url) <= 500),
  source_name text check (char_length(source_name) <= 80),
  attribution text check (char_length(attribution) <= 120),
  kind text not null default 'fact' check (kind in ('fact', 'statement')),
  verified boolean not null default false,
  related_slug text check (related_slug ~ '^[a-z0-9][a-z0-9/-]{0,99}$'),
  source_item_id bigint references public.news_items (id) on delete set null
);
create index if not exists news_digest_items_date on public.news_digest_items (digest_date, position);

-- Per-language text. items: { "<item uuid>": { title, summary, badge, facts: [{value,label}] } }
create table if not exists public.news_digest_versions (
  digest_date date not null references public.news_digests (date) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  title text not null check (char_length(title) between 1 and 140),
  intro text check (char_length(intro) <= 600),
  items jsonb not null default '{}'::jsonb,
  translator_id uuid references public.profiles (id) on delete set null,
  translator_name text check (char_length(translator_name) <= 80),
  translator_username text,
  approved_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (digest_date, lang)
);

-- Organizer translation submissions (moderated)
create table if not exists public.news_translations (
  id bigserial primary key,
  digest_date date not null references public.news_digests (date) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  title text not null,
  intro text,
  items jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  note text check (char_length(note) <= 500)
);
create index if not exists news_translations_status on public.news_translations (status, submitted_at desc);

alter table public.news_key_people enable row level security;
alter table public.news_settings enable row level security;
alter table public.news_items enable row level security;
alter table public.news_snapshots enable row level security;
alter table public.news_runs enable row level security;
alter table public.news_digests enable row level security;
alter table public.news_digest_items enable row level security;
alter table public.news_digest_versions enable row level security;
alter table public.news_translations enable row level security;
revoke all on public.news_key_people, public.news_settings, public.news_items, public.news_snapshots, public.news_runs,
  public.news_digests, public.news_digest_items, public.news_digest_versions, public.news_translations
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed: key people (editable by admins) + settings row
-- ---------------------------------------------------------------------
insert into public.news_key_people (username, display_name, affiliation, kind) values
  ('ZcashFoundation', 'Zcash Foundation', 'Zcash Foundation', 'org'),
  ('ZCG', 'Zcash Community Grants', 'ZCG', 'org'),
  ('zooko', 'zooko', 'Shielded Labs', 'protocol'),
  ('daira', 'daira', null, 'protocol'),
  ('str4d', 'str4d', null, 'protocol'),
  ('joshs', 'joshs', 'ZODL', 'protocol'),
  ('arya2', 'arya2', null, 'protocol'),
  ('conradoplg', 'conradoplg', null, 'protocol'),
  ('secparam', 'secparam', 'Zcash Foundation', 'protocol'),
  ('nuttycom', 'nuttycom', null, 'protocol'),
  ('ebfull', 'ebfull', null, 'protocol'),
  ('FPF', 'FPF', 'ZCG', 'zcg'),
  ('zerodartz', 'zerodartz', 'ZCG', 'zcg'),
  ('paulbrigner', 'paulbrigner', 'ZCG', 'zcg'),
  ('hanh', 'hanh', 'ZCG', 'zcg'),
  ('GGuy', 'GGuy', 'ZCG', 'zcg'),
  ('artkor', 'artkor', 'ZCG', 'zcg'),
  ('maxdesalle', 'maxdesalle', null, 'ecosystem'),
  ('emersonian', 'emersonian', null, 'ecosystem'),
  ('thowar2', 'thowar2', null, 'ecosystem')
on conflict do nothing;

-- NU7 activation height from the brief (mainnet block 3,543,405). Admins change it from /admin/news.
insert into public.news_settings (id, next_upgrade_name, next_upgrade_height) values (1, 'NU7', 3543405)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------
create or replace function public._news_valid_lang(p text) returns boolean
language sql immutable as $$ select p is not null and p ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$' and char_length(p) <= 20 $$;

-- Clean one item's text block { title, summary, badge, facts }
create or replace function public._news_clean_text(p jsonb) returns jsonb
language plpgsql immutable as $$
declare v_facts jsonb := '[]'::jsonb; f jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return null; end if;
  if jsonb_typeof(p -> 'facts') = 'array' then
    for f in select * from jsonb_array_elements(p -> 'facts') loop
      if nullif(trim(f ->> 'value'), '') is not null and nullif(trim(f ->> 'label'), '') is not null then
        v_facts := v_facts || jsonb_build_array(jsonb_build_object(
          'value', left(trim(f ->> 'value'), 24),
          'label', left(coalesce(trim(f ->> 'label'), ''), 120)));
      end if;
      exit when jsonb_array_length(v_facts) >= 3;
    end loop;
  end if;
  if char_length(coalesce(p ->> 'title', '')) > 160 then raise exception 'title_too_long'; end if;
  if char_length(coalesce(p ->> 'summary', '')) > 700 then raise exception 'summary_too_long'; end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'title', nullif(trim(p ->> 'title'), ''),
    'summary', nullif(trim(p ->> 'summary'), ''),
    'badge', nullif(left(trim(coalesce(p ->> 'badge', '')), 40), ''),
    'facts', case when jsonb_array_length(v_facts) > 0 then v_facts end));
end $$;

-- Digest in one language (falls back per item to the base language).
create or replace function public._news_digest_json(p_date date, p_lang text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  d news_digests;
  v_lang text;
  v news_digest_versions;
  b news_digest_versions;
  v_items jsonb;
begin
  select * into d from news_digests where date = p_date;
  if not found then return null; end if;
  select * into b from news_digest_versions where digest_date = d.date and lang = d.base_lang;
  if not found then return null; end if;
  v_lang := coalesce(nullif(p_lang, ''), d.base_lang);
  select * into v from news_digest_versions where digest_date = d.date and lang = v_lang;
  if not found then
    -- try the primary subtag ("pt-BR" → "pt"), then base
    select * into v from news_digest_versions where digest_date = d.date and lang = split_part(v_lang, '-', 1);
    if not found then v := b; end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'position', i.position, 'section', i.section, 'tier', i.tier,
      'title', coalesce(v.items -> i.id::text ->> 'title', b.items -> i.id::text ->> 'title'),
      'summary', coalesce(v.items -> i.id::text ->> 'summary', b.items -> i.id::text ->> 'summary'),
      'badge', coalesce(v.items -> i.id::text ->> 'badge', b.items -> i.id::text ->> 'badge'),
      'facts', coalesce(v.items -> i.id::text -> 'facts', b.items -> i.id::text -> 'facts', '[]'::jsonb),
      'translated', (v.items ? i.id::text),
      'url', i.url, 'source_name', i.source_name, 'attribution', i.attribution, 'kind', i.kind,
      'verified', i.verified, 'related_slug', i.related_slug) order by i.position), '[]'::jsonb)
  into v_items
  from news_digest_items i where i.digest_date = d.date;

  return jsonb_build_object(
    'date', d.date, 'status', d.status, 'base_lang', d.base_lang,
    'requested_lang', v_lang, 'lang', v.lang,
    'title', v.title, 'intro', coalesce(v.intro, case when v.lang <> b.lang then b.intro end),
    'published_at', d.published_at, 'updated_at', d.updated_at,
    'translator', case when v.translator_name is not null
                       then jsonb_build_object('name', v.translator_name, 'username', v.translator_username) end,
    'languages', (select coalesce(jsonb_agg(jsonb_build_object('lang', x.lang, 'translator', x.translator_name)
                         order by x.lang = d.base_lang desc, x.lang), '[]'::jsonb)
                  from news_digest_versions x where x.digest_date = d.date),
    'sources', (select coalesce(jsonb_agg(distinct s.source_name), '[]'::jsonb)
                from news_digest_items s where s.digest_date = d.date and s.source_name is not null),
    'items', v_items);
end $$;

-- ---------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------

-- One digest. Published only; admins can preview drafts. Returns null if missing.
create or replace function public.get_digest(p_date date, p_lang text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from news_digests where date = p_date and (status = 'published' or is_admin())) then
    return null;
  end if;
  return _news_digest_json(p_date, p_lang);
end $$;

-- Latest published digest, or null.
-- Contract (home page): { date, title, items: [{ title, summary, section, url, ... }], ... }
create or replace function public.get_latest_digest(p_lang text default null)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select _news_digest_json(d.date, p_lang)
  from news_digests d where d.status = 'published' order by d.date desc limit 1
$$;

-- Archive of published digests (newest first)
create or replace function public.list_digests(p_limit int default 30, p_offset int default 0, p_lang text default null)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(r order by (r ->> 'date') desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'date', d.date,
      'title', coalesce(v.title, b.title),
      'lang', coalesce(v.lang, b.lang),
      'item_count', (select count(*) from news_digest_items i where i.digest_date = d.date),
      'lead', (select jsonb_build_object('section', i.section,
                 'title', coalesce(v.items -> i.id::text ->> 'title', b.items -> i.id::text ->> 'title'))
               from news_digest_items i where i.digest_date = d.date order by (i.tier = 'lead') desc, i.position limit 1),
      'languages', (select coalesce(jsonb_agg(x.lang order by x.lang), '[]'::jsonb)
                    from news_digest_versions x where x.digest_date = d.date)) r
    from news_digests d
    join news_digest_versions b on b.digest_date = d.date and b.lang = d.base_lang
    left join news_digest_versions v on v.digest_date = d.date and v.lang = p_lang
    where d.status = 'published'
    order by d.date desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100) offset greatest(coalesce(p_offset, 0), 0)) s
$$;

-- Network status from the latest snapshot.
-- Contract: { height, pools, pools_delta_24h, shielded, shielded_delta_24h,
--             next_upgrade: { name, height, blocks_left } | null, last_upgrade, updated_at, source }
create or replace function public.get_network_status()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  cur news_snapshots;
  prev news_snapshots;
  s news_settings;
  v_delta jsonb := null;
  v_shielded numeric;
  v_prev_shielded numeric;
  k text;
begin
  select * into cur from news_snapshots order by taken_at desc limit 1;
  select * into s from news_settings where id = 1;
  if cur.id is not null then
    -- the snapshot closest to 24h before the latest one (at least 20h older)
    select * into prev from news_snapshots
      where taken_at <= cur.taken_at - interval '20 hours' and taken_at >= cur.taken_at - interval '48 hours'
      order by abs(extract(epoch from (cur.taken_at - interval '24 hours' - taken_at))) limit 1;
  end if;
  if cur.pools is not null then
    select sum((cur.pools ->> x)::numeric) into v_shielded
      from unnest(array['sprout', 'sapling', 'orchard', 'ironwood']) x where jsonb_typeof(cur.pools -> x) = 'number';
    if prev.pools is not null then
      v_delta := '{}'::jsonb;
      for k in select jsonb_object_keys(cur.pools) loop
        if jsonb_typeof(cur.pools -> k) = 'number' and jsonb_typeof(prev.pools -> k) = 'number' then
          v_delta := v_delta || jsonb_build_object(k, round((cur.pools ->> k)::numeric - (prev.pools ->> k)::numeric, 8));
        end if;
      end loop;
      select sum((prev.pools ->> x)::numeric) into v_prev_shielded
        from unnest(array['sprout', 'sapling', 'orchard', 'ironwood']) x where jsonb_typeof(prev.pools -> x) = 'number';
    end if;
  end if;
  return jsonb_build_object(
    'height', cur.height,
    'pools', cur.pools,
    'pools_delta_24h', v_delta,
    'shielded', v_shielded,
    'shielded_delta_24h', case when v_shielded is not null and v_prev_shielded is not null then round(v_shielded - v_prev_shielded, 8) end,
    'height_24h_ago', prev.height,
    'next_upgrade', case when s.next_upgrade_height is not null and (cur.height is null or cur.height < s.next_upgrade_height)
                         then jsonb_build_object('name', s.next_upgrade_name, 'height', s.next_upgrade_height,
                                                 'blocks_left', s.next_upgrade_height - cur.height) end,
    'last_upgrade', case when s.next_upgrade_height is not null and cur.height >= s.next_upgrade_height
                         then jsonb_build_object('name', s.next_upgrade_name, 'height', s.next_upgrade_height) end,
    'updated_at', cur.taken_at,
    'source', cur.source);
end $$;

-- ---------------------------------------------------------------------
-- Collector (service role only: app/api/cron/news)
-- ---------------------------------------------------------------------
create or replace function public.news_collector_config()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'people', (select coalesce(jsonb_agg(jsonb_build_object('username', username, 'kind', kind, 'affiliation', affiliation,
                                                            'display_name', display_name) order by username), '[]'::jsonb)
               from news_key_people where active),
    'settings', (select to_jsonb(s) - 'updated_by' from news_settings s where id = 1))
$$;

-- p: { digest_date, items: [...], snapshot: { height, pools, source } | null, stats, errors }
create or replace function public.news_ingest(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_date date := (p ->> 'digest_date')::date;
  it jsonb;
  n int := 0;
begin
  if v_date is null then raise exception 'invalid_date'; end if;
  for it in select * from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) loop
    insert into news_items (digest_date, external_id, source, url, title, excerpt, author, author_is_key, author_is_official,
                            category, kind, source_created_at, last_activity_at, metrics, score, score_breakdown, tier, single_source)
    values (v_date, it ->> 'external_id', it ->> 'source', it ->> 'url', left(it ->> 'title', 300), left(it ->> 'excerpt', 2000),
            left(it ->> 'author', 80), coalesce((it ->> 'author_is_key')::boolean, false),
            coalesce((it ->> 'author_is_official')::boolean, false), left(it ->> 'category', 80),
            coalesce(it ->> 'kind', 'fact'), (it ->> 'source_created_at')::timestamptz, (it ->> 'last_activity_at')::timestamptz,
            coalesce(it -> 'metrics', '{}'::jsonb), coalesce((it ->> 'score')::int, 0), coalesce(it -> 'score_breakdown', '[]'::jsonb),
            coalesce(it ->> 'tier', 'watch'), coalesce((it ->> 'single_source')::boolean, true))
    on conflict (digest_date, external_id) do update set
      title = excluded.title, excerpt = excluded.excerpt, url = excluded.url, category = excluded.category,
      author_is_key = excluded.author_is_key, author_is_official = excluded.author_is_official, kind = excluded.kind,
      last_activity_at = excluded.last_activity_at, metrics = excluded.metrics, score = excluded.score,
      score_breakdown = excluded.score_breakdown, tier = excluded.tier, single_source = excluded.single_source,
      updated_at = now();
    n := n + 1;
  end loop;
  if p -> 'snapshot' is not null and jsonb_typeof(p -> 'snapshot') = 'object'
     and ((p -> 'snapshot' ->> 'height') is not null or jsonb_typeof(p -> 'snapshot' -> 'pools') = 'object') then
    insert into news_snapshots (height, pools, source)
    values ((p -> 'snapshot' ->> 'height')::bigint,
            case when jsonb_typeof(p -> 'snapshot' -> 'pools') = 'object' then p -> 'snapshot' -> 'pools' end,
            left(p -> 'snapshot' ->> 'source', 60));
  end if;
  insert into news_runs (digest_date, stats, errors)
  values (v_date, coalesce(p -> 'stats', '{}'::jsonb) || jsonb_build_object('items', n), coalesce(p -> 'errors', '[]'::jsonb));
  return jsonb_build_object('items', n, 'digest_date', v_date);
end $$;

-- ---------------------------------------------------------------------
-- Editor (admin) RPCs
-- ---------------------------------------------------------------------

-- Days with collected items and/or digests (last 60 days)
create or replace function public.news_admin_dates()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(r order by (r ->> 'date') desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'date', x.date,
      'collected', (select count(*) from news_items i where i.digest_date = x.date and not i.dismissed),
      'status', (select d.status from news_digests d where d.date = x.date),
      'items', (select count(*) from news_digest_items di where di.digest_date = x.date),
      'languages', (select coalesce(jsonb_agg(v.lang order by v.lang), '[]'::jsonb) from news_digest_versions v where v.digest_date = x.date)) r
    from (select digest_date as date from news_items union select date from news_digests) x
    order by x.date desc limit 60) s);
end $$;

create or replace function public.news_admin_items(p_date date, p_include_dismissed boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(to_jsonb(i) || jsonb_build_object(
            'used', exists (select 1 from news_digest_items di where di.source_item_id = i.id))
          order by i.score desc, i.id), '[]'::jsonb)
          from news_items i where i.digest_date = p_date and (p_include_dismissed or not i.dismissed));
end $$;

create or replace function public.news_admin_dismiss_item(p_id bigint, p_dismissed boolean default true)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  update news_items set dismissed = coalesce(p_dismissed, true) where id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Full digest for editing: digest row, items (structure) and all versions (raw)
create or replace function public.news_admin_get_digest(p_date date)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare d news_digests;
begin
  perform _require_admin();
  select * into d from news_digests where date = p_date;
  if not found then return null; end if;
  return to_jsonb(d) || jsonb_build_object(
    'items', (select coalesce(jsonb_agg(to_jsonb(i) - 'digest_date' order by i.position), '[]'::jsonb)
              from news_digest_items i where i.digest_date = p_date),
    'versions', (select coalesce(jsonb_object_agg(v.lang, jsonb_build_object(
                   'title', v.title, 'intro', v.intro, 'items', v.items, 'translator_name', v.translator_name)), '{}'::jsonb)
                 from news_digest_versions v where v.digest_date = p_date));
end $$;

-- Save (create or replace) a digest.
-- p: { base_lang, items: [{ id?, section, tier, url, source_name, attribution, kind, verified, related_slug, source_item_id }],
--      texts: { "<lang>": { title, intro, items: [ { title, summary, badge, facts } ...same order as items ] } } }
-- texts must contain base_lang. Languages omitted from texts are kept (translations survive edits).
create or replace function public.news_admin_save_digest(p_date date, p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_base text := coalesce(nullif(p ->> 'base_lang', ''), 'en');
  it jsonb;
  ids uuid[] := '{}';
  v_id uuid;
  pos int := 0;
  v_lang text;
  t jsonb;
  v_map jsonb;
  k int;
  v_leads int := 0;
begin
  perform _require_admin();
  if p_date is null then raise exception 'invalid_date'; end if;
  if not _news_valid_lang(v_base) then raise exception 'invalid_lang'; end if;
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') > 12 then raise exception 'invalid_items'; end if;
  if jsonb_typeof(p -> 'texts') <> 'object' or not (p -> 'texts') ? v_base then raise exception 'base_text_required'; end if;
  if nullif(trim(p -> 'texts' -> v_base ->> 'title'), '') is null then raise exception 'title_required'; end if;

  insert into news_digests (date, base_lang, edited_by) values (p_date, v_base, auth.uid())
  on conflict (date) do update set base_lang = excluded.base_lang, edited_by = auth.uid(), updated_at = now();

  -- items (stable ids so translations keep pointing at the right item)
  for it in select * from jsonb_array_elements(p -> 'items') loop
    v_id := coalesce(nullif(it ->> 'id', '')::uuid, gen_random_uuid());
    if (it ->> 'url') is null or (it ->> 'url') !~ '^https?://' then raise exception 'invalid_url'; end if;
    if coalesce(it ->> 'tier', 'brief') = 'lead' then v_leads := v_leads + 1; end if;
    if exists (select 1 from news_digest_items where id = v_id and digest_date <> p_date) then v_id := gen_random_uuid(); end if;
    insert into news_digest_items (id, digest_date, position, section, tier, url, source_name, attribution, kind, verified,
                                   related_slug, source_item_id)
    values (v_id, p_date, pos, coalesce(nullif(it ->> 'section', ''), 'ecosystem'), coalesce(nullif(it ->> 'tier', ''), 'brief'),
            trim(it ->> 'url'), nullif(left(trim(coalesce(it ->> 'source_name', '')), 80), ''),
            nullif(left(trim(coalesce(it ->> 'attribution', '')), 120), ''), coalesce(nullif(it ->> 'kind', ''), 'fact'),
            coalesce((it ->> 'verified')::boolean, false), nullif(lower(trim(coalesce(it ->> 'related_slug', ''))), ''),
            (select id from news_items where id = nullif(it ->> 'source_item_id', '')::bigint))
    on conflict (id) do update set position = excluded.position, section = excluded.section, tier = excluded.tier,
      url = excluded.url, source_name = excluded.source_name, attribution = excluded.attribution, kind = excluded.kind,
      verified = excluded.verified, related_slug = excluded.related_slug, source_item_id = excluded.source_item_id;
    ids := ids || v_id;
    pos := pos + 1;
  end loop;
  if v_leads > 1 then raise exception 'one_lead_only'; end if;
  delete from news_digest_items where digest_date = p_date and not (id = any (ids));

  -- texts per language
  for v_lang, t in select * from jsonb_each(p -> 'texts') loop
    if not _news_valid_lang(v_lang) then raise exception 'invalid_lang'; end if;
    if nullif(trim(t ->> 'title'), '') is null then continue; end if;
    if char_length(trim(t ->> 'title')) > 140 then raise exception 'title_too_long'; end if;
    v_map := '{}'::jsonb;
    if jsonb_typeof(t -> 'items') = 'array' then
      for k in 0 .. least(jsonb_array_length(t -> 'items'), coalesce(array_length(ids, 1), 0)) - 1 loop
        if _news_clean_text(t -> 'items' -> k) is not null and _news_clean_text(t -> 'items' -> k) <> '{}'::jsonb then
          v_map := v_map || jsonb_build_object(ids[k + 1]::text, _news_clean_text(t -> 'items' -> k));
        end if;
      end loop;
    end if;
    insert into news_digest_versions (digest_date, lang, title, intro, items, approved_by)
    values (p_date, v_lang, left(trim(t ->> 'title'), 140), nullif(left(trim(coalesce(t ->> 'intro', '')), 600), ''), v_map, auth.uid())
    on conflict (digest_date, lang) do update set title = excluded.title, intro = excluded.intro, items = excluded.items,
      updated_at = now();
  end loop;
  -- drop stale item keys from versions not resent
  update news_digest_versions v set items = coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(v.items) e
                                                     where e.key::uuid = any (ids)), '{}'::jsonb)
  where v.digest_date = p_date;

  update news_digests set updated_at = now() where date = p_date;
  return public.news_admin_get_digest(p_date);
end $$;

-- Publish / unpublish. Publishing validates that every item has a source link, a title and a summary in the base language.
create or replace function public.news_admin_set_status(p_date date, p_status text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare d news_digests; b news_digest_versions; i news_digest_items;
begin
  perform _require_admin();
  select * into d from news_digests where date = p_date for update;
  if not found then raise exception 'not_found'; end if;
  if p_status not in ('draft', 'published') then raise exception 'invalid_status'; end if;
  if p_status = 'published' then
    select * into b from news_digest_versions where digest_date = p_date and lang = d.base_lang;
    if not found then raise exception 'base_text_required'; end if;
    if not exists (select 1 from news_digest_items where digest_date = p_date) then raise exception 'no_items'; end if;
    for i in select * from news_digest_items where digest_date = p_date loop
      if nullif(b.items -> i.id::text ->> 'title', '') is null or nullif(b.items -> i.id::text ->> 'summary', '') is null then
        raise exception 'item_text_missing';
      end if;
      if i.kind = 'statement' and i.attribution is null then raise exception 'attribution_required'; end if;
    end loop;
  end if;
  update news_digests set status = p_status,
    published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end,
    published_by = case when p_status = 'published' then coalesce(published_by, auth.uid()) else published_by end,
    updated_at = now()
  where date = p_date;
  return jsonb_build_object('date', p_date, 'status', p_status);
end $$;

create or replace function public.news_admin_delete_digest(p_date date)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  delete from news_digests where date = p_date and status = 'draft';
  if not found then raise exception 'not_found_or_published'; end if;
end $$;

create or replace function public.news_admin_delete_version(p_date date, p_lang text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  if exists (select 1 from news_digests where date = p_date and base_lang = p_lang) then raise exception 'cannot_delete_base'; end if;
  delete from news_digest_versions where digest_date = p_date and lang = p_lang;
end $$;

-- Key people
create or replace function public.news_admin_people()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(to_jsonb(k) order by k.kind, lower(k.username)), '[]'::jsonb) from news_key_people k);
end $$;

create or replace function public.news_admin_save_person(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user text := trim(p ->> 'username'); r news_key_people;
begin
  perform _require_admin();
  if v_user is null or v_user !~ '^[A-Za-z0-9_.-]{1,60}$' then raise exception 'invalid_username'; end if;
  if coalesce(p ->> 'kind', 'ecosystem') not in ('org', 'protocol', 'zcg', 'ecosystem') then raise exception 'invalid_kind'; end if;
  -- usernames are case-insensitive on Discourse
  update news_key_people set username = v_user,
    display_name = nullif(left(trim(coalesce(p ->> 'display_name', '')), 80), ''),
    affiliation = nullif(left(trim(coalesce(p ->> 'affiliation', '')), 80), ''),
    kind = coalesce(p ->> 'kind', 'ecosystem'), active = coalesce((p ->> 'active')::boolean, true)
  where lower(username) = lower(v_user) returning * into r;
  if not found then
    insert into news_key_people (username, display_name, affiliation, kind, active)
    values (v_user, nullif(left(trim(coalesce(p ->> 'display_name', '')), 80), ''),
            nullif(left(trim(coalesce(p ->> 'affiliation', '')), 80), ''), coalesce(p ->> 'kind', 'ecosystem'),
            coalesce((p ->> 'active')::boolean, true))
    returning * into r;
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.news_admin_delete_person(p_username text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  delete from news_key_people where lower(username) = lower(p_username);
end $$;

create or replace function public.news_admin_set_upgrade(p_name text, p_height bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  if (nullif(trim(p_name), '') is null) <> (p_height is null) then raise exception 'name_and_height_required'; end if;
  if p_height is not null and p_height <= 0 then raise exception 'invalid_height'; end if;
  insert into news_settings (id, next_upgrade_name, next_upgrade_height, updated_at, updated_by)
  values (1, nullif(left(trim(p_name), 40), ''), p_height, now(), auth.uid())
  on conflict (id) do update set next_upgrade_name = excluded.next_upgrade_name,
    next_upgrade_height = excluded.next_upgrade_height, updated_at = now(), updated_by = auth.uid();
  return public.get_network_status();
end $$;

create or replace function public.news_admin_runs(p_limit int default 10)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(to_jsonb(r) order by r.ran_at desc), '[]'::jsonb)
          from (select * from news_runs order by ran_at desc limit least(greatest(p_limit, 1), 50)) r);
end $$;

-- ---------------------------------------------------------------------
-- Translations (organizers = creator role; admins publish directly)
-- ---------------------------------------------------------------------
-- p: { title, intro, items: { "<item uuid>": { title, summary, badge, facts } } }
create or replace function public.news_submit_translation(p_date date, p_lang text, p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me profiles;
  d news_digests;
  v_map jsonb := '{}'::jsonb;
  e record;
  v_id bigint;
begin
  me := _require_user();
  if not is_creator() then raise exception 'creator_required'; end if;
  select * into d from news_digests where date = p_date;
  if not found or d.status <> 'published' then raise exception 'not_found'; end if;
  if not _news_valid_lang(p_lang) then raise exception 'invalid_lang'; end if;
  if p_lang = d.base_lang then raise exception 'base_language'; end if;
  if nullif(trim(p ->> 'title'), '') is null then raise exception 'title_required'; end if;
  if char_length(trim(p ->> 'title')) > 140 or char_length(coalesce(p ->> 'intro', '')) > 600 then raise exception 'too_long'; end if;
  if jsonb_typeof(p -> 'items') = 'object' then
    for e in select * from jsonb_each(p -> 'items') loop
      if exists (select 1 from news_digest_items where digest_date = p_date and id::text = e.key)
         and _news_clean_text(e.value) is not null and _news_clean_text(e.value) <> '{}'::jsonb then
        v_map := v_map || jsonb_build_object(e.key, _news_clean_text(e.value));
      end if;
    end loop;
  end if;
  if v_map = '{}'::jsonb then raise exception 'items_required'; end if;

  if is_admin() then
    insert into news_digest_versions (digest_date, lang, title, intro, items, translator_id, translator_name, translator_username, approved_by)
    values (p_date, p_lang, trim(p ->> 'title'), nullif(trim(coalesce(p ->> 'intro', '')), ''), v_map,
            me.id, me.display_name, me.username, me.id)
    on conflict (digest_date, lang) do update set title = excluded.title, intro = excluded.intro, items = excluded.items,
      translator_id = excluded.translator_id, translator_name = excluded.translator_name,
      translator_username = excluded.translator_username, approved_by = excluded.approved_by, updated_at = now();
    insert into news_translations (digest_date, lang, title, intro, items, status, submitted_by, reviewed_by, reviewed_at)
    values (p_date, p_lang, trim(p ->> 'title'), nullif(trim(coalesce(p ->> 'intro', '')), ''), v_map, 'approved', me.id, me.id, now())
    returning id into v_id;
    return jsonb_build_object('id', v_id, 'status', 'approved');
  end if;

  -- one open submission per (user, digest, language): resubmitting updates it
  update news_translations set title = trim(p ->> 'title'), intro = nullif(trim(coalesce(p ->> 'intro', '')), ''),
    items = v_map, submitted_at = now()
  where digest_date = p_date and lang = p_lang and submitted_by = me.id and status = 'pending'
  returning id into v_id;
  if v_id is null then
    if (select count(*) from news_translations where submitted_by = me.id and status = 'pending') >= 20 then
      raise exception 'too_many_pending';
    end if;
    insert into news_translations (digest_date, lang, title, intro, items, submitted_by)
    values (p_date, p_lang, trim(p ->> 'title'), nullif(trim(coalesce(p ->> 'intro', '')), ''), v_map, me.id)
    returning id into v_id;
  end if;
  return jsonb_build_object('id', v_id, 'status', 'pending');
end $$;

create or replace function public.news_my_translations()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me profiles;
begin
  me := _require_user();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'date', t.digest_date, 'lang', t.lang, 'title', t.title,
            'status', t.status, 'submitted_at', t.submitted_at, 'note', t.note) order by t.submitted_at desc), '[]'::jsonb)
          from news_translations t where t.submitted_by = me.id);
end $$;

create or replace function public.news_admin_translations(p_status text default 'pending')
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object(
            'submitter', jsonb_build_object('display_name', pr.display_name, 'username', pr.username))
          order by t.submitted_at desc), '[]'::jsonb)
          from news_translations t join profiles pr on pr.id = t.submitted_by
          where p_status is null or t.status = p_status);
end $$;

create or replace function public.news_admin_review_translation(p_id bigint, p_approve boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t news_translations; pr profiles;
begin
  perform _require_admin();
  select * into t from news_translations where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if t.status <> 'pending' then raise exception 'already_reviewed'; end if;
  if p_approve then
    select * into pr from profiles where id = t.submitted_by;
    insert into news_digest_versions (digest_date, lang, title, intro, items, translator_id, translator_name, translator_username, approved_by)
    values (t.digest_date, t.lang, t.title, t.intro, t.items, t.submitted_by, pr.display_name, pr.username, auth.uid())
    on conflict (digest_date, lang) do update set title = excluded.title, intro = excluded.intro, items = excluded.items,
      translator_id = excluded.translator_id, translator_name = excluded.translator_name,
      translator_username = excluded.translator_username, approved_by = excluded.approved_by, updated_at = now();
  end if;
  update news_translations set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now(), note = nullif(left(trim(coalesce(p_note, '')), 500), '')
  where id = p_id;
  return jsonb_build_object('id', p_id, 'status', case when p_approve then 'approved' else 'rejected' end);
end $$;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
revoke all on function
  public._news_valid_lang(text), public._news_clean_text(jsonb), public._news_digest_json(date, text),
  public.get_digest(date, text), public.get_latest_digest(text), public.list_digests(int, int, text), public.get_network_status(),
  public.news_collector_config(), public.news_ingest(jsonb),
  public.news_admin_dates(), public.news_admin_items(date, boolean), public.news_admin_dismiss_item(bigint, boolean),
  public.news_admin_get_digest(date), public.news_admin_save_digest(date, jsonb), public.news_admin_set_status(date, text),
  public.news_admin_delete_digest(date), public.news_admin_delete_version(date, text),
  public.news_admin_people(), public.news_admin_save_person(jsonb), public.news_admin_delete_person(text),
  public.news_admin_set_upgrade(text, bigint), public.news_admin_runs(int),
  public.news_submit_translation(date, text, jsonb), public.news_my_translations(),
  public.news_admin_translations(text), public.news_admin_review_translation(bigint, boolean, text)
from public, anon, authenticated;

grant execute on function public.get_digest(date, text), public.get_latest_digest(text), public.list_digests(int, int, text),
  public.get_network_status() to anon, authenticated, service_role;
grant execute on function public.news_collector_config(), public.news_ingest(jsonb) to service_role;
grant execute on function
  public.news_admin_dates(), public.news_admin_items(date, boolean), public.news_admin_dismiss_item(bigint, boolean),
  public.news_admin_get_digest(date), public.news_admin_save_digest(date, jsonb), public.news_admin_set_status(date, text),
  public.news_admin_delete_digest(date), public.news_admin_delete_version(date, text),
  public.news_admin_people(), public.news_admin_save_person(jsonb), public.news_admin_delete_person(text),
  public.news_admin_set_upgrade(text, bigint), public.news_admin_runs(int),
  public.news_submit_translation(date, text, jsonb), public.news_my_translations(),
  public.news_admin_translations(text), public.news_admin_review_translation(bigint, boolean, text)
to authenticated;
