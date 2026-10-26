"use server";
import { adminContext } from "@/lib/admin-action";
import { bool, int, kstDayEnd, kstDayStart, kstLocal, lines, parseVideo, str } from "@/lib/admin-utils";
import { isMeetUrl, isUuid, safeHttpsUrl } from "@/lib/validate";
import { isCategorySlug } from "@/content/categories";
import { isTierSlug } from "@/content/tiers";

// ---------------------------------------------------------------
// 회원·권한 (P3)
// ---------------------------------------------------------------

export async function setMemberStatus(fd: FormData) {
  const { supabase, user, done } = await adminContext(fd);
  const target = str(fd, "user_id");
  const status = str(fd, "status");
  const role = str(fd, "role") || null;
  const back = str(fd, "back") === "detail" ? `/admin/members/${target}` : `/admin/members${str(fd, "filter") ? `?status=${str(fd, "filter")}` : ""}`;
  if (!isUuid(target) || !["pending", "approved", "blocked"].includes(status) || (role && !["admin", "student"].includes(role))) {
    return done(back, { err: "input" });
  }
  if (target === user.id && (status !== "approved" || (role && role !== "admin"))) return done(back, { err: "self" });
  const { error } = await supabase.rpc("admin_set_profile", { p_user: target, p_status: status, p_role: role });
  done(back, error ? { err: "db" } : { msg: "saved" });
}

export async function grantAccess(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const target = str(fd, "user_id");
  const back = `/admin/members/${target}`;
  const category = str(fd, "category");
  const tier = str(fd, "tier");
  const starts = kstDayStart(str(fd, "starts"));
  const expires = kstDayEnd(str(fd, "expires"));
  if (!isUuid(target) || !isCategorySlug(category) || !isTierSlug(tier)) return done(back, { err: "input" });
  if (!starts || !expires || new Date(expires) <= new Date(starts)) return done(back, { err: "date" });
  const { error } = await supabase.rpc("grant_access", {
    p_user: target, p_category: category, p_tier: tier, p_starts: starts, p_expires: expires,
    p_source: "admin", p_note: str(fd, "note", 300) || null,
  });
  done(back, error ? { err: "db" } : { msg: "granted" });
}

export async function updateEntitlement(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const target = str(fd, "user_id");
  const id = str(fd, "id");
  const back = `/admin/members/${target}`;
  const tier = str(fd, "tier");
  const expiresInput = str(fd, "expires");
  const expires = expiresInput ? kstDayEnd(expiresInput) : null;
  if (!isUuid(id) || !isUuid(target) || !isTierSlug(tier) || (expiresInput && !expires)) return done(back, { err: "input" });
  const { error } = await supabase.rpc("admin_update_entitlement", { p_id: id, p_tier: tier, p_expires: expires });
  done(back, error ? { err: error.message.includes("check") ? "date" : "db" } : { msg: "saved" });
}

export async function revokeEntitlement(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const target = str(fd, "user_id");
  const id = str(fd, "id");
  const back = `/admin/members/${target}`;
  if (!isUuid(id) || !isUuid(target)) return done(back, { err: "input" });
  const { error } = await supabase.rpc("admin_revoke_entitlement", { p_id: id });
  done(back, error ? { err: "db" } : { msg: "revoked" });
}

export async function addCreditAdjustment(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const target = str(fd, "user_id");
  const back = `/admin/members/${target}`;
  const category = str(fd, "category");
  const month = str(fd, "month");
  const delta = int(fd, "delta");
  if (!isUuid(target) || !isCategorySlug(category) || !/^\d{4}-\d{2}$/.test(month) || delta === null || delta === 0 || Math.abs(delta) > 100) {
    return done(back, { err: "input" });
  }
  const { error } = await supabase.from("credit_adjustments").insert({
    user_id: target, category, month: `${month}-01`, delta, note: str(fd, "note", 300) || null,
  });
  done(back, error ? { err: "db" } : { msg: "saved" });
}

