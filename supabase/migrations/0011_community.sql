-- 0011: Topluluk — ülke/dil toplulukları ve buluşma takvimi.
--
-- Kurallar
--   * Topluluğu yalnızca organizatör (role creator/admin) açar; yönetici onaylayınca herkese görünür.
--   * Topluluğun organizatör listesindeki kişiler topluluğu düzenler ve buluşma ekler.
--   * "Katılacağım" (RSVP) XP vermez. Buluşmadan sonra organizatör katılımı işaretler →
--     katılımcıya bir kez 'event_join' XP'si verilir (yalnızca onaylı topluluklarda).
--   * Kişisel veri: herkese yalnızca katılım SAYISI gösterilir; isim listesi yalnızca organizatöre.
-- Tablolarda RLS açık ve politika yok; tüm erişim aşağıdaki security definer RPC'ler üzerinden.

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  name text not null check (char_length(name) between 2 and 80),
  -- null = ülkeye bağlı olmayan (global / çevrim içi) topluluk
  country text check (country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 80),
  languages text[] not null default '{}',
  -- Organizatörün yazdığı açıklama: düz metin (herhangi bir dil) ya da {tr,en,...}
  description jsonb,
  links jsonb not null default '{}'::jsonb,
  organizer_ids uuid[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists communities_country_idx on public.communities (country) where approved;
create index if not exists communities_org_idx on public.communities using gin (organizer_ids);

create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 4000),
  language text check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  city text check (char_length(city) <= 80),
  country text check (country ~ '^[A-Z]{2}$'),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  venue text check (char_length(venue) <= 200),
  online_url text check (char_length(online_url) <= 300),
  quiz_id uuid references public.quizzes (id) on delete set null,
  room_code text check (room_code ~ '^[0-9]{6}$'),
  cancelled boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists meetups_starts_idx on public.meetups (starts_at);
create index if not exists meetups_community_idx on public.meetups (community_id, starts_at);

create table if not exists public.meetup_rsvps (
  meetup_id uuid not null references public.meetups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  attended boolean not null default false,
  attended_at timestamptz,
  primary key (meetup_id, user_id)
);

alter table public.communities enable row level security;
alter table public.meetups enable row level security;
alter table public.meetup_rsvps enable row level security;
revoke all on public.communities, public.meetups, public.meetup_rsvps from anon, authenticated;

-- ---------------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------------
create or replace function public._is_community_organizer(c public.communities)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and (auth.uid() = any (c.organizer_ids) or public.is_admin())
$$;

create or replace function public._valid_url(p text)
returns boolean language sql immutable as $$
  select p is null or (p ~ '^https://[^\s<>"'']+$' and char_length(p) <= 300)
$$;

-- Bir meetup "bitti" mi? (bitiş yoksa başlangıçtan 3 saat sonra)
create or replace function public._meetup_end(m public.meetups)
returns timestamptz language sql immutable as $$ select coalesce(m.ends_at, m.starts_at + interval '3 hours') $$;

create or replace function public._community_card(c public.communities)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', c.id, 'slug', c.slug, 'name', c.name, 'country', c.country, 'city', c.city,
    'languages', to_jsonb(c.languages), 'description', c.description, 'links', c.links,
    'approved', c.approved,
    'upcoming_count', (select count(*) from meetups m where m.community_id = c.id and not m.cancelled
                       and public._meetup_end(m) >= now()),
    'next_meetup_at', (select min(m.starts_at) from meetups m where m.community_id = c.id and not m.cancelled
                       and public._meetup_end(m) >= now()))
$$;

create or replace function public._meetup_card(m public.meetups)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', m.id, 'title', m.title, 'language', m.language,
    'starts_at', m.starts_at, 'ends_at', m.ends_at, 'timezone', m.timezone,
    'city', m.city, 'country', coalesce(m.country, c.country), 'lat', m.lat, 'lng', m.lng,
    'venue', m.venue, 'online', m.online_url is not null, 'cancelled', m.cancelled,
    'going_count', (select count(*) from meetup_rsvps r where r.meetup_id = m.id),
    'me_going', exists (select 1 from meetup_rsvps r where r.meetup_id = m.id and r.user_id = auth.uid()),
    'community', jsonb_build_object('slug', c.slug, 'name', c.name, 'country', c.country))
  from communities c where c.id = m.community_id
