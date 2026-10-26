-- Vita Language 초기 스키마
-- 원칙: 권한 생성은 grant_access 하나로만. 정답·해설과 Meet 링크는 학생이 직접 select 불가.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 기본 테이블
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  locale text not null default 'ko' check (locale in ('ko','en')),
  role text not null default 'student' check (role in ('admin','student')),
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  created_at timestamptz not null default now()
);

create table public.user_sessions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  session_token uuid not null,
  user_agent text,
  updated_at timestamptz not null default now()
);

create table public.categories (
  slug text primary key,
  name_ko text not null,
  name_en text not null,
  sort int not null default 0
);

create table public.tiers (
  slug text primary key check (slug in ('basic','standard','premium')),
  rank int not null unique,
  name_ko text not null,
  name_en text not null,
  monthly_call_credits int not null default 0 check (monthly_call_credits >= 0),
  live_access boolean not null default false,
  price_krw int
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null references public.categories(slug),
  tier text not null references public.tiers(slug),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null check (source in ('admin','payment')),
  granted_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);
create index on public.entitlements (user_id, category);

create table public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null references public.categories(slug),
  tier text not null references public.tiers(slug),
  message text check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  handled_by uuid references public.profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.categories(slug),
  title text not null,
  description text,
  sort int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  video_provider text not null default 'youtube' check (video_provider in ('youtube','vimeo')),
  video_id text,
  materials_url text,
  min_tier text not null default 'basic' references public.tiers(slug),
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.categories(slug),
  title text not null,
  kind text not null default 'practice' check (kind in ('practice','mock')),
  time_limit_min int check (time_limit_min is null or time_limit_min > 0),
  max_attempts int check (max_attempts is null or max_attempts > 0),
  min_tier text not null default 'basic' references public.tiers(slug),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type text not null check (type in ('mcq_single','mcq_multi','short_text','essay')),
  prompt text not null,
  choices jsonb not null default '[]'::jsonb,
  answer jsonb not null default 'null'::jsonb,
  explanation text,
  points int not null default 1 check (points >= 0),
  sort int not null default 0
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','needs_grading','graded'))
);

create table public.attempt_answers (
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response jsonb,
  is_correct boolean,
  points_awarded numeric,
  graded_by uuid references public.profiles(id),
  primary key (attempt_id, question_id)
);

create table public.call_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text references public.categories(slug),
  cal_uid text not null unique,
  attendee_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'accepted' check (status in ('accepted','cancelled','over_limit')),
  meet_url text,
  updated_at timestamptz not null default now()
);

create table public.credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null references public.categories(slug),
  month date not null,
  delta int not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.categories(slug),
  title text not null,
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min > 0),
  meet_url text,
  min_tier text not null default 'standard' references public.tiers(slug),
  created_at timestamptz not null default now()
);

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  category text references public.categories(slug),
  kind text not null check (kind in ('notice','question')),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 10000),
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  check ((kind = 'notice' and category is null) or (kind = 'question' and category is not null))
);

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  is_instructor boolean not null default false,
  created_at timestamptz not null default now()
);

-- 스페이서: 합격자·후기 (화면은 플래그로 숨김)
create table public.results (
  id uuid primary key default gen_random_uuid(),
  category text references public.categories(slug),
  masked_name text not null,
  headline text not null,
  detail text,
  year int,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  category text references public.categories(slug),
  masked_name text not null,
  body text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 헬퍼 함수
-- ---------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

create or replace function public.tier_rank(t text) returns int
language sql stable security definer set search_path = public as $$
  select rank from tiers where slug = t;
$$;

create or replace function public.has_access(cat text, min_tier text default 'basic') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from entitlements e
    join profiles p on p.id = e.user_id
    where e.user_id = auth.uid()
      and p.status = 'approved'
      and e.category = cat
      and now() >= e.starts_at and now() < e.expires_at
      and tier_rank(e.tier) >= tier_rank(min_tier)
  );
$$;

