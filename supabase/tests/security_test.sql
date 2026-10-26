-- 0003_security.sql 확인. app_test.sql 다음에 같은 DB 에서 실행
\set ON_ERROR_STOP on
select coalesce(max(id), 0) as start_id from t.results \gset

-- 오류면 -1, 아니면 적용된 행 수
create function t.try_affected(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
exception when others then
  return -1;
end $$;
grant execute on function t.try_affected(text) to anon, authenticated, service_role;

set role authenticated;

-- ===== 게시판 =====
select t.as('00000000-0000-0000-0000-000000000003');
select t.check('보안 P7 학생 질문 insert returning id 성공',
  t.try_affected($$insert into public.board_posts (kind, category, author_id, title, body)
     values ('question', 'es-conversation', auth.uid(), '반환 테스트', 'b') returning id$$) = 1);
select t.expect_error('보안 P9-1 학생이 자기 질문을 공지로 변경 거부',
  $$update public.board_posts set kind = 'notice', category = null where title = '반환 테스트'$$);
select t.expect_error('보안 P9-1 작성 시각 조작 거부',
  $$update public.board_posts set created_at = now() + interval '1 year' where title = '반환 테스트'$$);
select t.expect_error('보안 P9-1 insert 시 created_at 지정 거부',
  $$insert into public.board_posts (kind, category, author_id, title, body, created_at) values ('question','es-conversation', auth.uid(), 'x','y', now() + interval '1 year')$$);
select t.check('보안 P7 본인 질문 제목 수정 1행', t.affected($$update public.board_posts set title = '반환 테스트 수정' where title = '반환 테스트'$$) = 1);
select t.expect_error('보안 P7 댓글 수정 거부', $$update public.board_comments set body = 'x'$$);
select t.as('00000000-0000-0000-0000-00000000000a');
select t.check('보안 P7 관리자 공지 insert returning id 성공',
  t.try_affected($$insert into public.board_posts (kind, author_id, title, body) values ('notice', auth.uid(), '공지 2', '내용') returning id$$) = 1);

-- 권한이 끝난 작성자는 자기 질문을 계속 볼 수 있다
reset role;
update public.entitlements set starts_at = now() - interval '2 days', expires_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-000000000003' and category = 'es-conversation';
set role authenticated;
select t.as('00000000-0000-0000-0000-000000000003');
select t.check('보안 P7 권한 만료 작성자 본인 질문 조회', (select count(*) from public.board_posts where title = '반환 테스트 수정') = 1);
select t.check('보안 P7 권한 만료 후 다른 학생 공개 질문 0행',
  (select count(*) from public.board_posts where kind = 'question' and author_id <> auth.uid()) = 0);

-- ===== 문제 =====
-- s1 은 rls_test 에서 연습 세트를 제출했다. 그 뒤 문항이 추가돼도 결과에 나오지 않아야 한다
select t.as('00000000-0000-0000-0000-00000000000a');
select public.admin_save_question(null, '30000000-0000-0000-0000-000000000001', 'short_text', '나중 문항', '[]', '["tarde"]', '나중 해설', 1, 99);
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('보안 P9-3 결과에 응시 후 추가된 문항 없음',
  not exists (select 1 from public.attempt_result((select id from public.attempts where quiz_id = '30000000-0000-0000-0000-000000000001' and user_id = auth.uid() limit 1)) where prompt = '나중 문항'));
select t.check('보안 P9-3 권한 있으면 해설 보임',
  (select count(*) from public.attempt_result((select id from public.attempts where quiz_id = '30000000-0000-0000-0000-000000000001' and user_id = auth.uid() limit 1)) where explanation is not null) = 4);
reset role;
update public.entitlements set starts_at = now() - interval '2 days', expires_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-000000000001';
set role authenticated;
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('보안 P9-3 권한 만료 후 정답·해설 숨김, 점수는 보임',
  (select count(*) filter (where answer is null and explanation is null) = count(*) and count(*) = 4
   from public.attempt_result((select id from public.attempts where quiz_id = '30000000-0000-0000-0000-000000000001' and user_id = auth.uid() limit 1))));
select t.expect_error('보안 P9-4 권한 만료 후 응시 시작 거부', $$select public.start_attempt('30000000-0000-0000-0000-000000000001')$$);
select t.as('00000000-0000-0000-0000-00000000000a');
select t.check('보안 P9-3 관리자는 항상 정답 보임',
  (select count(*) from public.attempt_result((select id from public.attempts where quiz_id = '30000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000001' limit 1)) where answer is not null) >= 3);
select t.check('보안 P9-4 start_attempt 에 사용자별 잠금',
  position('pg_advisory_xact_lock' in pg_get_functiondef('public.start_attempt(uuid)'::regprocedure)) > 0);

-- ===== 수강신청 =====
select t.as('00000000-0000-0000-0000-000000000003');
insert into public.enrollment_requests (user_id, category, tier) values (auth.uid(), 'topik', 'basic');
select t.expect_error('보안 P9-8 같은 과목 확인 중 신청 중복 거부',
  $$insert into public.enrollment_requests (user_id, category, tier) values (auth.uid(), 'topik', 'premium')$$);
insert into public.enrollment_requests (user_id, category, tier) values (auth.uid(), 'ko-conversation', 'basic');
select t.check('보안 P9-8 다른 과목 신청은 가능', (select count(*) from public.enrollment_requests where user_id = auth.uid() and status = 'pending') = 2);

-- ===== 가입 =====
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000ff', 'long@x.com', jsonb_build_object('full_name', repeat('가', 5000)));
select t.check('보안 P9-9 가입 이름 100자 제한', (select char_length(name) from public.profiles where id = '00000000-0000-0000-0000-0000000000ff') = 100);
select t.check('보안 트리거 함수 직접 실행 권한 없음',
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
  and not has_function_privilege('authenticated', 'public.set_instructor_flag()', 'execute'));


-- ===== P8 재점검 반영 =====
-- 응시 2회 모의고사: 1회차 결과에서는 정답을 숨기고, 2회차까지 마치면 공개
reset role;
update public.entitlements set starts_at = now() - interval '2 days', expires_at = now() + interval '30 days' where user_id = '00000000-0000-0000-0000-000000000003';
insert into public.quizzes (id, category, title, kind, max_attempts, published) values
  ('30000000-0000-0000-0000-000000000009', 'es-conversation', '모의 2회', 'mock', 2, true);
insert into public.questions (quiz_id, type, prompt, choices, answer, explanation) values
  ('30000000-0000-0000-0000-000000000009', 'mcq_single', 'q', '["a","b"]', '1', '비밀 해설');
set role authenticated;
select t.as('00000000-0000-0000-0000-000000000003');
select public.submit_attempt(public.start_attempt('30000000-0000-0000-0000-000000000009'), '{}');
select t.check('보안 P8-1 모의고사 1회차 결과 정답 숨김',
  (select count(*) from public.attempt_result((select id from public.attempts where quiz_id = '30000000-0000-0000-0000-000000000009' and user_id = auth.uid() order by started_at limit 1)) where answer is not null or explanation is not null) = 0);
select public.start_attempt('30000000-0000-0000-0000-000000000009');
select t.check('보안 P8-1 2회차 진행 중에도 1회차 정답 숨김',
  (select count(*) from public.attempt_result((select id from public.attempts where quiz_id = '30000000-0000-0000-0000-000000000009' and user_id = auth.uid() and status <> 'in_progress' limit 1)) where explanation is not null) = 0);
select public.submit_attempt((select id from public.attempts where quiz_id = '30000000-0000-0000-0000-000000000009' and user_id = auth.uid() and status = 'in_progress'), '{}');
select t.check('보안 P8-1 응시 횟수를 다 쓰면 정답 공개',
  (select count(*) from public.attempt_result((select id from public.attempts where quiz_id = '30000000-0000-0000-0000-000000000009' and user_id = auth.uid() order by started_at limit 1)) where explanation = '비밀 해설') = 1);

-- 권한이 끝난 뒤 제출하면 응답 무시 (0점)
reset role;
insert into public.attempts (id, quiz_id, user_id) values ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001');
set role authenticated;
select t.as('00000000-0000-0000-0000-000000000001');
select public.submit_attempt('80000000-0000-0000-0000-000000000001', '{"x":1}');
select t.check('보안 P8-8 권한 만료 후 제출은 0점 마감',
  (select status = 'graded' and score = 0 from public.attempts where id = '80000000-0000-0000-0000-000000000001'));

-- 차단 회원은 회화콜 크레딧 0
reset role;
set role service_role;
select t.as(null, 'service_role');
select t.check('보안 P8-5 승인 회원 크레딧 있음', public.call_credits_for('00000000-0000-0000-0000-000000000002', 'es-conversation') > 0);
reset role;
update public.profiles set status = 'blocked' where id = '00000000-0000-0000-0000-000000000002';
set role service_role;
select t.check('보안 P8-5 차단 회원 크레딧 0', public.call_credits_for('00000000-0000-0000-0000-000000000002', 'es-conversation') = 0);
reset role;

\echo
\echo ===== 보안 테스트 결과 =====
select case when ok then 'PASS' else 'FAIL' end as r, code, left(detail, 70) as detail from t.results where id > :start_id order by id;
select count(*) filter (where ok) as pass, count(*) filter (where not ok) as fail from t.results where id > :start_id;
