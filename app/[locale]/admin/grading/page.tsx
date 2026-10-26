import { requireAdmin } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { categoryName } from "@/content/categories";
import { kstLabel } from "@/lib/admin-utils";
import { H, Notice, Table, TD, Empty } from "@/components/admin/ui";

type Row = { id: string; submitted_at: string | null; score: number | null; max_score: number | null; profiles: { email: string } | null; quizzes: { title: string; category: string } | null };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function GradingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/grading");
  const { data } = await supabase.from("attempts").select("id,submitted_at,score,max_score,profiles(email),quizzes(title,category)")
    .eq("status", "needs_grading").order("submitted_at");
  const rows = (data as Row[] | null) ?? [];
  return (
    <>
      <H sub="서술형 문항이 있는 응시입니다. 모든 서술형을 채점하면 학생에게 점수가 확정됩니다.">채점</H>
      <Notice msg={sp.msg} err={sp.err} />
      <Table head={["제출", "학생", "문제", "과목", "자동 채점 점수", ""]} empty={rows.length === 0 ? <Empty>채점할 응시가 없습니다.</Empty> : null}>
        {rows.map((r) => (
          <tr key={r.id}>
            <TD className="whitespace-nowrap text-muted">{r.submitted_at ? kstLabel(r.submitted_at) : ""}</TD>
            <TD>{r.profiles?.email ?? ""}</TD>
            <TD>{r.quizzes?.title ?? ""}</TD>
            <TD className="whitespace-nowrap">{r.quizzes ? categoryName(r.quizzes.category, "ko") : ""}</TD>
            <TD className="tabular-nums">{r.score ?? 0} / {r.max_score ?? 0}</TD>
            <TD><Link href={`/admin/grading/${r.id}`} className="btn-quiet btn-sm">채점하기</Link></TD>
          </tr>
        ))}
      </Table>
    </>
  );
}
