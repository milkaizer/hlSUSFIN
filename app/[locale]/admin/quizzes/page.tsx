import { requireAdmin } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { categoryName } from "@/content/categories";
import { tierName } from "@/content/tiers";
import { H, H2, Notice, Table, TD, Badge, Empty } from "@/components/admin/ui";
import { createQuiz } from "../actions";
import { QuizFields } from "./QuizFields";

type QuizRow = { id: string; category: string; title: string; kind: string; min_tier: string; time_limit_min: number | null; max_attempts: number | null; published: boolean };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function QuizzesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/quizzes");
  const { data } = await supabase.from("quizzes").select("id,category,title,kind,min_tier,time_limit_min,max_attempts,published").order("category").order("created_at");
  const quizzes = (data as QuizRow[] | null) ?? [];
  // questions 는 직접 select 할 수 없어 관리자 함수로 센다
  const counts = await Promise.all(quizzes.map(async (q) => {
    const { data: qs } = await supabase.rpc("admin_quiz_questions", { p_quiz: q.id });
    return Array.isArray(qs) ? qs.length : 0;
  }));
  return (
    <>
      <H sub="문항과 정답은 세트 상세에서 편집합니다. 학생에게는 제출 후에만 정답과 해설이 보입니다.">문제</H>
      <Notice msg={sp.msg} err={sp.err} />
      <Table head={["과목", "제목", "유형", "최소 단계", "시간", "횟수", "문항", "공개"]} empty={quizzes.length === 0 ? <Empty>문제 세트가 없습니다.</Empty> : null}>
        {quizzes.map((q, i) => (
          <tr key={q.id}>
            <TD className="whitespace-nowrap">{categoryName(q.category, "ko")}</TD>
            <TD><Link href={`/admin/quizzes/${q.id}`} className="link">{q.title}</Link></TD>
            <TD>{q.kind === "mock" ? <Badge tone="yellow">모의고사</Badge> : <Badge tone="blue">연습</Badge>}</TD>
            <TD>{tierName(q.min_tier, "ko")}</TD>
            <TD className="whitespace-nowrap">{q.time_limit_min ? `${q.time_limit_min}분` : "제한 없음"}</TD>
            <TD className="whitespace-nowrap">{q.max_attempts ? `${q.max_attempts}회` : "제한 없음"}</TD>
            <TD className="tabular-nums">{counts[i]}</TD>
            <TD>{q.published ? <Badge tone="green">공개</Badge> : <Badge>비공개</Badge>}</TD>
          </tr>
        ))}
      </Table>
      <H2>새 문제 세트</H2>
      <form action={createQuiz} className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="locale" value={locale} />
        <QuizFields />
        <div className="lg:col-span-3"><button className="btn-primary">세트 만들기</button></div>
      </form>
    </>
  );
}
