-- 앱 수준 DB 테스트. rls_test.sql 다음에 같은 DB 에서 실행 (사용자, t 스키마 재사용)
-- 앱이 PostgREST 로 보내는 쿼리를 같은 역할과 클레임으로 재현한다
\set ON_ERROR_STOP on
select coalesce(max(id), 0) as start_id from t.results \gset

-- 행 수를 돌려주는 헬퍼 (update/delete 가 실제로 몇 행에 적용됐는지)
create function t.affected(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function t.affected(text) to anon, authenticated, service_role;

set role authenticated;

-- ===== 관리자 쓰기 (P4~P7 관리자 화면) =====
select t.as('00000000-0000-0000-0000-00000000000a');
select t.check('앱 P4 관리자 레슨 수정 1행', t.affected($$update public.lessons set title = 'L1 수정' where id = '20000000-0000-0000-0000-000000000001'$$) = 1);
select t.check('앱 P4 관리자 강의 비공개 전환 1행', t.affected($$update public.courses set published = false where id = '10000000-0000-0000-0000-000000000002'$$) = 1);
select t.expect_error('앱 P5 관리자도 questions 직접 update 불가(함수로만)',
  $$update public.questions set prompt = 'x' where id = '40000000-0000-0000-0000-000000000001'$$);
select t.check('앱 P5 admin_save_question 새 문항',
  public.admin_save_question(null, '30000000-0000-0000-0000-000000000001', 'short_text', '새 문항', '[]', '["si"]', '해설', 2, 9) is not null);
select t.check('앱 P5 admin_save_question 수정',
  public.admin_save_question('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'mcq_single', '1? 수정', '["a","b","c"]', '2', '해설1', 1, 1)
  = '40000000-0000-0000-0000-000000000001');
select t.check('앱 P5 admin_quiz_questions 에 반영', (select prompt from public.admin_quiz_questions('30000000-0000-0000-0000-000000000001') where id = '40000000-0000-0000-0000-000000000001') = '1? 수정');
select t.expect_error('앱 P5 다른 세트 문항 id 로 수정 거부',
  $$select public.admin_save_question('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'essay', 'x', '[]', 'null', null, 1, 1)$$);
select public.admin_delete_question((select id from public.admin_quiz_questions('30000000-0000-0000-0000-000000000001') where prompt = '새 문항'));
select t.check('앱 P5 admin_delete_question', (select count(*) from public.admin_quiz_questions('30000000-0000-0000-0000-000000000001') where prompt = '새 문항') = 0);
select t.check('앱 P6 관리자 라이브 Meet 링크 수정 1행',
  t.affected($$update public.live_sessions set meet_url = 'https://meet.google.com/ccc' where id = '50000000-0000-0000-0000-000000000002'$$) = 1);
select t.check('앱 P6 admin_live_sessions 에 Meet 링크 포함',
  (select meet_url from public.admin_live_sessions(now() - interval '1 day') where id = '50000000-0000-0000-0000-000000000002') = 'https://meet.google.com/ccc');
insert into public.credit_adjustments (user_id, category, month, delta, note)
  values ('00000000-0000-0000-0000-000000000003', 'es-conversation', public.seoul_month(now()), 1, '보너스');
select t.check('앱 P7 관리자 단계 가격 수정 1행', t.affected($$update public.tiers set price_krw = 99000 where slug = 'premium'$$) = 1);
insert into public.results (masked_name, headline, published) values ('김**', 'TOPIK 6급', true), ('이**', '비공개 성과', false);
insert into public.reviews (masked_name, body, published) values ('박**', '좋았어요', true);
select t.check('앱 P3 관리자 회원 목록 조인(신청+회원 이메일)',
  (select count(*) from public.enrollment_requests r join public.profiles p on p.id = r.user_id) >= 1);

-- ===== 학생 =====
select t.as('00000000-0000-0000-0000-000000000003');
select t.check('앱 P6 크레딧 조정 반영(basic 0 + 1)', public.my_call_credits('es-conversation') = 1);
select t.expect_error('앱 P5 학생 admin_save_question 거부',
  $$select public.admin_save_question(null, '30000000-0000-0000-0000-000000000001', 'essay', 'x', '[]', 'null', null, 1, 1)$$);
select t.expect_error('앱 P5 학생 admin_delete_question 거부', $$select public.admin_delete_question('40000000-0000-0000-0000-000000000002')$$);
select t.expect_error('앱 P6 학생 admin_live_sessions 거부', $$select * from public.admin_live_sessions()$$);
select t.check('앱 P4 학생 레슨 수정 0행', t.affected($$update public.lessons set title = 'hack' where id = '20000000-0000-0000-0000-000000000001'$$) = 0);
select t.check('앱 P7 학생 단계 수정 0행', t.affected($$update public.tiers set price_krw = 1 where slug = 'basic'$$) = 0);
select t.expect_error('앱 P4 학생 수강신청 상태 수정 거부', $$update public.enrollment_requests set status = 'approved'$$);
select t.expect_error('앱 P3 학생 user_sessions 직접 쓰기 거부', $$update public.user_sessions set session_token = gen_random_uuid()$$);
select t.check('앱 P4 진도 upsert 중복 무시',
  t.affected($$insert into public.lesson_progress (user_id, lesson_id) values (auth.uid(), '20000000-0000-0000-0000-000000000001') on conflict (user_id, lesson_id) do nothing$$) = 1
  and t.affected($$insert into public.lesson_progress (user_id, lesson_id) values (auth.uid(), '20000000-0000-0000-0000-000000000001') on conflict (user_id, lesson_id) do nothing$$) = 0);
select t.check('앱 P4 진도 삭제(완료 취소)', t.affected($$delete from public.lesson_progress where user_id = auth.uid() and lesson_id = '20000000-0000-0000-0000-000000000001'$$) = 1);
select t.check('앱 P4 비공개 강의 레슨 숨김', (select count(*) from public.lessons l join public.courses c on c.id = l.course_id where c.id = '10000000-0000-0000-0000-000000000002') = 0);
select t.check('앱 P7 다른 학생 질문 삭제 0행', t.affected($$delete from public.board_posts where id = '70000000-0000-0000-0000-000000000002'$$) = 0);
select t.check('앱 P7 다른 학생 공개 질문 댓글 가능',
  t.affected($$insert into public.board_comments (post_id, author_id, body) values ('70000000-0000-0000-0000-000000000002', auth.uid(), '저도 궁금해요')$$) = 1);
select t.expect_error('앱 P7 공지에 학생 댓글 거부',
  $$insert into public.board_comments (post_id, author_id, body) values ((select id from public.board_posts where kind = 'notice' limit 1), auth.uid(), 'x')$$);

-- 작성자 본인 삭제
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('앱 P7 작성자 본인 질문 삭제 1행', t.affected($$delete from public.board_posts where id = '70000000-0000-0000-0000-000000000002'$$) = 1);

-- ===== 비로그인 =====
reset role;
set role anon;
select t.as(null, 'anon');
select t.check('앱 P7 비로그인 공개 합격자만', (select count(*) from public.results) = 1);
select t.check('앱 P7 비로그인 공개 후기', (select count(*) from public.reviews) = 1);
select t.check('앱 P1 비로그인 단계 조회(DB 가격 반영)', (select price_krw from public.tiers where slug = 'premium') = 99000);
select t.expect_error('앱 P3 비로그인 grant_access 거부',
  $$select public.grant_access('00000000-0000-0000-0000-000000000001','es-conversation','premium', now(), now()+interval '1 year')$$);
select t.expect_error('앱 P3 비로그인 profiles 거부', $$select * from public.profiles$$);
select t.expect_error('앱 P6 비로그인 live_link 거부', $$select public.live_link('50000000-0000-0000-0000-000000000001')$$);
reset role;

-- ===== service role (웹훅) =====
set role service_role;
select t.as(null, 'service_role');
select t.check('앱 P6 웹훅 call_credits_for 호출 가능', public.call_credits_for('00000000-0000-0000-0000-000000000001', 'es-conversation') = 2);
insert into public.call_bookings (user_id, category, cal_uid, starts_at, ends_at)
  values ('00000000-0000-0000-0000-000000000001','es-conversation','cal-up', now() + interval '2 day', now() + interval '2 day 15 minutes')
  on conflict (cal_uid) do update set status = excluded.status;
insert into public.call_bookings (user_id, category, cal_uid, starts_at, ends_at)
  values ('00000000-0000-0000-0000-000000000001','es-conversation','cal-up', now() + interval '2 day', now() + interval '2 day 15 minutes')
  on conflict (cal_uid) do update set status = excluded.status;
select t.check('앱 P6 같은 uid 재전송 중복 행 없음', (select count(*) from public.call_bookings where cal_uid = 'cal-up') = 1);
select t.check('앱 P10 결제 권한은 service role 만', public.grant_access('00000000-0000-0000-0000-000000000003','topik','basic', now(), now() + interval '30 days', 'payment', 'test') is not null);
reset role;
set role authenticated;
select t.as('00000000-0000-0000-0000-00000000000a');
select t.expect_error('앱 P10 관리자도 payment 출처 권한 생성 거부',
  $$select public.grant_access('00000000-0000-0000-0000-000000000003','topik','basic', now(), now()+interval '30 days', 'payment')$$);
reset role;

\echo
\echo ===== 앱 테스트 결과 =====
select case when ok then 'PASS' else 'FAIL' end as r, code, left(detail, 70) as detail from t.results where id > :start_id order by id;
select count(*) filter (where ok) as pass, count(*) filter (where not ok) as fail from t.results where id > :start_id;
