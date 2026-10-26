import { requireAdmin } from "@/lib/auth";
import { categoryName } from "@/content/categories";
import { tierName } from "@/content/tiers";
import { addDays, kstDateInput, kstLabel } from "@/lib/admin-utils";
import { H, H2, Notice, Table, TD, Badge, Empty } from "@/components/admin/ui";
import { Link } from "@/i18n/routing";
import { approveRequest, rejectRequest } from "../actions";

type Req = {
  id: string; category: string; tier: string; message: string | null; status: "pending" | "approved" | "rejected"; created_at: string; handled_at: string | null;
  profiles: { id: string; email: string; name: string | null } | null;
};
type SP = Promise<Record<string, string | string[] | undefined>>;

// enrollment_requests 는 profiles 로 가는 FK 가 2개라 user_id 쪽을 명시 (함정 9)
const SELECT = "id,category,tier,message,status,created_at,handled_at,profiles!enrollment_requests_user_id_fkey(id,email,name)";

export default async function RequestsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/requests");
  const [{ data: pd }, { data: hd }] = await Promise.all([
    supabase.from("enrollment_requests").select(SELECT).eq("status", "pending").order("created_at"),
    supabase.from("enrollment_requests").select(SELECT).neq("status", "pending").order("handled_at", { ascending: false }).limit(50),
  ]);
  const pending = (pd as Req[] | null) ?? [];
  const handled = (hd as Req[] | null) ?? [];
  const today = kstDateInput(new Date());

  return (
    <>
      <H sub="승인하면 grant_access 로 권한이 만들어지고, 승인 대기 회원은 승인 상태가 됩니다.">수강신청</H>
      <Notice msg={sp.msg} err={sp.err} />
      <H2>대기 {pending.length}건</H2>
      {pending.length === 0 ? (
        <p className="panel p-5 text-muted">대기 중인 신청이 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => (
            <li key={r.id} className="panel p-5" data-request={r.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {r.profiles ? <Link href={`/admin/members/${r.profiles.id}`} className="link">{r.profiles.email}</Link> : "알 수 없는 회원"}
                  {r.profiles?.name && <span className="ml-2 font-normal text-muted">{r.profiles.name}</span>}
                </p>
                <span className="text-sm text-muted">{kstLabel(r.created_at)}</span>
              </div>
              <p className="mt-1 text-[15px]">{categoryName(r.category, "ko")}, {tierName(r.tier, "ko")}</p>
              {r.message && <p className="mt-3 whitespace-pre-line rounded-tile bg-paper p-3 text-[15px]">{r.message}</p>}
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <form action={approveRequest} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={r.id} />
                  <label className="block"><span className="label">시작일</span><input type="date" name="starts" defaultValue={today} className="field w-44" required /></label>
                  <label className="block"><span className="label">만료일</span><input type="date" name="expires" defaultValue={addDays(today, 90)} className="field w-44" required /></label>
                  <button className="btn-primary" data-testid="approve">승인하고 권한 부여</button>
                </form>
                <form action={rejectRequest}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn-danger" data-testid="reject">반려</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <H2>처리 내역</H2>
      <Table head={["회원", "과목", "단계", "결과", "처리일"]} empty={handled.length === 0 ? <Empty>처리한 신청이 없습니다.</Empty> : null}>
        {handled.map((r) => (
          <tr key={r.id}>
            <TD>{r.profiles?.email ?? ""}</TD>
            <TD>{categoryName(r.category, "ko")}</TD>
            <TD>{tierName(r.tier, "ko")}</TD>
            <TD>{r.status === "approved" ? <Badge tone="green">승인</Badge> : <Badge tone="red">반려</Badge>}</TD>
            <TD className="whitespace-nowrap text-muted">{r.handled_at ? kstLabel(r.handled_at) : ""}</TD>
          </tr>
        ))}
      </Table>
    </>
  );
}
