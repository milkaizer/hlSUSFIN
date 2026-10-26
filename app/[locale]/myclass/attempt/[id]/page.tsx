import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/validate";
import { QuizRunner, type Q } from "@/components/myclass/QuizRunner";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
type AttemptRow = { id: string; quiz_id: string; status: string; started_at: string; deadline_at: string | null; submitted_at: string | null; score: number | null; max_score: number | null };
type ResultRow = {
  question_id: string; type: Q["type"]; prompt: string; choices: string[]; points: number;
  response: unknown; is_correct: boolean | null; points_awarded: number | null; answer: unknown; explanation: string | null;
};

export const metadata: Metadata = { robots: { index: false } };

// 응시 중이면 문항(정답 없음), 제출 후면 결과(정답·해설 포함)
export default async function AttemptPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireUser(locale, `/myclass/attempt/${id}`);
  const t = await getTranslations("quiz");

  const { data: attempt } = await supabase.from("attempts").select("id,quiz_id,status,started_at,deadline_at,submitted_at,score,max_score").eq("id", id).maybeSingle<AttemptRow>();
  if (!attempt) notFound();
  const { data: quiz } = await supabase.from("quizzes").select("id,title").eq("id", attempt.quiz_id).maybeSingle<{ id: string; title: string }>();

  let current = attempt;
  const now = Date.now();
  // 마감 + 2분이 지난 미제출 응시는 빈 답으로 마감 처리 (서버가 0점 처리)
  if (current.status === "in_progress" && current.deadline_at && new Date(current.deadline_at).getTime() + 120000 < now) {
    await supabase.rpc("submit_attempt", { p_attempt: id, p_responses: {} });
    const { data: again } = await supabase.from("attempts").select("id,quiz_id,status,started_at,deadline_at,submitted_at,score,max_score").eq("id", id).maybeSingle<AttemptRow>();
    if (again) current = again;
  }

  const header = (
    <>
      <Link href={quiz ? `/myclass/quiz/${quiz.id}` : { pathname: "/myclass", query: { tab: "quizzes" } }} className="text-sm font-semibold text-muted hover:text-azul">{t("back")}</Link>
      <h1 className="mt-2 text-[24px] font-extrabold sm:text-[30px]">{quiz?.title ?? t("resultTitle")}</h1>
    </>
  );

  if (current.status === "in_progress") {
    const { data: qs, error } = await supabase.rpc("quiz_questions", { p_quiz: current.quiz_id });
    if (error) {
      return <div className="wrap py-10">{header}<p role="alert" className="mt-6 text-warn">{t("error")}</p></div>;
    }
    const questions: Q[] = ((qs as (Omit<Q, "choices"> & { choices: unknown })[] | null) ?? []).map((q) => ({
      id: q.id, type: q.type, prompt: q.prompt, points: q.points,
      choices: Array.isArray(q.choices) ? q.choices.map(String) : [],
    }));
    return (
      <div className="wrap max-w-3xl py-8 sm:py-10">
        {header}
        <div className="mt-6">
          <QuizRunner attemptId={current.id} questions={questions} deadline={current.deadline_at} serverNow={Date.now()} />
        </div>
      </div>
    );
  }

  const { data: rd } = await supabase.rpc("attempt_result", { p_attempt: id });
  const rows = (rd as ResultRow[] | null) ?? [];
  const pending = current.status === "needs_grading";
  // 자동 채점 문항의 정답이 모두 비어 있으면 아직 공개 전 (모의고사 남은 응시, 권한 만료)
  const hidden = rows.some((r) => r.type !== "essay") && rows.filter((r) => r.type !== "essay").every((r) => r.answer === null || r.answer === undefined);
  const late = Boolean(current.deadline_at && current.submitted_at && new Date(current.submitted_at).getTime() > new Date(current.deadline_at).getTime() + 120000);

  const show = (q: ResultRow, v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    if (q.type === "mcq_single" && typeof v === "number") return `${v + 1}. ${q.choices[v] ?? ""}`;
    if (q.type === "mcq_multi" && Array.isArray(v)) return [...v].sort((a, b) => Number(a) - Number(b)).map((i) => `${Number(i) + 1}. ${q.choices[Number(i)] ?? ""}`).join(", ");
    if (q.type === "short_text" && Array.isArray(v)) return v.map(String).join(", ");
    return String(v);
  };

  return (
    <div className="wrap max-w-3xl py-8 sm:py-10">
      {header}
      {sp.auto === "1" && <p role="status" className="mt-6 rounded-tile border border-azafran bg-azafran-soft p-4 font-semibold" data-testid="auto-submitted">{t("autoSubmitted")}</p>}
      {late && <p className="mt-4 text-sm text-warn">{t("late")}</p>}
      {hidden && <p className="mt-4 rounded-tile bg-paper p-3 text-sm text-muted" data-testid="answers-later">{t("answersLater")}</p>}
      <section className="panel mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 p-5" data-testid="result-summary">
        <h2 className="text-[17px] font-extrabold">{t("resultTitle")}</h2>
        <p className="text-[26px] font-extrabold tabular-nums" data-testid="score">{current.score ?? 0} / {current.max_score ?? 0}</p>
        {pending && <span className="badge bg-azafran-soft text-ink" data-testid="pending-grade">{t("pendingGrade")}</span>}
      </section>
      <ol className="mt-6 space-y-4">
        {rows.map((q, i) => {
          const state = q.is_correct === null ? "pending" : q.is_correct ? "correct" : "wrong";
          const mine = show(q, q.response);
          const answer = q.type === "essay" ? null : show(q, q.answer);
          return (
            <li key={q.question_id} data-result={state}
              className={`panel border-l-[6px] p-5 ${state === "correct" ? "border-l-ok" : state === "wrong" ? "border-l-warn" : "border-l-azafran"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="whitespace-pre-line text-[16px] font-semibold"><span className="mr-2 text-muted">{i + 1}.</span>{q.prompt}</p>
                <span className={`badge ${state === "correct" ? "bg-ok/10 text-ok" : state === "wrong" ? "bg-warn/10 text-warn" : "bg-azafran-soft text-ink"}`}>
                  {state === "correct" ? t("correct") : state === "wrong" ? t("wrong") : t("pendingItem")}
                  {q.points_awarded != null && ` ${q.points_awarded}/${q.points}`}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-[15px]">
                <div className="flex gap-2"><dt className="shrink-0 text-muted">{t("yourAnswer")}</dt><dd className="whitespace-pre-line">{mine ?? <span className="text-muted">{t("noAnswer")}</span>}</dd></div>
                {answer && <div className="flex gap-2"><dt className="shrink-0 text-muted">{t("answer")}</dt><dd className="font-semibold">{answer}</dd></div>}
                {q.explanation && <div className="flex gap-2"><dt className="shrink-0 text-muted">{t("explanation")}</dt><dd className="whitespace-pre-line">{q.explanation}</dd></div>}
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
