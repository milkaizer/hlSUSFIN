-- RLS·함수 수용 테스트. run.sh 가 새 DB에 stub + migration + seed 적용 후 실행
\set ON_ERROR_STOP on
create schema t;
create table t.results (id serial, code text, ok boolean, detail text);
grant usage on schema t to anon, authenticated, service_role;
grant insert, select on t.results to anon, authenticated, service_role;
grant usage on sequence t.results_id_seq to anon, authenticated, service_role;

create function t.check(p_code text, p_ok boolean, p_detail text default '') returns void
language sql as $$ insert into t.results (code, ok, detail) values (p_code, coalesce(p_ok, false), p_detail) $$;
create function t.expect_error(p_code text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  perform t.check(p_code, false, 'no error: ' || p_sql);
exception when others then
  perform t.check(p_code, true, sqlerrm);
end $$;
create function t.as(p_uid text, p_role text default 'authenticated') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, false);
end $$;
grant execute on all functions in schema t to anon, authenticated, service_role;

-- 사용자
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','admin@x.com'),
 ('00000000-0000-0000-0000-000000000001','s1@x.com'),
 ('00000000-0000-0000-0000-000000000002','s2@x.com'),
 ('00000000-0000-0000-0000-000000000003','s3@x.com');
update public.profiles set role='admin', status='approved' where email='admin@x.com';

-- 콘텐츠
insert into public.courses (id, category, title, published) values
 ('10000000-0000-0000-0000-000000000001','es-conversation','ES 회화 1',true),
 ('10000000-0000-0000-0000-000000000002','ko-conversation','KO 회화 1',true);
insert into public.lessons (id, course_id, title, video_id, min_tier) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','L1','abc','basic'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','L2','def','standard'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','L3','ghi','basic');
insert into public.quizzes (id, category, title, kind, time_limit_min, max_attempts, published) values
 ('30000000-0000-0000-0000-000000000001','es-conversation','연습',  'practice', null, null, true),
 ('30000000-0000-0000-0000-000000000002','es-conversation','모의고사','mock', 1, 1, true);
insert into public.questions (id, quiz_id, type, prompt, choices, answer, explanation, sort) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','mcq_single','1?','["a","b"]','1','해설1',1),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','mcq_multi','2?','["a","b","c"]','[0,2]','해설2',2),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','short_text','3?','[]','["hola","buenas"]','해설3',3),
 ('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','essay','4?','[]','null','해설4',4),
 ('40000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002','mcq_single','m?','["a","b"]','0','해설m',1);
insert into public.live_sessions (id, category, title, starts_at, meet_url) values
 ('50000000-0000-0000-0000-000000000001','es-conversation','곧',  now() + interval '10 minutes','https://meet.google.com/aaa'),
 ('50000000-0000-0000-0000-000000000002','es-conversation','나중',now() + interval '3 hours','https://meet.google.com/bbb');

-- ===== 10.2 =====
set role authenticated;
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('10.2-1 pending: 프로필 pending', (select status from public.profiles) = 'pending');
select t.check('10.2-1 pending: 레슨 0행', (select count(*) from public.lessons) = 0);
select t.expect_error('10.2-7 학생 entitlements insert 거부',
  $$insert into public.entitlements (user_id, category, tier, expires_at, source) values ('00000000-0000-0000-0000-000000000001','es-conversation','premium', now()+interval '1 year','admin')$$);
select t.expect_error('10.2-7 학생 grant_access 호출 거부',
  $$select public.grant_access('00000000-0000-0000-0000-000000000001','es-conversation','premium', now(), now()+interval '1 year')$$);
select t.expect_error('보안: 학생 profiles role 직접 수정 거부',
  $$update public.profiles set role='admin' where id = auth.uid()$$);
select t.expect_error('보안: 학생 admin_set_profile 거부',
  $$select public.admin_set_profile('00000000-0000-0000-0000-000000000001','approved','admin')$$);
select t.expect_error('보안: 학생 call_credits_for 직접 호출 거부',
  $$select public.call_credits_for('00000000-0000-0000-0000-000000000002','es-conversation')$$);
