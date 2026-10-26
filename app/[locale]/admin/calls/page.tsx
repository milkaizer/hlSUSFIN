import { requireAdmin } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { categoryName } from "@/content/categories";
import { kstLabel } from "@/lib/admin-utils";
import { isMeetUrl } from "@/lib/validate";
import { H, Notice, Table, TD, Badge, Empty } from "@/components/admin/ui";

type Booking = {
  id: string; cal_uid: string; user_id: string | null; category: string | null; attendee_email: string | null;
  starts_at: string; status: "accepted" | "cancelled" | "over_limit"; meet_url: string | null; profiles: { email: string } | null;
};
type SP = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = [
  { v: "all", label: "전체" },
  { v: "accepted", label: "확정" },
  { v: "over_limit", label: "확인 필요" },
  { v: "cancelled", label: "취소" },
  { v: "unmatched", label: "회원 미확인" },
];

export default async function AdminCalls({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/calls");
  const status = typeof sp.status === "string" && FILTERS.some((f) => f.v === sp.status) ? sp.status : "all";
  let q = supabase.from("call_bookings").select("id,cal_uid,user_id,category,attendee_email,starts_at,status,meet_url,profiles(email)").order("starts_at", { ascending: false }).limit(300);
  if (status === "unmatched") q = q.is("user_id", null);
  else if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  const rows = (data as Booking[] | null) ?? [];

  return (
    <>
      <H sub="Cal.com 예약이 웹훅으로 들어옵니다. 확인 필요는 이번 달 횟수를 넘었거나, 예약자 이메일이 회원과 맞지 않거나, 과목을 알 수 없는 예약입니다. Cal.com 에서 막을 수 없으니 확인 후 Cal.com 에서 취소하거나 크레딧을 조정하세요.">회화콜</H>
      <Notice msg={sp.msg} err={sp.err} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.v} href={{ pathname: "/admin/calls", query: f.v === "all" ? {} : { status: f.v } }} aria-current={status === f.v ? "page" : undefined}
            className="btn-quiet btn-sm aria-[current=page]:border-azul aria-[current=page]:bg-azul-soft aria-[current=page]:text-azul">{f.label}</Link>
        ))}
      </div>
      <Table head={["시작 (서울)", "회원", "과목", "상태", "Meet"]} empty={rows.length === 0 ? <Empty>예약이 없습니다.</Empty> : null}>
        {rows.map((b) => {
          const meet = isMeetUrl(b.meet_url) ? b.meet_url : null;
          return (
            <tr key={b.id} data-booking={b.cal_uid}>
              <TD className="whitespace-nowrap">{kstLabel(b.starts_at)}</TD>
              <TD>
                {b.user_id ? <Link href={`/admin/members/${b.user_id}`} className="link">{b.profiles?.email ?? b.attendee_email}</Link>
                  : <span><Badge tone="yellow">회원 미확인</Badge> <span className="text-muted">{b.attendee_email ?? ""}</span></span>}
              </TD>
              <TD>{b.category ? categoryName(b.category, "ko") : <Badge tone="yellow">과목 미확인</Badge>}</TD>
              <TD>{b.status === "accepted" ? <Badge tone="green">확정</Badge> : b.status === "over_limit" ? <Badge tone="red">확인 필요</Badge> : <Badge>취소</Badge>}</TD>
              <TD>{meet ? <a href={meet} target="_blank" rel="noopener noreferrer" className="link">열기</a> : ""}</TD>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