$$;

-- Başka bir kullanıcıya XP ver (award_xp yalnızca auth.uid() içindir). Dönüş: verilen miktar (0 = zaten verilmiş)
create or replace function public._grant_xp(p_user uuid, p_source text, p_ref text)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare v_amt int := public._xp_amount(p_source); v_ins int;
begin
  insert into xp_events (user_id, source, ref, amount) values (p_user, p_source, p_ref, v_amt)
  on conflict (user_id, source, ref) do nothing;
  get diagnostics v_ins = row_count;
  if v_ins > 0 then update profiles set xp = xp + v_amt where id = p_user; return v_amt; end if;
  return 0;
end $$;

create or replace function public._revoke_xp(p_user uuid, p_source text, p_ref text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_amt int;
begin
  delete from xp_events where user_id = p_user and source = p_source and ref = p_ref returning amount into v_amt;
  if v_amt is not null then update profiles set xp = greatest(0, xp - v_amt) where id = p_user; end if;
end $$;

-- ---------------------------------------------------------------------
-- Topluluklar
-- ---------------------------------------------------------------------
-- Herkese açık liste (yalnızca onaylı). Filtreler isteğe bağlı.
create or replace function public.list_communities(p_country text default null, p_language text default null)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(public._community_card(c) order by c.name), '[]'::jsonb)
  from communities c
  where c.approved
    and (p_country is null or c.country = upper(p_country))
    and (p_language is null or p_language = any (c.languages)
         or split_part(p_language, '-', 1) = any (select split_part(l, '-', 1) from unnest(c.languages) l))
$$;

-- Tek topluluk: onaysızsa yalnızca organizatör/yönetici görür
create or replace function public.get_community(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare c communities; v_org boolean;
begin
  select * into c from communities where slug = lower(p_slug);
  if not found then return null; end if;
  v_org := public._is_community_organizer(c);
  if not c.approved and not v_org then return null; end if;
  return public._community_card(c) || jsonb_build_object(
    'is_organizer', v_org,
    'organizers', case when v_org then coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name))
        from profiles p where p.id = any (c.organizer_ids)), '[]'::jsonb) else null end,
    'upcoming', coalesce((select jsonb_agg(public._meetup_card(m) order by m.starts_at)
        from meetups m where m.community_id = c.id and public._meetup_end(m) >= now()
          and (not m.cancelled or v_org)), '[]'::jsonb),
    'past', coalesce((select jsonb_agg(x.card order by x.starts_at desc) from (
        select public._meetup_card(m) card, m.starts_at from meetups m
        where m.community_id = c.id and public._meetup_end(m) < now() and not m.cancelled
        order by m.starts_at desc limit 12) x), '[]'::jsonb));
end $$;

-- Organizatörün kendi toplulukları (onay bekleyenler dahil); yöneticiye ayrıca onay bekleyenler
create or replace function public.my_communities()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me profiles := public._require_user();
begin
  return jsonb_build_object(
    'mine', coalesce((select jsonb_agg(public._community_card(c) order by c.created_at desc)
                      from communities c where me.id = any (c.organizer_ids)), '[]'::jsonb),
    'pending', case when public.is_admin() then coalesce((
        select jsonb_agg(public._community_card(c) || jsonb_build_object(
                 'created_by', (select jsonb_build_object('username', p.username, 'display_name', p.display_name)
                                from profiles p where p.id = c.created_by))
               order by c.created_at)
        from communities c where not c.approved), '[]'::jsonb) else '[]'::jsonb end);
end $$;

