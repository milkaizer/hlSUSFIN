import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { isUuid } from "@/lib/validate";
import { kstLabel } from "@/lib/admin-utils";
import { H, H2, Notice, Badge } from "@/components/admin/ui";
import { gradeEssays } from "../../actions";

type Attempt = { id: string; status: string; submitted_at: string | null; score: number | null; max_score: number | null; profiles: { email: string } | null; quizzes: { title: string } | null };
type Item = { question_id: string; type: string; prompt: string; choices: string[]; points: number; response: unknown; is_correct: boolean | null; points_awarded: number | null };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function GradeAttempt({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: SP }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireAdmin(locale, `/admin/grading/${id}`);
  const { data: attempt } = await supabase.from("attempts").select("id,status,submitted_at,score,max_score,profiles(email),quizzes(title)").eq("id", id).maybeSingle<Attempt>();
  if (!attempt || attempt.status === "in_progress") notFound();
  const { data } = await supabase.rpc("attempt_result", { p_attempt: id });
  const items = (data as Item[] | null) ?? [];
  const essays = items.filter((i) => i.type === "essay");

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/grading" className="link">채점 목록</Link></p>
      <H sub={`${attempt.profiles?.email ?? ""}, ${attempt.submitted_at ? kstLabel(attempt.submitted_at) : ""}`}>{attempt.quizzes?.title ?? "응시"}</H>
      <Notice msg={sp.msg} err={sp.err} />
      <p className="panel mb-6 flex items-center gap-3 p-4">
        <span className="text-sm text-muted">현재 점수</span>
        <span className="text-[22px] font-extrabold tabular-nums" data-testid="attempt-score">{attempt.score ?? 0} / {attempt.max_score ?? 0}</span>
        {attempt.status === "graded" ? <Badge tone="green">채점 완료</Badge> : <Badge tone="yellow">채점 대기</Badge>}
      </p>
      <H2>서술형 {essays.length}문항</H2>
      <form action={gradeEssays} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="attempt_id" value={attempt.id} />
        {essays.map((q) => (
          <div key={q.question_id} className="panel p-5">
            <p className="whitespace-pre-line font-semibold">{q.prompt}</p>
            <p className="mt-3 whitespace-pre-line rounded-tile bg-paper p-3 text-[15px]">{typeof q.response === "string" && q.response ? q.response : <span className="text-muted">답하지 않음</span>}</p>
            <label className="mt-3 flex items-center gap-2">
              <span className="text-sm font-semibold">점수</span>
              <input type="number" name={`score_${q.question_id}`} min={0} max={q.points} step="0.5" defaultValue={q.points_awarded ?? ""} className="field w-24 py-1.5" aria-label="점수" />
              <span className="text-sm text-muted">/ {q.points}</span>
              <input type="hidden" name={`max_${q.question_id}`} value={q.points} />
            </label>
          </div>
        ))}
        {essays.length > 0 && <button className="btn-primary">채점 저장</button>}
      </form>
      <H2>자동 채점 문항</H2>
      <ul className="divide-y divide-line rounded-tile border border-line bg-white">
        {items.filter((i) => i.type !== "essay").map((q) => (
          <li key={q.question_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 truncate">{q.prompt}</span>
            {q.is_correct ? <Badge tone="green">정답 {q.points_awarded}/{q.points}</Badge> : <Badge tone="red">오답 0/{q.points}</Badge>}
          </li>
        ))}
      </ul>
    </>
  );
}
