import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { requireAdmin, type Profile } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { isUuid } from "@/lib/validate";
import { categories, categoryName } from "@/content/categories";
import { tiers } from "@/content/tiers";
import { addDays, kstDateInput, kstDateLabel, kstMonthStart } from "@/lib/admin-utils";
import { H, H2, Notice, Field, Table, TD, Badge, Empty, STATUS_LABEL, STATUS_TONE } from "@/components/admin/ui";
import { addCreditAdjustment, deleteCreditAdjustment, grantAccess, revokeEntitlement, setMemberStatus, updateEntitlement } from "../../actions";

type Ent = { id: string; category: string; tier: string; starts_at: string; expires_at: string; source: string; note: string | null; created_at: string };
type Adj = { id: string; category: string; month: string; delta: number; note: string | null; created_at: string };
type SP = Promise<Record<string, string | string[] | undefined>>;

function entState(e: Ent, now: number) {
  if (new Date(e.expires_at).getTime() <= now) return { label: "만료", tone: "gray" as const };
  if (new Date(e.starts_at).getTime() > now) return { label: "예정", tone: "yellow" as const };
  return { label: "유효", tone: "green" as const };
}

export default async function MemberDetail({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: SP }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const { supabase, user } = await requireAdmin(locale, `/admin/members/${id}`);

  const { data: member } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!member) notFound();
  const [{ data: entData }, { data: adjData }] = await Promise.all([
    supabase.from("entitlements").select("id,category,tier,starts_at,expires_at,source,note,created_at").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("credit_adjustments").select("id,category,month,delta,note,created_at").eq("user_id", id).order("month", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const ents = (entData as Ent[] | null) ?? [];
  const adjs = (adjData as Adj[] | null) ?? [];
  const now = Date.now();
  const today = kstDateInput(new Date());
  const isSelf = member.id === user.id;
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="user_id" value={member.id} />
    </>
  );

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/members" className="link">회원 목록</Link></p>
      <H sub={`가입 ${kstDateLabel(member.created_at)}, ${member.role === "admin" ? "관리자" : "학생"}`}>{member.email}</H>
      <Notice msg={sp.msg} err={sp.err} />

      <section className="panel flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-muted">상태</span>
        <Badge tone={STATUS_TONE[member.status]}>{STATUS_LABEL[member.status]}</Badge>
        {member.name && <span className="text-sm text-muted">이름 {member.name}</span>}
        {!isSelf && (
          <div className="ml-auto flex flex-wrap gap-2">
            {(["approved", "blocked", "pending"] as const).filter((s) => s !== member.status).map((s) => (
              <form key={s} action={setMemberStatus}>
                {hidden}
                <input type="hidden" name="status" value={s} />
                <input type="hidden" name="back" value="detail" />
                <button className={s === "blocked" ? "btn-danger btn-sm" : "btn-quiet btn-sm"}>{s === "approved" ? "승인" : s === "blocked" ? "차단" : "승인 대기로"}</button>
              </form>
            ))}
            <form action={setMemberStatus}>
              {hidden}
              <input type="hidden" name="status" value={member.status} />
              <input type="hidden" name="role" value={member.role === "admin" ? "student" : "admin"} />
              <input type="hidden" name="back" value="detail" />
              <button className="btn-ghost btn-sm">{member.role === "admin" ? "관리자 해제" : "관리자로 지정"}</button>
            </form>
          </div>
        )}
      </section>

      <H2>권한</H2>
      <Table head={["과목", "단계", "기간", "상태", "출처, 메모", ""]} empty={ents.length === 0 ? <Empty>부여된 권한이 없습니다.</Empty> : null}>
        {ents.map((e) => {
          const st = entState(e, now);
          const formId = `ent-${e.id}`;
          return (
            <tr key={e.id} data-ent={e.category}>
              <TD className="whitespace-nowrap font-semibold">{categoryName(e.category, "ko")}</TD>
              <TD>
                <select name="tier" form={formId} defaultValue={e.tier} className="field w-28 py-1.5" aria-label="단계">
                  {tiers.map((t) => <option key={t.slug} value={t.slug}>{t.name.ko}</option>)}
                </select>
              </TD>
              <TD className="whitespace-nowrap">
                <span className="text-muted">{kstDateInput(e.starts_at)} ~ </span>
                <input type="date" name="expires" form={formId} defaultValue={kstDateInput(e.expires_at)} className="field inline-block w-40 py-1.5" aria-label="만료일" />
              </TD>
              <TD><Badge tone={st.tone}>{st.label}</Badge></TD>
              <TD className="text-muted">{e.source === "payment" ? "결제" : "관리자"}{e.note ? `, ${e.note}` : ""}</TD>
              <TD>
                <div className="flex justify-end gap-1.5">
                  <form id={formId} action={updateEntitlement}>
                    {hidden}
                    <input type="hidden" name="id" value={e.id} />
                    <button className="btn-quiet btn-sm">저장</button>
                  </form>
                  {st.label !== "만료" && (
                    <form action={revokeEntitlement}>
                      {hidden}
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmSubmit message="만료일을 지금으로 바꿔 권한을 회수합니다. 계속할까요?" className="btn-danger btn-sm">회수</ConfirmSubmit>
                    </form>
                  )}
                </div>
              </TD>
            </tr>
          );
        })}
      </Table>

      <H2>권한 부여</H2>
      <form action={grantAccess} className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="grant-form">
        {hidden}
        <Field label="과목">
          <select name="category" className="field" required>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name.ko}</option>)}
          </select>
        </Field>
        <Field label="단계">
          <select name="tier" className="field" required>
            {tiers.map((t) => <option key={t.slug} value={t.slug}>{t.name.ko}</option>)}
          </select>
        </Field>
        <Field label="메모 (선택)">
          <input name="note" maxLength={300} className="field" />
        </Field>
        <Field label="시작일" hint="서울 기준 00:00부터">
          <input type="date" name="starts" defaultValue={today} className="field" required />
        </Field>
        <Field label="만료일" hint="서울 기준 23:59까지">
          <input type="date" name="expires" defaultValue={addDays(today, 90)} className="field" required />
        </Field>
        <div className="flex items-end">
          <button className="btn-primary w-full">권한 부여</button>
        </div>
      </form>

      <H2>회화콜 크레딧 조정</H2>
      <p className="mb-3 text-sm text-muted">단계 기본 횟수에 더하거나 뺍니다. 해당 월(서울 기준)에만 적용됩니다.</p>
      <Table head={["월", "과목", "증감", "메모", ""]} empty={adjs.length === 0 ? <Empty>조정 내역이 없습니다.</Empty> : null}>
        {adjs.map((a) => (
          <tr key={a.id}>
            <TD className="whitespace-nowrap">{a.month.slice(0, 7)}</TD>
            <TD>{categoryName(a.category, "ko")}</TD>
            <TD className={`font-semibold tabular-nums ${a.delta > 0 ? "text-ok" : "text-warn"}`}>{a.delta > 0 ? `+${a.delta}` : a.delta}</TD>
            <TD className="text-muted">{a.note ?? ""}</TD>
            <TD>
              <form action={deleteCreditAdjustment} className="flex justify-end">
                {hidden}
                <input type="hidden" name="id" value={a.id} />
                <button className="btn-danger btn-sm">삭제</button>
              </form>
            </TD>
          </tr>
        ))}
      </Table>
      <form action={addCreditAdjustment} className="panel mt-4 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        {hidden}
        <Field label="월">
          <input type="month" name="month" defaultValue={kstMonthStart().slice(0, 7)} className="field" required />
        </Field>
        <Field label="과목">
          <select name="category" className="field">
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name.ko}</option>)}
          </select>
        </Field>
        <Field label="증감" hint="예: 1 또는 -1">
          <input type="number" name="delta" step={1} min={-100} max={100} defaultValue={1} className="field" required />
        </Field>
        <Field label="메모 (선택)">
          <input name="note" maxLength={300} className="field" />
        </Field>
        <div className="flex items-end">
          <button className="btn-quiet w-full">조정 추가</button>
        </div>
      </form>
    </>
  );
}