export async function deleteCreditAdjustment(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const target = str(fd, "user_id");
  const id = str(fd, "id");
  const back = `/admin/members/${target}`;
  if (!isUuid(id) || !isUuid(target)) return done(back, { err: "input" });
  const { error } = await supabase.from("credit_adjustments").delete().eq("id", id);
  done(back, error ? { err: "db" } : { msg: "deleted" });
}

// ---------------------------------------------------------------
// 수강신청 (P4)
// ---------------------------------------------------------------

export async function approveRequest(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  const starts = kstDayStart(str(fd, "starts"));
  const expires = kstDayEnd(str(fd, "expires"));
  if (!isUuid(id)) return done("/admin/requests", { err: "input" });
  if (!starts || !expires || new Date(expires) <= new Date(starts)) return done("/admin/requests", { err: "date" });
  const { error } = await supabase.rpc("approve_request", { p_request: id, p_starts: starts, p_expires: expires });
  done("/admin/requests", error ? { err: "db" } : { msg: "approved" });
}

export async function rejectRequest(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  if (!isUuid(id)) return done("/admin/requests", { err: "input" });
  const { error } = await supabase.rpc("reject_request", { p_request: id });
  done("/admin/requests", error ? { err: "db" } : { msg: "rejected" });
}


// ---------------------------------------------------------------
// 강의·레슨 (P4)
// ---------------------------------------------------------------

export async function createCourse(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const category = str(fd, "category");
  const title = str(fd, "title", 200);
  if (!isCategorySlug(category) || !title) return done("/admin/content", { err: "input" });
  const { data, error } = await supabase.from("courses").insert({
    category, title, description: str(fd, "description", 2000) || null, sort: int(fd, "sort") ?? 0, published: bool(fd, "published"),
  }).select("id").single();
  if (error || !data) return done("/admin/content", { err: "db" });
  done(`/admin/content/${data.id}`, { msg: "created" });
}

export async function updateCourse(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  const back = `/admin/content/${id}`;
  const category = str(fd, "category");
  const title = str(fd, "title", 200);
  if (!isUuid(id) || !isCategorySlug(category) || !title) return done(back, { err: "input" });
  const { error } = await supabase.from("courses").update({
    category, title, description: str(fd, "description", 2000) || null, sort: int(fd, "sort") ?? 0, published: bool(fd, "published"),
  }).eq("id", id);
  done(back, error ? { err: "db" } : { msg: "saved" });
}

export async function deleteCourse(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  if (!isUuid(id)) return done("/admin/content", { err: "input" });
  const { error } = await supabase.from("courses").delete().eq("id", id);
  done("/admin/content", error ? { err: "db" } : { msg: "deleted" });
}

function lessonFields(fd: FormData): { ok: true; values: Record<string, unknown> } | { ok: false; err: string } {
  const title = str(fd, "title", 200);
  const tier = str(fd, "min_tier");
  const videoInput = str(fd, "video", 500);
  const materials = str(fd, "materials_url", 1000);
  if (!title || !isTierSlug(tier)) return { ok: false, err: "input" };
  const video = parseVideo(videoInput);
  if (videoInput && !video.id) return { ok: false, err: "video" };
  if (materials && !safeHttpsUrl(materials)) return { ok: false, err: "url" };
  return {
    ok: true,
    values: {
      title, min_tier: tier, sort: int(fd, "sort") ?? 0, published: bool(fd, "published"),
      video_provider: video.provider, video_id: video.id, materials_url: materials || null,
    },
  };
}

export async function createLesson(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const courseId = str(fd, "course_id");
  const back = `/admin/content/${courseId}`;
  if (!isUuid(courseId)) return done("/admin/content", { err: "input" });
  const f = lessonFields(fd);
  if (!f.ok) return done(back, { err: f.err });
  const { error } = await supabase.from("lessons").insert({ ...f.values, course_id: courseId });
  done(back, error ? { err: "db" } : { msg: "created" });
}

