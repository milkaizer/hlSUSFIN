-- 관리자 쓰기 보강 (P5, P6)
-- questions 는 정답 보호 때문에 select 권한이 없다. PostgREST 의 update/delete 는 WHERE 절 때문에
-- select 권한과 select 정책이 필요하므로, 관리자 문항 편집은 함수로만 한다.
-- live_sessions.meet_url 은 컬럼 권한에서 빠져 있어 관리자 화면 조회도 함수로 한다.

create or replace function public.admin_save_question(
  p_id uuid, p_quiz uuid, p_type text, p_prompt text, p_choices jsonb, p_answer jsonb,
  p_explanation text, p_points int, p_sort int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_id is null then
    insert into questions (quiz_id, type, prompt, choices, answer, explanation, points, sort)
    values (p_quiz, p_type, p_prompt, coalesce(p_choices, '[]'::jsonb), coalesce(p_answer, 'null'::jsonb), p_explanation, p_points, coalesce(p_sort, 0))
    returning id into v_id;
  else
    update questions set type = p_type, prompt = p_prompt, choices = coalesce(p_choices, '[]'::jsonb),
      answer = coalesce(p_answer, 'null'::jsonb), explanation = p_explanation, points = p_points, sort = coalesce(p_sort, 0)
    where id = p_id and quiz_id = p_quiz
    returning id into v_id;
    if v_id is null then raise exception 'not found'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.admin_delete_question(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  delete from questions where id = p_id;
end $$;

create or replace function public.admin_live_sessions(p_from timestamptz default now() - interval '7 days')
returns setof live_sessions
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query select * from live_sessions where starts_at >= p_from order by starts_at;
end $$;

revoke execute on function public.admin_save_question(uuid, uuid, text, text, jsonb, jsonb, text, int, int) from public, anon;
revoke execute on function public.admin_delete_question(uuid) from public, anon;
revoke execute on function public.admin_live_sessions(timestamptz) from public, anon;
grant execute on function public.admin_save_question(uuid, uuid, text, text, jsonb, jsonb, text, int, int) to authenticated, service_role;
grant execute on function public.admin_delete_question(uuid) to authenticated, service_role;
grant execute on function public.admin_live_sessions(timestamptz) to authenticated, service_role;
