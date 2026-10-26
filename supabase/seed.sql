-- 기본 데이터 (마이그레이션 후 1회)
insert into public.categories (slug, name_ko, name_en, sort) values
  ('es-conversation', '스페인어 회화', 'Spanish conversation', 1),
  ('es-school', '스페인어 내신', 'Spanish for school exams', 2),
  ('ko-conversation', '한국어 회화', 'Korean conversation', 3),
  ('topik', 'TOPIK', 'TOPIK', 4)
on conflict (slug) do nothing;

insert into public.tiers (slug, rank, name_ko, name_en, monthly_call_credits, live_access, price_krw) values
  ('basic', 1, '베이직', 'Basic', 0, false, null),
  ('standard', 2, '스탠다드', 'Standard', 2, true, null),
  ('premium', 3, '프리미엄', 'Premium', 4, true, null)
on conflict (slug) do nothing;

-- 관리자 지정: 본인 계정으로 한 번 로그인한 뒤 이메일을 바꿔 실행
-- update public.profiles set role = 'admin', status = 'approved' where email = 'you@example.com';