export async function updateLesson(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const courseId = str(fd, "course_id");
  const id = str(fd, "id");
  const back = `/admin/content/${courseId}`;
  if (!isUuid(courseId) || !isUuid(id)) return done("/admin/content", { err: "input" });
  const f = lessonFields(fd);
  if (!f.ok) return done(back, { err: f.err });
  const { error } = await supabase.from("lessons").update(f.values).eq("id", id).eq("course_id", courseId);
  done(back, error ? { err: "db" } : { msg: "saved" });
}

export async function deleteLesson(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const courseId = str(fd, "course_id");
  const id = str(fd, "id");
  const back = `/admin/content/${courseId}`;
  if (!isUuid(courseId) || !isUuid(id)) return done("/admin/content", { err: "input" });
  const { error } = await supabase.from("lessons").delete().eq("id", id).eq("course_id", courseId);
  done(back, error ? { err: "db" } : { msg: "deleted" });
}

// ---------------------------------------------------------------
// 문제·채점 (P5)
// ---------------------------------------------------------------

function quizFields(fd: FormData): Record<string, unknown> | null {
  const category = str(fd, "category");
  const title = str(fd, "title", 200);
  const kind = str(fd, "kind");
  const tier = str(fd, "min_tier");
  const time = int(fd, "time_limit_min");
  const max = int(fd, "max_attempts");
  if (!isCategorySlug(category) || !title || !["practice", "mock"].includes(kind) || !isTierSlug(tier)) return null;
  if ((time !== null && (time <= 0 || time > 600)) || (max !== null && (max <= 0 || max > 100))) return null;
  return { category, title, kind, min_tier: tier, time_limit_min: time, max_attempts: max, published: bool(fd, "published") };
}

export async function createQuiz(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const values = quizFields(fd);
  if (!values) return done("/admin/quizzes", { err: "input" });
  const { data, error } = await supabase.from("quizzes").insert(values).select("id").single();
  if (error || !data) return done("/admin/quizzes", { err: "db" });
  done(`/admin/quizzes/${data.id}`, { msg: "created" });
}

export async function updateQuiz(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  const back = `/admin/quizzes/${id}`;
  const values = quizFields(fd);
  if (!isUuid(id) || !values) return done(back, { err: "input" });
  const { error } = await supabase.from("quizzes").update(values).eq("id", id);
  done(back, error ? { err: "db" } : { msg: "saved" });
}

export async function deleteQuiz(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  if (!isUuid(id)) return done("/admin/quizzes", { err: "input" });
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  done("/admin/quizzes", error ? { err: "db" } : { msg: "deleted" });
}

// 객관식 정답은 1부터 시작하는 번호로 입력받아 0부터 시작하는 인덱스로 저장 (6.11)
function questionFields(fd: FormData): { ok: true; values: Record<string, unknown> } | { ok: false; err: string } {
  const type = str(fd, "type");
  const prompt = str(fd, "prompt", 5000);
  const points = int(fd, "points");
  if (!["mcq_single", "mcq_multi", "short_text", "essay"].includes(type) || !prompt || points === null || points < 0 || points > 1000) {
    return { ok: false, err: "input" };
  }
  const choices = type.startsWith("mcq") ? lines(str(fd, "choices", 5000)).slice(0, 20) : [];
  const answerRaw = str(fd, "answer", 5000);
  let answer: unknown = null;
  if (type === "mcq_single") {
    const n = Number(answerRaw);
    if (choices.length < 2 || !Number.isInteger(n) || n < 1 || n > choices.length) return { ok: false, err: "answer" };
    answer = n - 1;
  } else if (type === "mcq_multi") {
    const parts = answerRaw.split(/[,\s]+/).filter(Boolean).map(Number);
    if (choices.length < 2 || parts.length === 0 || parts.some((n) => !Number.isInteger(n) || n < 1 || n > choices.length)) return { ok: false, err: "answer" };
    answer = [...new Set(parts.map((n) => n - 1))].sort((a, b) => a - b);
  } else if (type === "short_text") {
    const accepted = lines(answerRaw).slice(0, 50);
    if (accepted.length === 0) return { ok: false, err: "answer" };
    answer = accepted;
  }
  return {
    ok: true,
    values: { p_type: type, p_prompt: prompt, p_choices: choices, p_answer: answer, p_explanation: str(fd, "explanation", 5000) || null, p_points: points, p_sort: int(fd, "sort") ?? 0 },
  };
}

