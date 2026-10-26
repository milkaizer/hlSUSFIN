import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { requireAdmin } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { isUuid } from "@/lib/validate";
import { H, H2, Notice, Badge } from "@/components/admin/ui";
import { createQuestion, deleteQuestion, deleteQuiz, updateQuestion, updateQuiz } from "../../actions";
import { QuestionFields, QuizFields, type QuestionValues, type QuizValues } from "../QuizFields";

type SP = Promise<Record<string, string | string[] | undefined>>;
const TYPE_LABEL = { mcq_single: "객관식 (하나)", mcq_multi: "객관식 (복수)", short_text: "단답", essay: "서술" } as const;

export default async function QuizDetail({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: SP }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireAdmin(locale, `/admin/quizzes/${id}`);
  const { data: quiz } = await supabase.from("quizzes").select("id,category,title,kind,min_tier,time_limit_min,max_attempts,published").eq("id", id).maybeSingle<QuizValues & { id: string }>();
  if (!quiz) notFound();
  const { data } = await supabase.rpc("admin_quiz_questions", { p_quiz: id });
  const questions = (data as (QuestionValues & { id: string })[] | null) ?? [];
  const total = questions.reduce((n, q) => n + q.points, 0);
  const base = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="quiz_id" value={quiz.id} />
    </>
  );

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/quizzes" className="link">문제 목록</Link></p>
      <H sub={`문항 ${questions.length}개, 총 ${total}점`}>{quiz.title}</H>
      <Notice msg={sp.msg} err={sp.err} />

      <form action={updateQuiz} className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={quiz.id} />
        <QuizFields v={quiz} />
        <div className="lg:col-span-3"><button className="btn-primary">세트 저장</button></div>
      </form>

      <H2>문항</H2>
      {questions.length === 0 && <p className="panel p-5 text-muted">문항이 없습니다. 아래에서 추가하세요.</p>}
      <ol className="space-y-4">
        {questions.map((q, i) => {
          const f = `q-${q.id}`;
          return (
            <li key={q.id} className="panel p-5" data-question={q.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="font-extrabold tabular-nums">{i + 1}</span>
                <Badge tone="blue">{TYPE_LABEL[q.type]}</Badge>
              </div>
              <QuestionFields q={q} formId={f} />
              <div className="mt-4 flex gap-2">
                <form id={f} action={updateQuestion}>{base}<input type="hidden" name="id" value={q.id} /><button className="btn-quiet btn-sm">문항 저장</button></form>
                <form action={deleteQuestion}>{base}<input type="hidden" name="id" value={q.id} /><ConfirmSubmit message="삭제하면 되돌릴 수 없습니다. 계속할까요?" className="btn-danger btn-sm">삭제</ConfirmSubmit></form>
              </div>
            </li>
          );
        })}
      </ol>

      <H2>문항 추가</H2>
      <form action={createQuestion} className="panel p-5">
        {base}
        <QuestionFields q={{ type: "mcq_single", prompt: "", choices: [], answer: null, explanation: null, points: 1, sort: (questions.at(-1)?.sort ?? 0) + 1 }} />
        <button className="btn-primary mt-4">문항 추가</button>
      </form>

      <H2 className="text-warn">세트 삭제</H2>
      <form action={deleteQuiz} className="panel flex flex-wrap items-center justify-between gap-3 border-warn/40 p-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={quiz.id} />
        <p className="text-sm text-muted">문항과 학생 응시 기록도 함께 삭제됩니다. 잠시 숨기려면 비공개로 바꾸세요.</p>
        <ConfirmSubmit message="문항과 학생 응시 기록이 모두 삭제됩니다. 계속할까요?" className="btn-danger">세트 삭제</ConfirmSubmit>
      </form>
    </>
  );
}