-- Topluluk oluştur / güncelle. p: {id?, slug, name, country?, city?, languages[], description, links{x,telegram,website}}
create or replace function public.save_community(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me profiles := public._require_user();
  c communities;
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_slug text := lower(trim(coalesce(p ->> 'slug', '')));
  v_name text := regexp_replace(trim(coalesce(p ->> 'name', '')), '\s+', ' ', 'g');
  v_country text := nullif(upper(trim(coalesce(p ->> 'country', ''))), '');
  v_city text := nullif(trim(coalesce(p ->> 'city', '')), '');
  v_langs text[];
  v_links jsonb := '{}'::jsonb;
  v_desc jsonb := p -> 'description';
  k text;
begin
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) not between 3 and 48 then
    raise exception 'invalid_slug' using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 80 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then raise exception 'invalid_country' using errcode = '22023'; end if;
  if char_length(v_city) > 80 then raise exception 'invalid_city' using errcode = '22023'; end if;
  select coalesce(array_agg(distinct l), '{}') into v_langs
  from jsonb_array_elements_text(coalesce(p -> 'languages', '[]'::jsonb)) l;
  if cardinality(v_langs) > 8 or exists (select 1 from unnest(v_langs) l where l !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  if v_desc is not null and jsonb_typeof(v_desc) = 'null' then v_desc := null; end if;
  if v_desc is not null and (jsonb_typeof(v_desc) not in ('string', 'object') or char_length(v_desc::text) > 6000) then
    raise exception 'invalid_description' using errcode = '22023';
  end if;
  foreach k in array array['x', 'telegram', 'website'] loop
    if nullif(trim(coalesce(p -> 'links' ->> k, '')), '') is not null then
      if not public._valid_url(trim(p -> 'links' ->> k)) then raise exception 'invalid_link' using errcode = '22023'; end if;
      v_links := v_links || jsonb_build_object(k, trim(p -> 'links' ->> k));
    end if;
  end loop;

  if v_id is null then
    if not public.is_creator() then raise exception 'organizer_required' using errcode = '42501'; end if;
    if exists (select 1 from communities where slug = v_slug) then raise exception 'slug_taken' using errcode = '23505'; end if;
    insert into communities (slug, name, country, city, languages, description, links, organizer_ids, created_by,
                             approved, approved_at)
    values (v_slug, v_name, v_country, v_city, v_langs, v_desc, v_links, array[me.id], me.id,
            public.is_admin(), case when public.is_admin() then now() end)
    returning * into c;
  else
    select * into c from communities where id = v_id for update;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    if not public._is_community_organizer(c) then raise exception 'forbidden' using errcode = '42501'; end if;
    if exists (select 1 from communities where slug = v_slug and id <> v_id) then raise exception 'slug_taken' using errcode = '23505'; end if;
    update communities set slug = v_slug, name = v_name, country = v_country, city = v_city, languages = v_langs,
      description = v_desc, links = v_links, updated_at = now()
    where id = v_id returning * into c;
  end if;
  return jsonb_build_object('id', c.id, 'slug', c.slug, 'approved', c.approved);
end $$;

create or replace function public.set_community_approved(p_id uuid, p_approved boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  update communities set approved = p_approved, approved_at = case when p_approved then now() end, updated_at = now()
  where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

-- Organizatör ekle (kullanıcı adıyla) / çıkar. Son organizatör çıkarılamaz.
create or replace function public.add_community_organizer(p_id uuid, p_username text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles := public._require_user(); c communities; u profiles;
begin
  select * into c from communities where id = p_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not public._is_community_organizer(c) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into u from profiles where username = lower(trim(p_username)) and not banned and not is_guest;
  if not found then raise exception 'user_not_found' using errcode = 'P0002'; end if;
  if cardinality(c.organizer_ids) >= 12 then raise exception 'too_many_organizers' using errcode = '22023'; end if;
  update communities set organizer_ids = array_append(organizer_ids, u.id), updated_at = now()
  where id = p_id and not (u.id = any (organizer_ids));
end $$;

create or replace function public.remove_community_organizer(p_id uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles := public._require_user(); c communities;
begin
  select * into c from communities where id = p_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not public._is_community_organizer(c) then raise exception 'forbidden' using errcode = '42501'; end if;
  if cardinality(array_remove(c.organizer_ids, p_user)) = 0 then raise exception 'last_organizer' using errcode = '22023'; end if;
  update communities set organizer_ids = array_remove(organizer_ids, p_user), updated_at = now() where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- Buluşmalar
-- ---------------------------------------------------------------------
-- Yaklaşan buluşmalar (onaylı topluluklar, iptal edilmemiş, bitmemiş)
create or replace function public.list_meetups(p_country text default null, p_language text default null,
                                               p_community text default null, p_limit int default 50)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(x.card order by x.starts_at), '[]'::jsonb) from (
    select public._meetup_card(m) card, m.starts_at
    from meetups m join communities c on c.id = m.community_id
    where c.approved and not m.cancelled and public._meetup_end(m) >= now()
      and (p_country is null or coalesce(m.country, c.country) = upper(p_country))
      and (p_language is null or split_part(m.language, '-', 1) = split_part(p_language, '-', 1))
      and (p_community is null or c.slug = lower(p_community))
    order by m.starts_at
    limit least(greatest(coalesce(p_limit, 50), 1), 200)) x
$$;

create or replace function public.get_meetup(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m meetups; c communities; v_org boolean; q quizzes; r meetup_rsvps;
begin
  select * into m from meetups where id = p_id;
  if not found then return null; end if;
  select * into c from communities where id = m.community_id;
  v_org := public._is_community_organizer(c);
  if not c.approved and not v_org then return null; end if;
  select * into q from quizzes where id = m.quiz_id and status = 'published';
  select * into r from meetup_rsvps where meetup_id = m.id and user_id = auth.uid();
  return public._meetup_card(m) || jsonb_build_object(
    'description', m.description,
    'online_url', m.online_url,
    'room_code', m.room_code,
    'quiz', case when q.id is null then null else jsonb_build_object('slug', q.slug, 'title', q.title, 'icon', q.icon) end,
    'quiz_id', case when v_org then m.quiz_id end,
    'community', jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'country', c.country,
                                    'links', c.links, 'approved', c.approved),
    'is_organizer', v_org,
    'started', m.starts_at <= now(),
    'ended', public._meetup_end(m) < now(),
    'me', case when r.user_id is null then null else jsonb_build_object('going', true, 'attended', r.attended) end);
end $$;

-- p: {id?, community_id, title, description, language, starts_at, ends_at, timezone, city, country, lat, lng,
--     venue, online_url, quiz_slug, room_code}
create or replace function public.save_meetup(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me profiles := public._require_user();
  c communities; m meetups;
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_title text := regexp_replace(trim(coalesce(p ->> 'title', '')), '\s+', ' ', 'g');
  v_start timestamptz; v_end timestamptz;
  v_lang text := nullif(trim(coalesce(p ->> 'language', '')), '');
  v_country text := nullif(upper(trim(coalesce(p ->> 'country', ''))), '');
  v_lat double precision := nullif(p ->> 'lat', '')::double precision;
  v_lng double precision := nullif(p ->> 'lng', '')::double precision;
  v_url text := nullif(trim(coalesce(p ->> 'online_url', '')), '');
  v_code text := nullif(regexp_replace(coalesce(p ->> 'room_code', ''), '\D', '', 'g'), '');
  v_quiz uuid;
begin
  if v_id is not null then
    select * into m from meetups where id = v_id for update;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    select * into c from communities where id = m.community_id;
  else
    select * into c from communities where id = nullif(p ->> 'community_id', '')::uuid;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  end if;
  if not public._is_community_organizer(c) then raise exception 'forbidden' using errcode = '42501'; end if;

  if char_length(v_title) not between 3 and 120 then raise exception 'invalid_title' using errcode = '22023'; end if;
  begin
    v_start := (p ->> 'starts_at')::timestamptz;
    v_end := nullif(p ->> 'ends_at', '')::timestamptz;
  exception when others then raise exception 'invalid_time' using errcode = '22023';
  end;
  if v_start is null or (v_end is not null and v_end <= v_start) or v_end > v_start + interval '14 days' then
    raise exception 'invalid_time' using errcode = '22023';
  end if;
  if v_id is null and v_start < now() - interval '1 day' then raise exception 'invalid_time' using errcode = '22023'; end if;
  if v_lang is not null and v_lang !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then raise exception 'invalid_language' using errcode = '22023'; end if;
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then raise exception 'invalid_country' using errcode = '22023'; end if;
  if (v_lat is null) <> (v_lng is null) or v_lat not between -90 and 90 or v_lng not between -180 and 180 then
    raise exception 'invalid_location' using errcode = '22023';
  end if;
  if not public._valid_url(v_url) then raise exception 'invalid_link' using errcode = '22023'; end if;
  if v_code is not null and v_code !~ '^[0-9]{6}$' then raise exception 'invalid_code' using errcode = '22023'; end if;
  if nullif(trim(coalesce(p ->> 'quiz_slug', '')), '') is not null then
    select id into v_quiz from quizzes where slug = lower(trim(p ->> 'quiz_slug')) and status = 'published';
    if v_quiz is null then raise exception 'quiz_not_found' using errcode = 'P0002'; end if;
  end if;
  if coalesce(p ->> 'venue', '') = '' and v_url is null and coalesce(p ->> 'city', '') = '' then
    raise exception 'location_required' using errcode = '22023';
  end if;

  if v_id is null then
    insert into meetups (community_id, title, description, language, starts_at, ends_at, timezone, city, country,
                         lat, lng, venue, online_url, quiz_id, room_code, created_by)
    values (c.id, v_title, nullif(trim(coalesce(p ->> 'description', '')), ''), v_lang, v_start, v_end,
            coalesce(nullif(trim(p ->> 'timezone'), ''), 'UTC'), nullif(trim(coalesce(p ->> 'city', '')), ''), v_country,
            v_lat, v_lng, nullif(trim(coalesce(p ->> 'venue', '')), ''), v_url, v_quiz, v_code, me.id)
    returning * into m;
  else
    update meetups set title = v_title, description = nullif(trim(coalesce(p ->> 'description', '')), ''),
      language = v_lang, starts_at = v_start, ends_at = v_end,
      timezone = coalesce(nullif(trim(p ->> 'timezone'), ''), 'UTC'), city = nullif(trim(coalesce(p ->> 'city', '')), ''),
      country = v_country, lat = v_lat, lng = v_lng, venue = nullif(trim(coalesce(p ->> 'venue', '')), ''),
      online_url = v_url, quiz_id = v_quiz, room_code = v_code, updated_at = now()
    where id = v_id returning * into m;
  end if;
  return jsonb_build_object('id', m.id);
end $$;

create or replace function public.set_meetup_cancelled(p_id uuid, p_cancelled boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles := public._require_user(); c communities;
begin
  select c2.* into c from meetups m join communities c2 on c2.id = m.community_id where m.id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not public._is_community_organizer(c) then raise exception 'forbidden' using errcode = '42501'; end if;
  update meetups set cancelled = p_cancelled, updated_at = now() where id = p_id;
end $$;

-- "Katılacağım" — XP vermez. Dönüş: {going, going_count}
create or replace function public.rsvp_meetup(p_id uuid, p_going boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles := public._require_user(); m meetups; c communities;
begin
  select * into m from meetups where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into c from communities where id = m.community_id;
  if not c.approved then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_going then
    if m.cancelled then raise exception 'meetup_cancelled' using errcode = 'P0001'; end if;
    if public._meetup_end(m) < now() then raise exception 'meetup_ended' using errcode = 'P0001'; end if;
    insert into meetup_rsvps (meetup_id, user_id) values (p_id, me.id) on conflict do nothing;
  else
    -- Katılımı işaretlenmiş kayıt geri alınamaz (XP kaydıyla tutarlı kalsın)
    delete from meetup_rsvps where meetup_id = p_id and user_id = me.id and not attended;
  end if;
  return jsonb_build_object(
    'going', exists (select 1 from meetup_rsvps where meetup_id = p_id and user_id = me.id),
    'going_count', (select count(*) from meetup_rsvps where meetup_id = p_id));
end $$;

-- Yalnızca organizatör: katılım listesi (isimler)
create or replace function public.meetup_attendees(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare c communities;
begin
  select c2.* into c from meetups m join communities c2 on c2.id = m.community_id where m.id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not public._is_community_organizer(c) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', p.id, 'username', p.username,
                     'display_name', p.display_name, 'country', p.country, 'attended', r.attended,
                     'rsvp_at', r.created_at) order by r.created_at)
                   from meetup_rsvps r join profiles p on p.id = r.user_id where r.meetup_id = p_id), '[]'::jsonb);
end $$;

-- Organizatör katılımı işaretler. Başlangıçtan önce işaretlenemez; organizatör kendini işaretleyemez.
-- Onaylı toplulukta işaretlenen katılımcıya bir kez 'event_join' XP'si verilir; işaret kaldırılırsa XP geri alınır.
create or replace function public.mark_attendance(p_id uuid, p_user uuid, p_attended boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles := public._require_user(); m meetups; c communities; v_awarded int := 0;
begin
  select * into m from meetups where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into c from communities where id = m.community_id;
  if not public._is_community_organizer(c) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = me.id then raise exception 'cannot_mark_self' using errcode = '42501'; end if;
  if m.starts_at > now() then raise exception 'meetup_not_started' using errcode = 'P0001'; end if;
  if m.cancelled then raise exception 'meetup_cancelled' using errcode = 'P0001'; end if;
  update meetup_rsvps set attended = p_attended, attended_at = case when p_attended then now() end
  where meetup_id = p_id and user_id = p_user;
  if not found then raise exception 'not_rsvped' using errcode = 'P0002'; end if;
  if p_attended and c.approved then
    v_awarded := public._grant_xp(p_user, 'event_join', p_id::text);
  elsif not p_attended then
    perform public._revoke_xp(p_user, 'event_join', p_id::text);
  end if;
  return jsonb_build_object('attended', p_attended, 'awarded', v_awarded);
end $$;

-- Herkese açık profil için seviye (XP misafirler için gizli)
create or replace function public.get_public_progress(p_username text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select public._xp_progress(p.xp) from profiles p
  where p.username = lower(p_username) and not p.banned and not p.is_guest
$$;

-- ---------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------
revoke all on function
  public._is_community_organizer(public.communities), public._valid_url(text), public._meetup_end(public.meetups),
  public._community_card(public.communities), public._meetup_card(public.meetups),
  public._grant_xp(uuid, text, text), public._revoke_xp(uuid, text, text),
  public.list_communities(text, text), public.get_community(text), public.my_communities(),
  public.save_community(jsonb), public.set_community_approved(uuid, boolean),
  public.add_community_organizer(uuid, text), public.remove_community_organizer(uuid, uuid),
  public.list_meetups(text, text, text, int), public.get_meetup(uuid), public.save_meetup(jsonb),
  public.set_meetup_cancelled(uuid, boolean), public.rsvp_meetup(uuid, boolean),
  public.meetup_attendees(uuid), public.mark_attendance(uuid, uuid, boolean), public.get_public_progress(text)
from public, anon, authenticated;

grant execute on function
  public.list_communities(text, text), public.get_community(text), public.list_meetups(text, text, text, int),
  public.get_meetup(uuid), public.get_public_progress(text)
to anon, authenticated;

grant execute on function
  public.my_communities(), public.save_community(jsonb), public.set_community_approved(uuid, boolean),
  public.add_community_organizer(uuid, text), public.remove_community_organizer(uuid, uuid),
  public.save_meetup(jsonb), public.set_meetup_cancelled(uuid, boolean), public.rsvp_meetup(uuid, boolean),
  public.meetup_attendees(uuid), public.mark_attendance(uuid, uuid, boolean)
to authenticated;
