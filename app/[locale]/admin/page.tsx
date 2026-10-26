import { requireAdmin } from "@/lib/auth";
import { H, Card } from "@/components/admin/ui";

// 현황: 처리할 일 카운트 (6.11)
export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { supabase } = await requireAdmin(locale, "/admin");
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [pendingMembers, pendingRequests, needsGrading, overLimit, questions, answered] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(supabase.from("enrollment_requests").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(supabase.from("attempts").select("id", { count: "exact", head: true }).eq("status", "needs_grading")),
    count(supabase.from("call_bookings").select("id", { count: "exact", head: true }).eq("status", "over_limit")),
    supabase.from("board_posts").select("id").eq("kind", "question"),
    supabase.from("board_comments").select("post_id").eq("is_instructor", true),
  ]);
  const answeredIds = new Set((answered.data ?? []).map((c: { post_id: string }) => c.post_id));
  const waiting = (questions.data ?? []).filter((q: { id: string }) => !answeredIds.has(q.id)).length;

  return (
    <>
      <H sub="처리할 일이 있는 항목은 숫자가 강조됩니다.">현황</H>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card label="승인 대기 회원" value={pendingMembers} href="/admin/members?status=pending" tone="warn" />
        <Card label="대기 중인 수강신청" value={pendingRequests} href="/admin/requests" tone="warn" />
        <Card label="채점 대기" value={needsGrading} href="/admin/grading" tone="warn" />
        <Card label="확인 필요한 예약" value={overLimit} href="/admin/calls?status=over_limit" tone="warn" />
        <Card label="답변 대기 질문" value={waiting} href="/admin/board" tone="warn" />
      </div>
    </>
  );
}