select public.claim_session('99999999-0000-0000-0000-000000000001'::uuid, 'ua1');
select t.check('10.2-5 세션 토큰 본인 조회', (select session_token from public.user_sessions) = '99999999-0000-0000-0000-000000000001');
select public.claim_session('99999999-0000-0000-0000-000000000002'::uuid, 'ua2');
select t.check('10.2-5 재로그인 시 토큰 교체', (select session_token from public.user_sessions) = '99999999-0000-0000-0000-000000000002');

select t.as('00000000-0000-0000-0000-00000000000a');
select public.grant_access('00000000-0000-0000-0000-000000000001','es-conversation','basic', now(), now() + interval '30 days');
select public.grant_access('00000000-0000-0000-0000-000000000002','es-conversation','basic', now() - interval '10 days', now() - interval '1 day');
select public.grant_access('00000000-0000-0000-0000-000000000003','es-conversation','basic', now(), now() + interval '30 days');
select t.check('세션: 다른 사람 세션 행 안 보임(관리자도)', (select count(*) from public.user_sessions) = 0);

select t.as('00000000-0000-0000-0000-000000000001');
select t.check('10.2-2 승인 후 status approved', (select status from public.profiles) = 'approved');
select t.check('10.2-2 es 레슨 basic만 1행', (select count(*) from public.lessons) = 1);
select t.check('10.2-3 ko 레슨 직접 조회 0행', (select count(*) from public.lessons where id = '20000000-0000-0000-0000-000000000003') = 0);
select t.check('10.3-6 standard 레슨 직접 조회 0행', (select count(*) from public.lessons where id = '20000000-0000-0000-0000-000000000002') = 0);
select t.check('profiles 본인만', (select count(*) from public.profiles) = 1);

select t.as('00000000-0000-0000-0000-000000000002');
select t.check('10.2-4 만료 권한 레슨 0행', (select count(*) from public.lessons) = 0);

-- ===== 10.3 수강신청 =====
select t.expect_error('10.3-1 승인 상태로 신청 insert 거부',
  $$insert into public.enrollment_requests (user_id, category, tier, status) values (auth.uid(),'es-conversation','premium','approved')$$);
select t.expect_error('10.3-1 타인 명의 신청 거부',
  $$insert into public.enrollment_requests (user_id, category, tier) values ('00000000-0000-0000-0000-000000000001','es-conversation','premium')$$);
insert into public.enrollment_requests (id, user_id, category, tier, message)
 values ('60000000-0000-0000-0000-000000000001', auth.uid(), 'es-conversation', 'standard', '연장 희망');
select t.check('10.3-1 신청 pending', (select status from public.enrollment_requests) = 'pending');
select t.as('00000000-0000-0000-0000-00000000000a');
select t.check('10.3-1 관리자 목록에 표시', (select count(*) from public.enrollment_requests where status='pending') = 1);
select public.approve_request('60000000-0000-0000-0000-000000000001', now(), now() + interval '30 days');
select t.as('00000000-0000-0000-0000-000000000002');
select t.check('10.3-2 승인 후 레슨 2행(standard)', (select count(*) from public.lessons) = 2);
select t.check('10.3-2 grant_access 경유 note', (select count(*) from public.entitlements where note = 'enrollment request') = 1);

-- 진도
select t.as('00000000-0000-0000-0000-000000000001');
insert into public.lesson_progress (user_id, lesson_id) values (auth.uid(), '20000000-0000-0000-0000-000000000001');
select t.check('10.3-4 진도 저장', (select count(*) from public.lesson_progress) = 1);
select t.expect_error('보안: 권한 밖 레슨 진도 insert 거부',
  $$insert into public.lesson_progress (user_id, lesson_id) values (auth.uid(), '20000000-0000-0000-0000-000000000003')$$);

