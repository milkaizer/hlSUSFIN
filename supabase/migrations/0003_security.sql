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
--    정의는 아래 5) 에 있음 (모의고사 마지막 응시 조건까지 포함)

-- ---------------------------------------------------------------
-- 수강신청: 과목마다 확인 중인 신청은 하나만 (관리자 목록 도배 방지)
-- ---------------------------------------------------------------
-- 이미 운영 중인 DB 에 같은 과목 확인 중 신청이 2개 이상 있으면 아래 인덱스 생성이 실패한다.
-- 그때는 중복 신청을 먼저 반려(reject_request)하고 다시 실행한다
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

-- ---------------------------------------------------------------
-- P8 재점검 반영
-- ---------------------------------------------------------------
-- 5) 응시 횟수가 여러 번인 모의고사는 마지막 응시를 마칠 때까지 정답·해설을 숨긴다 (P8-1)
--    1회차를 빈 답으로 내고 정답을 본 뒤 2회차를 만점 받는 것을 막는다
create or replace function public.attempt_result(p_attempt uuid)
returns table (question_id uuid, type text, prompt text, choices jsonb, points int, response jsonb,
               is_correct boolean, points_awarded numeric, answer jsonb, explanation text)
language plpgsql stable security definer set search_path = public as $$
declare a attempts; q quizzes; v_show boolean; v_used int; v_open boolean;
begin
  select * into a from attempts where id = p_attempt;
  if not found or not (a.user_id = auth.uid() or is_admin()) then raise exception 'forbidden'; end if;
  if a.status = 'in_progress' then raise exception 'not submitted'; end if;
  select * into q from quizzes where id = a.quiz_id;
  if is_admin() then
    v_show := true;
  else
    select count(*), bool_or(status = 'in_progress') into v_used, v_open
      from attempts where quiz_id = q.id and user_id = a.user_id;
    v_show := has_access(q.category, q.min_tier)
      and not coalesce(v_open, false)
      and (q.kind = 'practice' or q.max_attempts is null or v_used >= q.max_attempts);
  end if;
  return query
    select qs.id, qs.type, qs.prompt, qs.choices, qs.points, aa.response, aa.is_correct, aa.points_awarded,
           case when v_show then qs.answer else null end,
           case when v_show then qs.explanation else null end
    from questions qs
    join attempt_answers aa on aa.question_id = qs.id and aa.attempt_id = p_attempt
    where qs.quiz_id = a.quiz_id order by qs.sort, qs.id;
end $$;

-- 6) 지금 권한이 없는 응시는 응답을 무시하고 마감 (P8-8)
create or replace function public.submit_attempt(p_attempt uuid, p_responses jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a attempts; q quizzes; qs record; v_resp jsonb; v_correct boolean; v_pts numeric;
        v_score numeric := 0; v_max numeric := 0; v_essay boolean := false; v_late boolean;
begin
  select * into a from attempts where id = p_attempt and user_id = auth.uid() for update;
  if not found then raise exception 'forbidden'; end if;
  if a.status <> 'in_progress' then raise exception 'already submitted'; end if;
  select * into q from quizzes where id = a.quiz_id;
  -- 마감 + 2분이 지났거나 지금 권한이 없으면 응답을 무시하고 마감 처리 (P8-8)
  v_late := (a.deadline_at is not null and now() > a.deadline_at + interval '2 minutes')
            or not has_access(q.category, q.min_tier);

  for qs in select * from questions where quiz_id = a.quiz_id loop
    v_resp := case when v_late then null else p_responses -> qs.id::text end;
    v_max := v_max + qs.points;
    v_correct := null; v_pts := null;
    if qs.type = 'mcq_single' then
      v_correct := v_resp is not null and v_resp = qs.answer;
    elsif qs.type = 'mcq_multi' then
      v_correct := v_resp is not null and jsonb_typeof(v_resp) = 'array'
        and (select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(v_resp) x)
          = (select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(qs.answer) x);
    elsif qs.type = 'short_text' then
      v_correct := v_resp is not null and exists (
        select 1 from jsonb_array_elements_text(qs.answer) ans
        where normalize_text(ans) = normalize_text(v_resp #>> '{}'));
    else
      v_essay := true;
    end if;
    if v_correct is not null then
      v_pts := case when v_correct then qs.points else 0 end;
      v_score := v_score + v_pts;
    end if;
    insert into attempt_answers (attempt_id, question_id, response, is_correct, points_awarded)
    values (p_attempt, qs.id, v_resp, v_correct, v_pts)
    on conflict (attempt_id, question_id) do update set response = excluded.response,
      is_correct = excluded.is_correct, points_awarded = excluded.points_awarded;
  end loop;

  update attempts set submitted_at = now(), score = v_score, max_score = v_max,
    status = case when v_essay then 'needs_grading' else 'graded' end
  where id = p_attempt;
end $$;

-- 7) 차단·승인 대기 회원은 회화콜 크레딧 0 (P8-5). 웹훅이 over_limit 으로 표시한다
create or replace function public.call_credits_for(p_user uuid, p_category text, p_at timestamptz default now())
returns int language sql stable security definer set search_path = public as $$
  select case when not exists (select 1 from profiles where id = p_user and status = 'approved') then 0 else
  greatest(0,
    coalesce((select max(t.monthly_call_credits) from entitlements e join tiers t on t.slug = e.tier
              where e.user_id = p_user and e.category = p_category and p_at >= e.starts_at and p_at < e.expires_at), 0)
    + coalesce((select sum(delta) from credit_adjustments
              where user_id = p_user and category = p_category and month = seoul_month(p_at)), 0)
    - (select count(*) from call_bookings
              where user_id = p_user and category = p_category and status = 'accepted'
                and seoul_month(starts_at) = seoul_month(p_at)))::int end;
$$;
revoke execute on function public.call_credits_for(uuid, text, timestamptz) from authenticated, anon, public;
grant execute on function public.call_credits_for(uuid, text, timestamptz) to service_role;