export async function createQuestion(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const quizId = str(fd, "quiz_id");
  const back = `/admin/quizzes/${quizId}`;
  if (!isUuid(quizId)) return done("/admin/quizzes", { err: "input" });
  const f = questionFields(fd);
  if (!f.ok) return done(back, { err: f.err });
  const { error } = await supabase.rpc("admin_save_question", { p_id: null, p_quiz: quizId, ...f.values });
  done(back, error ? { err: "db" } : { msg: "created" });
}

export async function updateQuestion(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const quizId = str(fd, "quiz_id");
  const id = str(fd, "id");
  const back = `/admin/quizzes/${quizId}`;
  if (!isUuid(quizId) || !isUuid(id)) return done("/admin/quizzes", { err: "input" });
  const f = questionFields(fd);
  if (!f.ok) return done(back, { err: f.err });
  const { error } = await supabase.rpc("admin_save_question", { p_id: id, p_quiz: quizId, ...f.values });
  done(back, error ? { err: "db" } : { msg: "saved" });
}

export async function deleteQuestion(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const quizId = str(fd, "quiz_id");
  const id = str(fd, "id");
  const back = `/admin/quizzes/${quizId}`;
  if (!isUuid(quizId) || !isUuid(id)) return done("/admin/quizzes", { err: "input" });
  const { error } = await supabase.rpc("admin_delete_question", { p_id: id });
  done(back, error ? { err: "db" } : { msg: "deleted" });
}

export async function gradeEssays(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const attemptId = str(fd, "attempt_id");
  const back = `/admin/grading/${attemptId}`;
  if (!isUuid(attemptId)) return done("/admin/grading", { err: "input" });
  const entries = [...fd.entries()].filter(([k]) => k.startsWith("score_"));
  for (const [k, v] of entries) {
    const questionId = k.slice(6);
    const raw = String(v).trim();
    if (!raw) continue;
    const pts = Number(raw);
    const max = Number(fd.get(`max_${questionId}`));
    if (!isUuid(questionId) || !Number.isFinite(pts) || pts < 0 || (Number.isFinite(max) && pts > max)) return done(back, { err: "input" });
    const { error } = await supabase.rpc("grade_essay", { p_attempt: attemptId, p_question: questionId, p_points: pts });
    if (error) return done(back, { err: "db" });
  }
  done(back, { msg: "graded" });
}

// ---------------------------------------------------------------
// 라이브 (P6). 입력은 서울 시간, Meet 링크는 https://meet.google.com/ 만
// ---------------------------------------------------------------

function liveFields(fd: FormData): { ok: true; values: Record<string, unknown> } | { ok: false; err: string } {
  const category = str(fd, "category");
  const title = str(fd, "title", 200);
  const startsAt = kstLocal(str(fd, "starts_at"));
  const duration = int(fd, "duration_min");
  const tier = str(fd, "min_tier");
  const meet = str(fd, "meet_url", 300);
  if (!isCategorySlug(category) || !title || !isTierSlug(tier) || duration === null || duration <= 0 || duration > 600) return { ok: false, err: "input" };
  if (!startsAt) return { ok: false, err: "date" };
  if (meet && !isMeetUrl(meet)) return { ok: false, err: "meet" };
  return { ok: true, values: { category, title, starts_at: startsAt, duration_min: duration, min_tier: tier, meet_url: meet || null } };
}

