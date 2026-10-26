-- =====================================================================
-- 0005 — Quiz kapak fotoğrafları
-- Her quize özel kapak görseli. Dosyalar Supabase Storage'daki herkese açık
-- "quiz-covers" kovasında tutulur; yalnızca içerik üreticileri yükleyebilir.
-- =====================================================================

alter table public.quizzes add column if not exists cover_url text;

-- Yalnızca bu projenin quiz-covers kovasındaki dosyalara izin verilir (dış linkler reddedilir)
create or replace function public._valid_cover_url(p text)
returns boolean language sql immutable set search_path = public, pg_temp as $$
  select p is not null and char_length(p) <= 500
     and p ~ '^https?://[^\s"''<>]+/storage/v1/object/public/quiz-covers/[A-Za-z0-9/_.-]+$'
$$;

create or replace function public._quiz_card(q quizzes)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', q.id, 'slug', q.slug, 'title', q.title, 'description', q.description,
    'icon', q.icon, 'cover_url', q.cover_url, 'tags', to_jsonb(q.tags), 'featured', q.featured,
    'status', q.status, 'question_count', q.question_count, 'default_time', _answer_secs(),
    'plays', (select count(*) from score_events e where e.quiz_id = q.id),
    'author', (select jsonb_build_object('username', a.username, 'display_name', a.display_name)
               from profiles a where a.id = q.author_id),
    'updated_at', q.updated_at
  )
$$;

create or replace function public.save_quiz(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me profiles; q quizzes; qid uuid; qs jsonb; item jsonb; i int := 0; n_opts int; c int;
  v_slug text; v_title jsonb; v_cover text;
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
  v_cover := nullif(trim(p ->> 'cover_url'), '');
  if v_cover is not null and not _valid_cover_url(v_cover) then raise exception 'invalid_cover'; end if;
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
      cover_url = v_cover,
      tags = coalesce(array(select left(jsonb_array_elements_text(coalesce(p -> 'tags', '[]'::jsonb)), 24) limit 6), '{}'),
      default_time = least(120, greatest(5, coalesce((p ->> 'default_time')::int, 20))),
      -- Üretici yayındaki quizini düzenlerse yeniden incelemeye düşer; yönetici düzenlemesi durumu korur
      status = case when is_admin() then status else 'draft' end,
      updated_at = now()
    where id = q.id;
    qid := q.id;
  else
    if exists (select 1 from quizzes where slug = v_slug) then raise exception 'slug_taken'; end if;
    insert into quizzes (slug, title, description, icon, cover_url, tags, default_time, author_id, status)
    values (
      v_slug, v_title, p -> 'description', coalesce(nullif(p ->> 'icon', ''), 'shield'), v_cover,
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

-- Storage kovası ve izinler (Supabase dışındaki test ortamında atlanır)
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage şeması yok, kova adımı atlandı';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('quiz-covers', 'quiz-covers', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "quiz_covers_insert" on storage.objects;
  drop policy if exists "quiz_covers_update" on storage.objects;
  drop policy if exists "quiz_covers_delete" on storage.objects;

  -- Üreticiler yalnızca kendi klasörlerine (<kullanıcı id>/...) yükler
  create policy "quiz_covers_insert" on storage.objects for insert to authenticated
    with check (bucket_id = 'quiz-covers' and public.is_creator()
                and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "quiz_covers_update" on storage.objects for update to authenticated
    using (bucket_id = 'quiz-covers' and owner_id = auth.uid()::text);
  create policy "quiz_covers_delete" on storage.objects for delete to authenticated
    using (bucket_id = 'quiz-covers' and (owner_id = auth.uid()::text or public.is_admin()));
end $$;

-- Politikalar is_creator / is_admin'i çağırdığı için giriş yapmış kullanıcıya açılır
grant execute on function public.is_creator(), public.is_admin() to authenticated;
grant execute on function public.save_quiz(jsonb) to authenticated;
