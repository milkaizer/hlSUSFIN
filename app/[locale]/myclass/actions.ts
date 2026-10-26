"use server";
import { redirect } from "next/navigation";
import { getViewer, localePath } from "@/lib/auth";
import { isUuid } from "@/lib/validate";

function localeOf(fd: FormData) {
  return fd.get("locale") === "en" ? "en" : "ko";
}

async function viewerOrLogin(locale: string) {
  const v = await getViewer();
  if (!v.supabase || !v.user || !v.profile) redirect(`${localePath(locale, "/login")}?next=${localePath(locale, "/myclass")}`);
  return { supabase: v.supabase, user: v.user, profile: v.profile };
}

// 레슨 완료 토글. RLS 가 볼 수 있는 레슨만 insert 를 허용한다
export async function toggleLesson(fd: FormData) {
  const locale = localeOf(fd);
  const lessonId = String(fd.get("lesson_id") ?? "");
  const done = fd.get("done") === "1";
  const back = String(fd.get("back") ?? "");
  const { supabase, user } = await viewerOrLogin(locale);
  if (isUuid(lessonId)) {
    if (done) {
      await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
    } else {
      await supabase.from("lesson_progress").upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
    }
  }
  const target = back === "lesson" && isUuid(lessonId) ? `/myclass/lesson/${lessonId}` : "/myclass?tab=courses";
  redirect(localePath(locale, target));
}

// 응시 시작 (진행 중이면 그 응시로). 횟수 초과면 퀴즈 안내로 돌아간다
export async function startQuiz(fd: FormData) {
  const locale = localeOf(fd);
  const quizId = String(fd.get("quiz_id") ?? "");
  if (!isUuid(quizId)) redirect(localePath(locale, "/myclass?tab=quizzes"));
  const { supabase } = await viewerOrLogin(locale);
  const { data, error } = await supabase.rpc("start_attempt", { p_quiz: quizId });
  if (error || typeof data !== "string") redirect(`${localePath(locale, `/myclass/quiz/${quizId}`)}?err=1`);
  redirect(localePath(locale, `/myclass/attempt/${data}`));
}

// 제출. 클라이언트 QuizRunner 가 호출한다. 채점은 DB 함수가 한다
export async function submitAttempt(attemptId: string, responses: Record<string, unknown>) {
  if (!isUuid(attemptId) || typeof responses !== "object" || responses === null || Array.isArray(responses)) return { ok: false as const };
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(responses)) {
    if (!isUuid(k)) continue;
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 100) clean[k] = v;
    else if (Array.isArray(v) && v.length <= 100 && v.every((x) => typeof x === "number" && Number.isInteger(x) && x >= 0 && x < 100)) clean[k] = v;
    else if (typeof v === "string") clean[k] = v.slice(0, 20000);
  }
  const v = await getViewer();
  if (!v.supabase || !v.user) return { ok: false as const };
  const { error } = await v.supabase.rpc("submit_attempt", { p_attempt: attemptId, p_responses: clean });
  if (error && !error.message.includes("already submitted")) return { ok: false as const };
  return { ok: true as const };
}
