import { requireAdmin, type Profile } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { H, Notice, Table, TD, Badge, Empty, STATUS_LABEL, STATUS_TONE } from "@/components/admin/ui";
import { kstDateLabel } from "@/lib/admin-utils";
import { setMemberStatus } from "../actions";

type SP = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = [
  { v: "all", label: "전체" },
  { v: "pending", label: "승인 대기" },
  { v: "approved", label: "승인됨" },
  { v: "blocked", label: "차단" },
];

export default async function MembersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireAdmin(locale, "/admin/members");
  const status = typeof sp.status === "string" && ["pending", "approved", "blocked"].includes(sp.status) ? sp.status : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";

  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(300);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("email", `%${q.replace(/[%_,()]/g, "")}%`);
  const { data } = await query;
  const members = (data as Profile[] | null) ?? [];

  return (
    <>
      <H sub="승인하면 로그인은 되지만 과목은 권한을 부여해야 열립니다.">회원·권한</H>
      <Notice msg={sp.msg} err={sp.err} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link key={f.v} href={{ pathname: "/admin/members", query: f.v === "all" ? {} : { status: f.v } }}
            aria-current={status === f.v ? "page" : undefined}
            className="btn-quiet btn-sm aria-[current=page]:border-azul aria-[current=page]:bg-azul-soft aria-[current=page]:text-azul">
            {f.label}
          </Link>
        ))}
        <form className="ml-auto flex gap-2" role="search">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="이메일 검색" aria-label="이메일 검색" className="field w-48 py-1.5" />
          <button className="btn-quiet btn-sm">검색</button>
        </form>
      </div>
      <Table head={["이메일", "이름", "역할", "상태", "가입일", ""]} empty={members.length === 0 ? <Empty>해당하는 회원이 없습니다.</Empty> : null}>
        {members.map((m) => (
          <tr key={m.id} data-member={m.email}>
            <TD><Link href={`/admin/members/${m.id}`} className="link">{m.email}</Link></TD>
            <TD>{m.name ?? ""}</TD>
            <TD>{m.role === "admin" ? <Badge tone="blue">관리자</Badge> : "학생"}</TD>
            <TD><Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge></TD>
            <TD className="whitespace-nowrap text-muted">{kstDateLabel(m.created_at)}</TD>
            <TD>
              {m.id !== user.id && (
                <div className="flex justify-end gap-1.5">
                  {m.status !== "approved" && (
                    <form action={setMemberStatus}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="user_id" value={m.id} />
                      <input type="hidden" name="status" value="approved" />
                      <input type="hidden" name="filter" value={status === "all" ? "" : status} />
                      <button className="btn-quiet btn-sm">승인</button>
                    </form>
                  )}
                  {m.status !== "blocked" && (
                    <form action={setMemberStatus}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="user_id" value={m.id} />
                      <input type="hidden" name="status" value="blocked" />
                      <input type="hidden" name="filter" value={status === "all" ? "" : status} />
                      <button className="btn-danger btn-sm">차단</button>
                    </form>
                  )}
                </div>
              )}
            </TD>
          </tr>
        ))}
      </Table>
    </>
  );
}
