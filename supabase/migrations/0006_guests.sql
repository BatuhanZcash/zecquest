-- =====================================================================
-- 0006 — Misafir (anonim) giriş
-- Supabase "anonymous sign-in" ile hesap açmadan, sadece takma adla
-- ANLIK ODALARA katılma. Kurallar:
--   * Misafirler planlı (ödüllü) yarışmalara, solo moda ve stüdyoya giremez.
--   * Misafir puanı genel liderlik tablosunda görünmez, ödül hakkı doğmaz.
--   * Misafir e-postasını doğrulayıp hesap açarsa aynı kullanıcı kalır;
--     is_guest kapanır ve geçmiş puanları otomatik olarak sayılmaya başlar.
-- =====================================================================

alter table public.profiles add column if not exists is_guest boolean not null default false;

-- Yeni kullanıcı: anonimse misafir olarak işaretle (ad, guest_start ile verilir)
create or replace function public._handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare anon boolean := coalesce((to_jsonb(new) ->> 'is_anonymous')::boolean, false);
begin
  insert into profiles (id, display_name, is_guest)
  values (
    new.id,
    case when anon then null else left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'player'), '@', 1)
    ), 32) end,
    anon
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Misafir e-postasını doğrulayıp kalıcı hesaba dönünce misafirlik kalkar
create or replace function public._handle_user_upgraded()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce((to_jsonb(old) ->> 'is_anonymous')::boolean, false)
     and not coalesce((to_jsonb(new) ->> 'is_anonymous')::boolean, false) then
    update profiles set is_guest = false where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_upgraded on auth.users;
create trigger on_auth_user_upgraded
  after update on auth.users
  for each row execute function public._handle_user_upgraded();

-- Hesap gerektiren tüm işlemler misafiri reddeder
create or replace function public._require_user()
returns public.profiles language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p profiles;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select * into p from profiles where id = auth.uid();
  if found and p.is_guest then raise exception 'account_required' using errcode = 'P0001'; end if;
  if not found or p.username is null then raise exception 'profile_incomplete' using errcode = 'P0001'; end if;
  if p.banned then raise exception 'banned' using errcode = '42501'; end if;
  return p;
end $$;

-- Oyuna katılma ve cevap verme: hesaplı oyuncu ya da adı olan misafir
create or replace function public._require_player()
returns public.profiles language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p profiles;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select * into p from profiles where id = auth.uid();
  if not found then raise exception 'profile_incomplete' using errcode = 'P0001'; end if;
  if p.banned then raise exception 'banned' using errcode = '42501'; end if;
  if p.is_guest then
    if p.display_name is null then raise exception 'guest_name_required' using errcode = 'P0001'; end if;
    return p;
  end if;
  if p.username is null then raise exception 'profile_incomplete' using errcode = 'P0001'; end if;
  return p;
end $$;

-- Misafir takma adını ayarlar (2–24 karakter)
create or replace function public.guest_start(p_name text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and is_guest) then raise exception 'not_guest'; end if;
  if char_length(nm) < 2 or char_length(nm) > 24 then raise exception 'invalid_guest_name'; end if;
  update profiles set display_name = nm where id = auth.uid();
  return get_my_profile();
end $$;

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
    'created_at', p.created_at, 'is_guest', p.is_guest
  );
end $$;

create or replace function public._user_totals(p_since timestamptz, p_quiz uuid)
returns table (user_id uuid, score bigint, games bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with ev as (
    select * from score_events s
    where (p_since is null or s.created_at >= p_since)
      -- Misafir puanları genel tabloya yazılmaz; hesap açınca otomatik sayılır
      and not exists (select 1 from profiles g where g.id = s.user_id and g.is_guest)
      and (p_quiz is null or s.quiz_id = p_quiz)
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
      from (select gp.user_id, row_number() over (order by gp.score desc, gp.joined_at) rn
              from game_players gp join profiles pr on pr.id = gp.user_id
             where gp.game_id = p_game and not gp.kicked and gp.score > 0 and not pr.is_guest) t
      left join user_private up on up.user_id = t.user_id
     where t.rn <= g.prize_places
    on conflict do nothing;
  end if;
end $$;

create or replace function public.join_game(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; g games; pl game_players;
begin
  me := _require_player();
  select * into g from games
   where code = p_code and status not in ('ended', 'cancelled')
   order by created_at desc limit 1;
  if not found then raise exception 'game_not_found'; end if;
  -- Misafirler yalnızca anlık (sunucu yönetimli) odalara katılabilir
  if me.is_guest and g.mode <> 'hosted' then raise exception 'guest_not_allowed'; end if;
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

create or replace function public.submit_answer(p_game_id uuid, p_q int, p_choice int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; g games; q game_questions; el int; n_ans int; n_pl int; inserted boolean;
begin
  me := _require_player();
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

create or replace function public.update_my_profile(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uname text; addr text;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  if exists (select 1 from profiles where id = auth.uid() and is_guest) then raise exception 'account_required'; end if;
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

revoke execute on function public._require_player(), public._handle_user_upgraded() from public, anon, authenticated;
grant execute on function public.guest_start(text) to authenticated;
grant execute on function public.get_my_profile() to anon, authenticated;
grant execute on function public.join_game(text), public.submit_answer(uuid, int, int) to authenticated;
