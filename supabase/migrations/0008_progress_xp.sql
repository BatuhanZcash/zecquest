-- 0008: Tek profil ilerleme sistemi (XP).
-- Gündem, Öğren, Oyna ve Topluluk bölümleri aynı XP'yi besler.
-- XP miktarı istemciden gelmez; kaynak türüne göre sunucuda belirlenir.
-- Aynı (kullanıcı, kaynak, ref) için XP yalnızca bir kez verilir.

create table if not exists public.xp_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null,
  ref text not null,
  amount int not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, source, ref)
);
create index if not exists xp_events_user_idx on public.xp_events (user_id, created_at desc);
alter table public.xp_events enable row level security;
revoke all on public.xp_events from anon, authenticated;

alter table public.profiles add column if not exists xp int not null default 0;

-- Kaynak türü → XP. Yeni bir tür eklemek için bu fonksiyonu güncelleyin.
create or replace function public._xp_amount(p_source text) returns int
language sql immutable as $$
  select case p_source
    when 'lesson'      then 20   -- bir dersi bitirmek          (ref: ders slug)
    when 'lesson_quiz' then 30   -- ders sonu quizini geçmek    (ref: ders slug)
    when 'glossary'    then 2    -- sözlükte terim okumak       (ref: terim slug)
    when 'news_read'   then 5    -- günün gündemini okumak      (ref: YYYY-MM-DD)
    when 'game_level'  then 50   -- oyun bölümü bitirmek        (ref: oyun:bölüm, ör. zeki:1)
    when 'game_stars'  then 25   -- bölümdeki tüm paraları toplamak (ref: oyun:bölüm)
    when 'event_join'  then 15   -- topluluk etkinliğine katılım (ref: etkinlik id)
    else null
  end
$$;

-- Seviye eğrisi: 1, 50, 200, 450, 800 ... XP (seviye n için 50·(n-1)²)
create or replace function public._xp_level(p_xp int) returns int
language sql immutable as $$ select floor(sqrt(greatest(p_xp, 0) / 50.0))::int + 1 $$;

create or replace function public._xp_progress(p_xp int) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'xp', p_xp,
    'level', public._xp_level(p_xp),
    'level_floor', 50 * power(public._xp_level(p_xp) - 1, 2)::int,
    'next_level_at', 50 * power(public._xp_level(p_xp), 2)::int)
$$;

-- XP ver. Dönüş: { awarded: int (0 = daha önce verilmiş), xp, level, level_floor, next_level_at }
create or replace function public.award_xp(p_source text, p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_amt int := public._xp_amount(p_source);
  v_ins int := 0;
  v_xp int;
begin
  if v_uid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  if v_amt is null then raise exception 'invalid_source' using errcode = '22023'; end if;
  if p_ref is null or length(trim(p_ref)) = 0 or length(p_ref) > 120 then
    raise exception 'invalid_ref' using errcode = '22023';
  end if;
  insert into xp_events (user_id, source, ref, amount)
  values (v_uid, p_source, trim(p_ref), v_amt)
  on conflict (user_id, source, ref) do nothing;
  get diagnostics v_ins = row_count;
  if v_ins > 0 then
    update profiles set xp = xp + v_amt where id = v_uid returning xp into v_xp;
  else
    select xp into v_xp from profiles where id = v_uid;
  end if;
  return public._xp_progress(coalesce(v_xp, 0)) || jsonb_build_object('awarded', case when v_ins > 0 then v_amt else 0 end);
end $$;

-- Kendi ilerlemem: seviye + hangi kaynakları tamamladığım (ders/oyun ilerlemesini göstermek için)
create or replace function public.get_my_progress() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_xp int;
begin
  if v_uid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select xp into v_xp from profiles where id = v_uid;
  return public._xp_progress(coalesce(v_xp, 0)) || jsonb_build_object(
    'done', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'ref', ref) order by created_at)
                      from xp_events where user_id = v_uid), '[]'::jsonb));
end $$;

-- Herkese açık XP sıralaması (misafirler hariç)
create or replace function public.xp_leaderboard(p_limit int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by (r->>'xp')::int desc), '[]'::jsonb) from (
    select jsonb_build_object('id', id, 'display_name', display_name, 'username', username,
                              'country', country, 'xp', xp, 'level', public._xp_level(xp)) r
    from profiles where xp > 0 and not is_guest
    order by xp desc limit least(greatest(p_limit, 1), 100)) s
$$;

revoke all on function public._xp_amount(text), public._xp_level(int), public._xp_progress(int) from public, anon, authenticated;
revoke all on function public.award_xp(text, text), public.get_my_progress() from public, anon;
grant execute on function public.award_xp(text, text), public.get_my_progress() to authenticated;
grant execute on function public.xp_leaderboard(int) to anon, authenticated;