-- ===== 10.4 문제 =====
select t.expect_error('10.4-6 학생 questions 직접 select 거부', $$select answer from public.questions$$);
select t.check('10.4-6 quiz_questions 정답 컬럼 없음',
  not exists (select 1 from information_schema.routines r join information_schema.parameters p on p.specific_name = r.specific_name
              where r.routine_name = 'quiz_questions' and p.parameter_name in ('answer','explanation')));
select t.check('10.4 quiz_questions 4문항', (select count(*) from public.quiz_questions('30000000-0000-0000-0000-000000000001')) = 4);
select public.start_attempt('30000000-0000-0000-0000-000000000001');
select t.expect_error('10.4-6 제출 전 결과 조회 거부',
  $$select * from public.attempt_result((select id from public.attempts limit 1))$$);
select public.submit_attempt((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001'),
  '{"40000000-0000-0000-0000-000000000001":1,"40000000-0000-0000-0000-000000000002":[2,0],"40000000-0000-0000-0000-000000000003":"  HOLA ","40000000-0000-0000-0000-000000000004":"mi texto"}');
select t.check('10.4-1 객관식 단일 정답', (select is_correct from public.attempt_answers where question_id='40000000-0000-0000-0000-000000000001'));
select t.check('10.4-1 객관식 복수 순서 무관 정답', (select is_correct from public.attempt_answers where question_id='40000000-0000-0000-0000-000000000002'));
select t.check('10.4-2 단답 정규화 정답', (select is_correct from public.attempt_answers where question_id='40000000-0000-0000-0000-000000000003'));
select t.check('10.4-3 서술형 채점 대기', (select status from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001') = 'needs_grading');
select t.check('10.4 제출 후 결과에 해설 포함', (select count(*) from public.attempt_result((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001')) where explanation is not null) = 4);
select t.expect_error('보안: 재제출 거부',
  $$select public.submit_attempt((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001'), '{}')$$);
select t.as('00000000-0000-0000-0000-000000000003');
select t.expect_error('보안: 타인 응시 결과 조회 거부',
  $$select * from public.attempt_result((select id from public.attempts limit 1))$$);
select t.check('보안: 타인 응시 행 안 보임', (select count(*) from public.attempts) = 0);
select t.as('00000000-0000-0000-0000-00000000000a');
select public.grade_essay((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001'), '40000000-0000-0000-0000-000000000004', 1);
select t.check('10.4-3 채점 후 graded, 4점', (select status = 'graded' and score = 4 from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001'));

-- 모의고사: 시간 초과, 응시 횟수
select t.as('00000000-0000-0000-0000-000000000001');
select public.start_attempt('30000000-0000-0000-0000-000000000002');
reset role;
update public.attempts set deadline_at = now() - interval '10 minutes', started_at = now() - interval '11 minutes'
 where quiz_id = '30000000-0000-0000-0000-000000000002';
set role authenticated;
select public.submit_attempt((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000002'),
  '{"40000000-0000-0000-0000-000000000005":0}');
select t.check('10.4-4 마감 후 늦은 제출은 0점', (select score from public.attempts where quiz_id='30000000-0000-0000-0000-000000000002') = 0);
select t.expect_error('10.4-5 응시 횟수 초과 거부', $$select public.start_attempt('30000000-0000-0000-0000-000000000002')$$);

-- ===== 10.5 라이브·콜 =====
select t.check('10.5-5 basic 학생 라이브 0행', (select count(*) from public.live_sessions) = 0);
select t.check('10.5-1 basic 크레딧 0', public.my_call_credits('es-conversation') = 0);
select t.as('00000000-0000-0000-0000-00000000000a');
select public.admin_update_entitlement((select id from public.entitlements where user_id='00000000-0000-0000-0000-000000000001'), 'standard', null);
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('10.5 standard 라이브 2행', (select count(*) from public.live_sessions) = 2);
select t.expect_error('10.5-6 meet_url 직접 select 거부', $$select meet_url from public.live_sessions$$);
select t.check('10.5-6 30분 이내 링크 노출', public.live_link('50000000-0000-0000-0000-000000000001') is not null);
select t.check('10.5-6 3시간 전 링크 숨김', public.live_link('50000000-0000-0000-0000-000000000002') is null);
select t.check('10.5 standard 크레딧 2', public.my_call_credits('es-conversation') = 2);
reset role;
set role service_role;
select t.as(null, 'service_role');
insert into public.call_bookings (user_id, category, cal_uid, starts_at, ends_at)
 values ('00000000-0000-0000-0000-000000000001','es-conversation','cal-1', now() + interval '1 day', now() + interval '1 day 15 minutes');
set role authenticated;
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('10.5-2 예약 후 크레딧 1', public.my_call_credits('es-conversation') = 1);
reset role; update public.call_bookings set status = 'cancelled' where cal_uid = 'cal-1'; set role authenticated;
select t.check('10.5-3 취소 후 크레딧 2', public.my_call_credits('es-conversation') = 2);
select t.expect_error('보안: 학생 call_bookings insert 거부',
  $$insert into public.call_bookings (user_id, category, cal_uid, starts_at, ends_at) values (auth.uid(),'es-conversation','x', now(), now())$$);

-- ===== 10.6 게시판 =====
select t.as('00000000-0000-0000-0000-00000000000a');
insert into public.board_posts (kind, author_id, title, body) values ('notice', auth.uid(), '공지', '내용');
select t.as('00000000-0000-0000-0000-000000000001');
select t.expect_error('10.6-2 권한 없는 과목 질문 작성 거부',
  $$insert into public.board_posts (kind, category, author_id, title, body) values ('question','ko-conversation', auth.uid(), 'q','b')$$);
select t.expect_error('보안: 학생 공지 작성 거부',
  $$insert into public.board_posts (kind, author_id, title, body) values ('notice', auth.uid(), 'x','y')$$);
insert into public.board_posts (id, kind, category, author_id, title, body, is_private)
 values ('70000000-0000-0000-0000-000000000001','question','es-conversation', auth.uid(), '비공개 질문','b', true);
insert into public.board_posts (id, kind, category, author_id, title, body)
 values ('70000000-0000-0000-0000-000000000002','question','es-conversation', auth.uid(), '공개 질문','b');
insert into public.board_comments (post_id, author_id, body, is_instructor)
 values ('70000000-0000-0000-0000-000000000002', auth.uid(), '학생 댓글', true);
select t.check('10.6-4 학생 댓글 강사 배지 위조 불가', (select not is_instructor from public.board_comments where body = '학생 댓글'));
select t.as('00000000-0000-0000-0000-000000000003');
select t.check('10.6-3 타 학생 비공개 질문 0행', (select count(*) from public.board_posts where id = '70000000-0000-0000-0000-000000000001') = 0);
select t.check('10.6 같은 과목 공개 질문 보임', (select count(*) from public.board_posts where id = '70000000-0000-0000-0000-000000000002') = 1);
select t.as('00000000-0000-0000-0000-00000000000a');
select t.check('10.6-3 관리자 비공개 질문 보임', (select count(*) from public.board_posts where id = '70000000-0000-0000-0000-000000000001') = 1);
insert into public.board_comments (post_id, author_id, body) values ('70000000-0000-0000-0000-000000000001', auth.uid(), '강사 답변');
select t.check('10.6-4 관리자 댓글 강사 배지', (select is_instructor from public.board_comments where body = '강사 답변'));
reset role;
set role anon;
select t.as(null, 'anon');
select t.check('10.6-1 비로그인 공지 열람', (select count(*) from public.board_posts where kind = 'notice') = 1);
select t.check('10.6-2 비로그인 질문 0행', (select count(*) from public.board_posts where kind = 'question') = 0);
select t.check('스페이서: 비공개 합격자 0행', (select count(*) from public.results) = 0);
select t.expect_error('보안: anon lessons 거부', $$select * from public.lessons$$);
reset role;

\echo
\echo ===== 결과 =====
select case when ok then 'PASS' else 'FAIL' end as r, code, left(detail, 70) as detail from t.results order by id;
select count(*) filter (where ok) as pass, count(*) filter (where not ok) as fail from t.results;
