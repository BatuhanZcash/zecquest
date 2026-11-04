-- =====================================================================
-- 0007 — Tek dilli quizler
-- Organizatör quizini dünyadaki herhangi bir dilde (tek dil) hazırlayabilir.
-- quizzes.language: BCP-47 dil kodu. null = eski iki dilli (Türkçe + İngilizce) quiz.
-- Tek dilli quizlerde metinler düz string olarak saklanır.
-- =====================================================================

alter table public.quizzes add column if not exists language text
  check (language is null or language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$');
create index if not exists quizzes_language_idx on public.quizzes (language);

create or replace function public._quiz_card(q quizzes)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', q.id, 'slug', q.slug, 'title', q.title, 'description', q.description,
    'icon', q.icon, 'cover_url', q.cover_url, 'language', q.language,
    'tags', to_jsonb(q.tags), 'featured', q.featured,
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
  v_slug text; v_title jsonb; v_cover text; v_lang text;
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
  -- Quiz dili: tek dilli quizlerde dil kodu (en, es, hi, yo, pt-BR…); null = Türkçe + İngilizce iki dilli
  v_lang := nullif(trim(p ->> 'language'), '');
  if v_lang is not null and v_lang !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$' then raise exception 'invalid_language'; end if;
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
      language = v_lang,
      tags = coalesce(array(select left(jsonb_array_elements_text(coalesce(p -> 'tags', '[]'::jsonb)), 24) limit 6), '{}'),
      default_time = least(120, greatest(5, coalesce((p ->> 'default_time')::int, 20))),
      -- Üretici yayındaki quizini düzenlerse yeniden incelemeye düşer; yönetici düzenlemesi durumu korur
      status = case when is_admin() then status else 'draft' end,
      updated_at = now()
    where id = q.id;
    qid := q.id;
  else
    if exists (select 1 from quizzes where slug = v_slug) then raise exception 'slug_taken'; end if;
    insert into quizzes (slug, title, description, icon, cover_url, language, tags, default_time, author_id, status)
    values (
      v_slug, v_title, p -> 'description', coalesce(nullif(p ->> 'icon', ''), 'shield'), v_cover, v_lang,
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

-- Keşfet: dil filtresi. İki dilli (eski) quizler hem 'tr' hem 'en' filtresinde görünür
drop function if exists public.list_quizzes(text, text, text, int, int);
create or replace function public.list_quizzes(
  p_search text default null, p_tag text default null, p_sort text default 'featured',
  p_limit int default 48, p_offset int default 0, p_language text default null)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(_quiz_card(q) order by
      case when p_sort = 'featured' then (not q.featured)::int end,
      case when p_sort = 'new' or p_sort = 'featured' then q.published_at end desc nulls last,
      case when p_sort = 'az' then lower(coalesce(q.title ->> 'en', q.title ->> 'tr', q.title #>> '{}')) end,
      case when p_sort = 'questions' then q.question_count end desc
    ), '[]'::jsonb)
  from (
    select * from quizzes q
    where q.status = 'published'
      and (p_tag is null or p_tag = any (q.tags))
      and (p_language is null or p_language = ''
           or split_part(q.language, '-', 1) = p_language
           or (q.language is null and p_language in ('tr', 'en')))
      and (p_search is null or p_search = '' or
           (q.title::text || ' ' || coalesce(q.description::text, '') || ' ' || array_to_string(q.tags, ' '))
             ilike '%' || p_search || '%')
    order by q.featured desc, q.published_at desc nulls last
    limit least(p_limit, 100) offset greatest(p_offset, 0)
  ) q
$$;

-- Keşfet'teki dil seçici için: yayındaki quizlerin dilleri ve sayıları
create or replace function public.list_quiz_languages()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', l, 'count', n) order by n desc, l), '[]'::jsonb) from (
    select l, count(*) n from (
      select unnest(case when language is null then array['tr', 'en'] else array[split_part(language, '-', 1)] end) l
      from quizzes where status = 'published'
    ) x group by l
  ) y
$$;

revoke execute on function public._quiz_card(quizzes) from public, anon, authenticated;
revoke execute on function public.list_quizzes(text, text, text, int, int, text), public.list_quiz_languages() from public;
grant execute on function public.list_quizzes(text, text, text, int, int, text), public.list_quiz_languages() to anon, authenticated;
grant execute on function public.save_quiz(jsonb) to authenticated;