create or replace function public.lesson_visible(p_course uuid, p_min_tier text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from courses c
    where c.id = p_course and c.published and has_access(c.category, p_min_tier)
  );
$$;

create or replace function public.can_read_post(p_post uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from board_posts b
    where b.id = p_post
      and (
        b.kind = 'notice'
        or is_admin()
        or (has_access(b.category) and (not b.is_private or b.author_id = auth.uid()))
      )
  );
$$;

-- ---------------------------------------------------------------
-- 가입 시 프로필 생성
-- ---------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- 1계정 1세션
-- ---------------------------------------------------------------
create or replace function public.claim_session(p_token uuid, p_user_agent text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into user_sessions (user_id, session_token, user_agent, updated_at)
  values (auth.uid(), p_token, left(p_user_agent, 300), now())
  on conflict (user_id) do update set session_token = excluded.session_token,
    user_agent = excluded.user_agent, updated_at = now();
end $$;

-- ---------------------------------------------------------------
-- 프로필
-- ---------------------------------------------------------------
create or replace function public.update_my_profile(p_name text, p_locale text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update profiles set name = left(p_name, 100), locale = case when p_locale in ('ko','en') then p_locale else locale end
  where id = auth.uid();
end $$;

create or replace function public.admin_set_profile(p_user uuid, p_status text, p_role text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() and (p_status <> 'approved' or coalesce(p_role,'admin') <> 'admin') then
    raise exception 'cannot demote self';
  end if;
  update profiles set status = p_status, role = coalesce(p_role, role) where id = p_user;
end $$;

-- ---------------------------------------------------------------
-- 권한 부여 단일 경로
-- ---------------------------------------------------------------
create or replace function public.grant_access(
  p_user uuid, p_category text, p_tier text, p_starts timestamptz, p_expires timestamptz,
  p_source text default 'admin', p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (is_admin() or auth.role() = 'service_role') then raise exception 'forbidden'; end if;
  if p_source = 'payment' and auth.role() <> 'service_role' then raise exception 'payment grants are server only'; end if;
  insert into entitlements (user_id, category, tier, starts_at, expires_at, source, granted_by, note)
  values (p_user, p_category, p_tier, coalesce(p_starts, now()), p_expires, p_source,
          case when auth.role() = 'service_role' then null else auth.uid() end, p_note)
  returning id into v_id;
  update profiles set status = 'approved' where id = p_user and status = 'pending';
  return v_id;
end $$;

create or replace function public.admin_update_entitlement(p_id uuid, p_tier text, p_expires timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update entitlements set tier = coalesce(p_tier, tier), expires_at = coalesce(p_expires, expires_at) where id = p_id;
end $$;

create or replace function public.admin_revoke_entitlement(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update entitlements set expires_at = greatest(now(), starts_at + interval '1 second') where id = p_id;
end $$;

-- ---------------------------------------------------------------
-- 수강신청
-- ---------------------------------------------------------------
create or replace function public.approve_request(p_request uuid, p_starts timestamptz, p_expires timestamptz) returns uuid
language plpgsql security definer set search_path = public as $$
declare r enrollment_requests; v_id uuid;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into r from enrollment_requests where id = p_request and status = 'pending' for update;
  if not found then raise exception 'request not pending'; end if;
  v_id := grant_access(r.user_id, r.category, r.tier, p_starts, p_expires, 'admin', 'enrollment request');
  update enrollment_requests set status = 'approved', handled_by = auth.uid(), handled_at = now() where id = p_request;
  return v_id;
end $$;

create or replace function public.reject_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update enrollment_requests set status = 'rejected', handled_by = auth.uid(), handled_at = now()
  where id = p_request and status = 'pending';
end $$;

-- ---------------------------------------------------------------
-- 문제·모의고사
-- ---------------------------------------------------------------
create or replace function public.normalize_text(t text) returns text
language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.start_attempt(p_quiz uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare q quizzes; v_count int; v_id uuid; v_open uuid;
begin
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

-- 학생용 문항 조회 (정답·해설 제외)
create or replace function public.quiz_questions(p_quiz uuid)
returns table (id uuid, type text, prompt text, choices jsonb, points int, sort int)
language plpgsql stable security definer set search_path = public as $$
declare q quizzes;
begin
  select * into q from quizzes where quizzes.id = p_quiz;
  if not found then raise exception 'not found'; end if;
  if not (is_admin() or (q.published and has_access(q.category, q.min_tier))) then raise exception 'forbidden'; end if;
  return query select qs.id, qs.type, qs.prompt, qs.choices, qs.points, qs.sort
    from questions qs where qs.quiz_id = p_quiz order by qs.sort, qs.id;
end $$;

-- 제출: p_responses = {"<question_id>": <response>, ...}
create or replace function public.submit_attempt(p_attempt uuid, p_responses jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a attempts; qs record; v_resp jsonb; v_correct boolean; v_pts numeric;
        v_score numeric := 0; v_max numeric := 0; v_essay boolean := false; v_late boolean;
begin
  select * into a from attempts where id = p_attempt and user_id = auth.uid() for update;
  if not found then raise exception 'forbidden'; end if;
  if a.status <> 'in_progress' then raise exception 'already submitted'; end if;
  v_late := a.deadline_at is not null and now() > a.deadline_at + interval '2 minutes';

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

-- 결과 조회: 제출된 본인 응시(또는 관리자)만 정답·해설 포함
create or replace function public.attempt_result(p_attempt uuid)
returns table (question_id uuid, type text, prompt text, choices jsonb, points int, response jsonb,
               is_correct boolean, points_awarded numeric, answer jsonb, explanation text)
language plpgsql stable security definer set search_path = public as $$
declare a attempts;
begin
  select * into a from attempts where id = p_attempt;
  if not found or not (a.user_id = auth.uid() or is_admin()) then raise exception 'forbidden'; end if;
  if a.status = 'in_progress' then raise exception 'not submitted'; end if;
  return query
    select qs.id, qs.type, qs.prompt, qs.choices, qs.points, aa.response, aa.is_correct, aa.points_awarded,
           qs.answer, qs.explanation
    from questions qs
    left join attempt_answers aa on aa.question_id = qs.id and aa.attempt_id = p_attempt
    where qs.quiz_id = a.quiz_id order by qs.sort, qs.id;
end $$;

create or replace function public.grade_essay(p_attempt uuid, p_question uuid, p_points numeric) returns void
language plpgsql security definer set search_path = public as $$
declare v_pending int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update attempt_answers set points_awarded = p_points, is_correct = p_points > 0, graded_by = auth.uid()
  where attempt_id = p_attempt and question_id = p_question;
  select count(*) into v_pending from attempt_answers aa join questions q on q.id = aa.question_id
   where aa.attempt_id = p_attempt and q.type = 'essay' and aa.graded_by is null;
  update attempts set score = (select coalesce(sum(points_awarded),0) from attempt_answers where attempt_id = p_attempt),
    status = case when v_pending = 0 then 'graded' else 'needs_grading' end
  where id = p_attempt;
end $$;

create or replace function public.admin_quiz_questions(p_quiz uuid) returns setof questions
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query select * from questions where quiz_id = p_quiz order by sort, id;
end $$;

-- ---------------------------------------------------------------
-- 회화 콜 크레딧
-- ---------------------------------------------------------------
create or replace function public.seoul_month(ts timestamptz) returns date
language sql immutable as $$ select date_trunc('month', ts at time zone 'Asia/Seoul')::date $$;

create or replace function public.call_credits_for(p_user uuid, p_category text, p_at timestamptz default now())
returns int language sql stable security definer set search_path = public as $$
  select greatest(0,
    coalesce((select max(t.monthly_call_credits) from entitlements e join tiers t on t.slug = e.tier
              where e.user_id = p_user and e.category = p_category and p_at >= e.starts_at and p_at < e.expires_at), 0)
    + coalesce((select sum(delta) from credit_adjustments
              where user_id = p_user and category = p_category and month = seoul_month(p_at)), 0)
    - (select count(*) from call_bookings
              where user_id = p_user and category = p_category and status = 'accepted'
                and seoul_month(starts_at) = seoul_month(p_at)))::int;
$$;

create or replace function public.my_call_credits(p_category text) returns int
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then 0 else call_credits_for(auth.uid(), p_category) end;
$$;

-- ---------------------------------------------------------------
-- 라이브 링크 (시작 30분 전부터, 종료 시각까지)
-- ---------------------------------------------------------------
create or replace function public.live_link(p_session uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare s live_sessions;
begin
  select * into s from live_sessions where id = p_session;
  if not found then return null; end if;
  if is_admin() then return s.meet_url; end if;
  if not has_access(s.category, s.min_tier) then return null; end if;
  if now() < s.starts_at - interval '30 minutes' or now() > s.starts_at + make_interval(mins => s.duration_min) then
    return null;
  end if;
  return s.meet_url;
end $$;

-- 게시판 댓글 강사 배지는 서버가 결정
create or replace function public.set_instructor_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.is_instructor := exists (select 1 from profiles where id = new.author_id and role = 'admin');
  return new;
end $$;
create trigger board_comment_flag before insert on public.board_comments
for each row execute function public.set_instructor_flag();

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_sessions enable row level security;
alter table public.categories enable row level security;
alter table public.tiers enable row level security;
alter table public.entitlements enable row level security;
alter table public.enrollment_requests enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.call_bookings enable row level security;
alter table public.credit_adjustments enable row level security;
alter table public.live_sessions enable row level security;
alter table public.board_posts enable row level security;
alter table public.board_comments enable row level security;
alter table public.results enable row level security;
alter table public.reviews enable row level security;

-- 기본 권한을 먼저 걷어내고 필요한 것만 연다
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- profiles: 본인 또는 관리자 조회, 쓰기는 함수로만
grant select on public.profiles to authenticated;
create policy profiles_read on public.profiles for select using (id = auth.uid() or is_admin());

-- user_sessions: 본인 조회, 쓰기는 claim_session
grant select on public.user_sessions to authenticated;
create policy sessions_read on public.user_sessions for select using (user_id = auth.uid());

-- categories, tiers: 공개 조회, tiers 수정은 관리자
grant select on public.categories, public.tiers to anon, authenticated;
create policy categories_read on public.categories for select using (true);
create policy tiers_read on public.tiers for select using (true);
grant update (monthly_call_credits, live_access, price_krw, name_ko, name_en) on public.tiers to authenticated;
create policy tiers_admin_update on public.tiers for update using (is_admin()) with check (is_admin());

-- entitlements: 조회만. 쓰기는 grant_access 등 함수
grant select on public.entitlements to authenticated;
create policy ent_read on public.entitlements for select using (user_id = auth.uid() or is_admin());

-- enrollment_requests
grant select, insert on public.enrollment_requests to authenticated;
create policy req_read on public.enrollment_requests for select using (user_id = auth.uid() or is_admin());
create policy req_insert on public.enrollment_requests for insert
  with check (user_id = auth.uid() and status = 'pending' and handled_by is null and handled_at is null);

-- courses, lessons
grant select, insert, update, delete on public.courses, public.lessons to authenticated;
create policy courses_read on public.courses for select using (is_admin() or (published and has_access(category)));
create policy courses_admin on public.courses for all using (is_admin()) with check (is_admin());
create policy lessons_read on public.lessons for select using (is_admin() or (published and lesson_visible(course_id, min_tier)));
create policy lessons_admin on public.lessons for all using (is_admin()) with check (is_admin());

-- lesson_progress
grant select, insert, delete on public.lesson_progress to authenticated;
create policy progress_own on public.lesson_progress for select using (user_id = auth.uid() or is_admin());
create policy progress_ins on public.lesson_progress for insert with check (
  user_id = auth.uid() and exists (select 1 from lessons l where l.id = lesson_id and l.published and lesson_visible(l.course_id, l.min_tier)));
create policy progress_del on public.lesson_progress for delete using (user_id = auth.uid());

-- quizzes
grant select, insert, update, delete on public.quizzes to authenticated;
create policy quizzes_read on public.quizzes for select using (is_admin() or (published and has_access(category, min_tier)));
create policy quizzes_admin on public.quizzes for all using (is_admin()) with check (is_admin());

-- questions: 직접 select 불가 (정답 보호). 학생은 quiz_questions(), 관리자는 admin_quiz_questions()
grant insert, update, delete on public.questions to authenticated;
create policy questions_admin_ins on public.questions for insert with check (is_admin());
create policy questions_admin_upd on public.questions for update using (is_admin()) with check (is_admin());
create policy questions_admin_del on public.questions for delete using (is_admin());

-- attempts, attempt_answers: 조회만
grant select on public.attempts, public.attempt_answers to authenticated;
create policy attempts_read on public.attempts for select using (user_id = auth.uid() or is_admin());
create policy answers_read on public.attempt_answers for select using (
  is_admin() or exists (select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid() and a.status <> 'in_progress'));

-- call_bookings: 조회만 (쓰기는 웹훅 service role)
grant select on public.call_bookings to authenticated;
create policy bookings_read on public.call_bookings for select using (user_id = auth.uid() or is_admin());

-- credit_adjustments
grant select, insert, delete on public.credit_adjustments to authenticated;
create policy credits_read on public.credit_adjustments for select using (user_id = auth.uid() or is_admin());
create policy credits_admin_ins on public.credit_adjustments for insert with check (is_admin());
create policy credits_admin_del on public.credit_adjustments for delete using (is_admin());

-- live_sessions: meet_url 컬럼은 학생에게 비공개 (live_link 함수로만)
grant select (id, category, title, starts_at, duration_min, min_tier, created_at) on public.live_sessions to authenticated;
grant insert, update, delete on public.live_sessions to authenticated;
create policy live_read on public.live_sessions for select using (is_admin() or has_access(category, min_tier));
create policy live_admin_ins on public.live_sessions for insert with check (is_admin());
create policy live_admin_upd on public.live_sessions for update using (is_admin()) with check (is_admin());
create policy live_admin_del on public.live_sessions for delete using (is_admin());

-- board
grant select on public.board_posts, public.board_comments to anon;
grant select, insert, update, delete on public.board_posts, public.board_comments to authenticated;
create policy posts_read on public.board_posts for select using (can_read_post(id));
create policy posts_insert on public.board_posts for insert with check (
  author_id = auth.uid() and (
    (kind = 'notice' and is_admin())
    or (kind = 'question' and (is_admin() or has_access(category)))));
create policy posts_update on public.board_posts for update using (author_id = auth.uid() or is_admin())
  with check (author_id = auth.uid() or is_admin());
create policy posts_delete on public.board_posts for delete using (author_id = auth.uid() or is_admin());
create policy comments_read on public.board_comments for select using (can_read_post(post_id));
create policy comments_insert on public.board_comments for insert with check (
  author_id = auth.uid() and can_read_post(post_id)
  and exists (select 1 from board_posts b where b.id = post_id and (b.kind = 'question' or is_admin())));
create policy comments_delete on public.board_comments for delete using (author_id = auth.uid() or is_admin());

-- results, reviews (스페이서)
grant select on public.results, public.reviews to anon, authenticated;
grant insert, update, delete on public.results, public.reviews to authenticated;
create policy results_read on public.results for select using (published or is_admin());
create policy results_admin on public.results for all using (is_admin()) with check (is_admin());
create policy reviews_read on public.reviews for select using (published or is_admin());
create policy reviews_admin on public.reviews for all using (is_admin()) with check (is_admin());

-- 함수 실행 권한
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.can_read_post(uuid) to anon;
grant execute on function public.is_admin() to anon;
grant execute on function public.has_access(text, text) to anon;
grant execute on function public.tier_rank(text) to anon;
-- 웹훅 전용 (service role)
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
revoke execute on function public.call_credits_for(uuid, text, timestamptz) from authenticated;