export async function createLive(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const f = liveFields(fd);
  if (!f.ok) return done("/admin/live", { err: f.err });
  const { error } = await supabase.from("live_sessions").insert(f.values);
  done("/admin/live", error ? { err: "db" } : { msg: "created" });
}

export async function updateLive(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  if (!isUuid(id)) return done("/admin/live", { err: "input" });
  const f = liveFields(fd);
  if (!f.ok) return done("/admin/live", { err: f.err });
  const { error } = await supabase.from("live_sessions").update(f.values).eq("id", id);
  done("/admin/live", error ? { err: "db" } : { msg: "saved" });
}

export async function deleteLive(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  if (!isUuid(id)) return done("/admin/live", { err: "input" });
  const { error } = await supabase.from("live_sessions").delete().eq("id", id);
  done("/admin/live", error ? { err: "db" } : { msg: "deleted" });
}

// ---------------------------------------------------------------
// 합격자·후기 (P7 스페이서). 플래그와 무관하게 항상 동작
// ---------------------------------------------------------------

function showcaseCategory(fd: FormData) {
  const c = str(fd, "category");
  return isCategorySlug(c) ? c : null;
}

export async function saveResult(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  const masked = str(fd, "masked_name", 50);
  const headline = str(fd, "headline", 200);
  const year = int(fd, "year");
  if (!masked || !headline || (id && !isUuid(id)) || (year !== null && (year < 2000 || year > 2100))) return done("/admin/showcase", { err: "input" });
  const values = { category: showcaseCategory(fd), masked_name: masked, headline, detail: str(fd, "detail", 2000) || null, year, published: bool(fd, "published") };
  const { error } = id ? await supabase.from("results").update(values).eq("id", id) : await supabase.from("results").insert(values);
  done("/admin/showcase", error ? { err: "db" } : { msg: id ? "saved" : "created" });
}

export async function deleteResult(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  if (!isUuid(id)) return done("/admin/showcase", { err: "input" });
  const { error } = await supabase.from("results").delete().eq("id", id);
  done("/admin/showcase", error ? { err: "db" } : { msg: "deleted" });
}

export async function saveReview(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  const masked = str(fd, "masked_name", 50);
  const body = str(fd, "body", 5000);
  if (!masked || !body || (id && !isUuid(id))) return done("/admin/showcase", { err: "input" });
  const values = { category: showcaseCategory(fd), masked_name: masked, body, published: bool(fd, "published") };
  const { error } = id ? await supabase.from("reviews").update(values).eq("id", id) : await supabase.from("reviews").insert(values);
  done("/admin/showcase", error ? { err: "db" } : { msg: id ? "saved" : "created" });
}

export async function deleteReview(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const id = str(fd, "id");
  if (!isUuid(id)) return done("/admin/showcase", { err: "input" });
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  done("/admin/showcase", error ? { err: "db" } : { msg: "deleted" });
}

// ---------------------------------------------------------------
// 단계 설정 (P7)
// ---------------------------------------------------------------

export async function updateTier(fd: FormData) {
  const { supabase, done } = await adminContext(fd);
  const slug = str(fd, "slug");
  const calls = int(fd, "monthly_call_credits");
  const priceRaw = str(fd, "price_krw").replace(/[,\s]/g, "");
  const price = priceRaw === "" ? null : /^\d{1,9}$/.test(priceRaw) ? Number(priceRaw) : NaN;
  const nameKo = str(fd, "name_ko", 30);
  const nameEn = str(fd, "name_en", 30);
  if (!isTierSlug(slug) || calls === null || calls < 0 || calls > 100 || Number.isNaN(price) || !nameKo || !nameEn) return done("/admin/settings", { err: "input" });
  const { error } = await supabase.from("tiers").update({
    monthly_call_credits: calls, live_access: bool(fd, "live_access"), price_krw: price, name_ko: nameKo, name_en: nameEn,
  }).eq("slug", slug);
  done("/admin/settings", error ? { err: "db" } : { msg: "saved" });
}
