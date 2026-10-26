import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/validate";
import { categoryName } from "@/content/categories";
import { LocalTime } from "@/components/LocalTime";
import { startQuiz } from "../../actions";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
type QuizRow = { id: string; category: string; title: string; kind: "practice" | "mock"; time_limit_min: number | null; max_attempts: number | null };
type AttemptRow = { id: string; status: string; started_at: string; deadline_at: string | null; score: number | null; max_score: number | null };

export const metadata: Metadata = { robots: { index: false } };

export default async function QuizInfo({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const { supabase, profile } = await requireUser(locale, `/myclass/quiz/${id}`);
  const t = await getTranslations("myclass");
  const q = await getTranslations("quiz");

  const { data: quiz } = await supabase.from("quizzes").select("id,category,title,kind,time_limit_min,max_attempts").eq("id", id).maybeSingle<QuizRow>();
  if (!quiz) notFound();
  const { data: ad } = await supabase.from("attempts").select("id,status,started_at,deadline_at,score,max_score")
    .eq("quiz_id", id).eq("user_id", profile.id).order("started_at", { ascending: false });
  const attempts = (ad as AttemptRow[] | null) ?? [];
  const now = Date.now();
  const open = attempts.find((a) => a.status === "in_progress" && (!a.deadline_at || new Date(a.deadline_at).getTime() + 120000 > now));
  const left = quiz.max_attempts == null ? null : Math.max(0, quiz.max_attempts - attempts.length);

  return (
    <div className="wrap py-8 sm:py-10">
      <Link href={{ pathname: "/myclass", query: { tab: "quizzes" } }} className="text-sm font-semibold text-muted hover:text-azul">{q("back")}</Link>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={`badge ${quiz.kind === "mock" ? "bg-azafran-soft text-ink" : "bg-azul-soft text-azul-deep"}`}>{quiz.kind === "mock" ? t("quizMock") : t("quizPractice")}</span>
        <span className="text-muted">{categoryName(quiz.category, locale)}</span>
      </div>
      <h1 className="mt-2 text-[26px] font-extrabold sm:text-[32px]">{quiz.title}</h1>
      <p className="mt-2 text-muted">
        {quiz.time_limit_min ? t("minutes", { n: quiz.time_limit_min }) : t("noLimit")}, {left == null ? t("unlimited") : t("attemptsLeft", { n: left })}
      </p>
      {sp.err === "1" && <p role="alert" className="mt-5 rounded-tile border border-warn/40 bg-warn/10 p-4 font-semibold text-warn">{t("noMoreAttempts")}</p>}
      <div className="mt-6">
        {open ? (
          <Link href={`/myclass/attempt/${open.id}`} className="btn-primary" data-testid="continue-quiz">{t("continue")}</Link>
        ) : left === 0 ? (
          <p className="font-semibold text-muted" data-testid="no-more-attempts">{t("noMoreAttempts")}</p>
        ) : (
          <form action={startQuiz}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="quiz_id" value={quiz.id} />
            <button className="btn-primary" data-testid="start-quiz">{t("start")}</button>
          </form>
        )}
      </div>
      <section className="mt-12">
        <h2 className="text-[19px] font-extrabold">{t("pastAttempts")}</h2>
        {attempts.length === 0 ? (
          <p className="mt-2 text-muted">{t("noAttempts")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <LocalTime iso={a.started_at} locale={locale} />
                  <span className="ml-2 text-sm text-muted">{t(`attempt_${a.status}` as "attempt_graded")}</span>
                </span>
                <span className="flex items-center gap-3">
                  {a.score != null && <span className="font-semibold tabular-nums">{a.score} / {a.max_score}</span>}
                  {a.status !== "in_progress" && <Link href={`/myclass/attempt/${a.id}`} className="btn-quiet btn-sm">{t("viewResult")}</Link>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
