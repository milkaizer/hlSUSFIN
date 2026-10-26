-- 보안 보강 (P9 보안 리뷰, P3~P7 검증 결과). 0001, 0002 다음에 실행
-- logs/build/p9-security.md, logs/build/p3-p7-verify.md 참고

-- ---------------------------------------------------------------
-- 게시판
-- ---------------------------------------------------------------
-- 1) 학생이 자기 질문을 공지로 바꾸거나(kind, category) 작성 시각을 조작하지 못하게 컬럼 권한을 좁힌다
revoke insert, update on public.board_posts from authenticated;
grant insert (id, kind, category, author_id, title, body, is_private) on public.board_posts to authenticated;
grant update (title, body, is_private) on public.board_posts to authenticated;
revoke insert, update on public.board_comments from authenticated;
grant insert (id, post_id, author_id, body, is_instructor) on public.board_comments to authenticated;

-- 2) 읽기 정책을 행 자체의 값으로 판단한다
--    can_read_post(id) 는 board_posts 를 다시 조회하므로 INSERT ... RETURNING 에서 새 행을 보지 못해 실패했다
--    작성자는 권한이 끝나도 자기 질문을 볼 수 있다
create or replace function public.can_read_post(p_post uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from board_posts b
    where b.id = p_post
      and (
        b.kind = 'notice'
        or is_admin()
        or b.author_id = auth.uid()
        or (has_access(b.category) and not b.is_private)
      )
  );
$$;

drop policy if exists posts_read on public.board_posts;
create policy posts_read on public.board_posts for select using (
  kind = 'notice'
  or is_admin()
  or author_id = auth.uid()
  or (has_access(category) and not is_private)
);

drop policy if exists posts_update on public.board_posts;
create policy posts_update on public.board_posts for update
  using (author_id = auth.uid() or is_admin())
  with check ((author_id = auth.uid() and kind = 'question') or is_admin());

-- ---------------------------------------------------------------
-- 문제
-- ---------------------------------------------------------------
-- 3) 응시 시작을 사용자+퀴즈 단위로 직렬화 (동시 호출로 max_attempts 우회 방지)
create or replace function public.start_attempt(p_quiz uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare q quizzes; v_count int; v_id uuid; v_open uuid;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  perform pg_advisory_xact_lock(hashtext('start_attempt'), hashtext(auth.uid()::text || ':' || p_quiz::text));
  select * into q from quizzes where id = p_quiz and published;
  if not found or not has_access(q.category, q.min_tier) then raise exception 'forbidden'; end if;
  select id into v_open from attempts
   where quiz_id = p_quiz and user_id = auth.uid() and status = 'in_progress'
     and (deadline_at is null or now() < deadline_at + interval '2 minutes')
   order by started_at desc limit 1;
  if v_open is not null then return v_open; end if;
  select count(*) into v_count from attempts where quiz_id = p_quiz and user_id = auth.uid();
  if q.max_attempts is not null and v_count >= q.max_attempts then raise exception 'max attempts reached'; end if;
  insert into attempts (quiz_id, user_id, deadline_at)
  values (p_quiz, auth.uid(), case when q.time_limit_min is null then null else now() + make_interval(mins => q.time_limit_min) end)
  returning id into v_id;
  return v_id;
end $$;

-- 4) 결과 조회: 응시 때 실제로 받은 문항만, 정답·해설은 지금도 권한이 있을 때만 (관리자는 항상)
--    응시 후에 추가된 문항이나 권한이 끝난 뒤의 정답이 새지 않게 한다
create or replace function public.attempt_result(p_attempt uuid)
returns table (question_id uuid, type text, prompt text, choices jsonb, points int, response jsonb,
               is_correct boolean, points_awarded numeric, answer jsonb, explanation text)
language plpgsql stable security definer set search_path = public as $$
declare a attempts; q quizzes; v_show boolean;
begin
  select * into a from attempts where id = p_attempt;
  if not found or not (a.user_id = auth.uid() or is_admin()) then raise exception 'forbidden'; end if;
  if a.status = 'in_progress' then raise exception 'not submitted'; end if;
  select * into q from quizzes where id = a.quiz_id;
  v_show := is_admin() or has_access(q.category, q.min_tier);
  return query
    select qs.id, qs.type, qs.prompt, qs.choices, qs.points, aa.response, aa.is_correct, aa.points_awarded,
           case when v_show then qs.answer else null end,
           case when v_show then qs.explanation else null end
    from questions qs
    join attempt_answers aa on aa.question_id = qs.id and aa.attempt_id = p_attempt
    where qs.quiz_id = a.quiz_id order by qs.sort, qs.id;
end $$;

-- ---------------------------------------------------------------
-- 수강신청: 과목마다 확인 중인 신청은 하나만 (관리자 목록 도배 방지)
-- ---------------------------------------------------------------
create unique index if not exists enrollment_requests_one_pending
  on public.enrollment_requests (user_id, category) where status = 'pending';

-- ---------------------------------------------------------------
-- 가입: 이름 길이 제한 (update_my_profile 과 같게)
-- ---------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name)
  values (new.id, left(coalesce(new.email, ''), 320),
          left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), 100))
  on conflict (id) do nothing;
  return new;
end $$;

-- 트리거 함수는 직접 호출할 일이 없다
revoke execute on function public.handle_new_user() from authenticated, anon, public;
revoke execute on function public.set_instructor_flag() from authenticated, anon, public;
