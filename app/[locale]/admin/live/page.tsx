import { requireAdmin } from "@/lib/auth";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { categories } from "@/content/categories";
import { tiers } from "@/content/tiers";
import { kstDateTimeInput } from "@/lib/admin-utils";
import { H, H2, Notice, Field, Table, TD, Empty } from "@/components/admin/ui";
import { createLive, deleteLive, updateLive } from "../actions";

type Live = { id: string; category: string; title: string; starts_at: string; duration_min: number; meet_url: string | null; min_tier: string };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminLive({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/live");
  // meet_url 은 컬럼 권한이 없어 관리자 함수로 읽는다 (0002)
  const { data } = await supabase.rpc("admin_live_sessions", { p_from: new Date(Date.now() - 7 * 86400000).toISOString() });
  const lives = (data as Live[] | null) ?? [];
  const catOptions = categories.map((c) => <option key={c.slug} value={c.slug}>{c.name.ko}</option>);
  const tierOptions = tiers.map((t) => <option key={t.slug} value={t.slug}>{t.name.ko}</option>);
  const hidden = <input type="hidden" name="locale" value={locale} />;

  return (
    <>
      <H sub="시간은 서울 기준으로 입력합니다. 학생에게는 각자 기기 시간대로 보이고, 입장 링크는 시작 30분 전부터 열립니다.">라이브</H>
      <Notice msg={sp.msg} err={sp.err} />
      <Table head={["과목", "제목", "시작 (서울)", "분", "최소 단계", "Meet 링크", ""]} empty={lives.length === 0 ? <Empty>최근 7일 이후 일정이 없습니다.</Empty> : null}>
        {lives.map((l) => {
          const f = `live-${l.id}`;
          return (
            <tr key={l.id} data-live={l.id}>
              <TD><select form={f} name="category" defaultValue={l.category} className="field w-36 py-1.5" aria-label="과목">{catOptions}</select></TD>
              <TD><input form={f} name="title" defaultValue={l.title} maxLength={200} className="field min-w-44 py-1.5" aria-label="제목" required /></TD>
              <TD><input form={f} type="datetime-local" name="starts_at" defaultValue={kstDateTimeInput(l.starts_at)} className="field w-52 py-1.5" aria-label="시작" required /></TD>
              <TD><input form={f} type="number" name="duration_min" defaultValue={l.duration_min} min={1} max={600} className="field w-20 py-1.5" aria-label="분" /></TD>
              <TD><select form={f} name="min_tier" defaultValue={l.min_tier} className="field w-28 py-1.5" aria-label="최소 단계">{tierOptions}</select></TD>
              <TD><input form={f} name="meet_url" defaultValue={l.meet_url ?? ""} className="field min-w-56 py-1.5" aria-label="Meet 링크" placeholder="https://meet.google.com/..." /></TD>
              <TD>
                <div className="flex justify-end gap-1.5">
                  <form id={f} action={updateLive}>{hidden}<input type="hidden" name="id" value={l.id} /><button className="btn-quiet btn-sm">저장</button></form>
                  <form action={deleteLive}>{hidden}<input type="hidden" name="id" value={l.id} /><ConfirmSubmit message="삭제하면 되돌릴 수 없습니다. 계속할까요?" className="btn-danger btn-sm">삭제</ConfirmSubmit></form>
                </div>
              </TD>
            </tr>
          );
        })}
      </Table>
      <H2>일정 추가</H2>
      <form action={createLive} className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {hidden}
        <Field label="과목"><select name="category" className="field">{catOptions}</select></Field>
        <Field label="제목"><input name="title" maxLength={200} className="field" required /></Field>
        <Field label="시작 (서울 시간)"><input type="datetime-local" name="starts_at" className="field" required /></Field>
        <Field label="길이(분)"><input type="number" name="duration_min" defaultValue={60} min={1} max={600} className="field" /></Field>
        <Field label="최소 단계" hint="기본 스탠다드"><select name="min_tier" defaultValue="standard" className="field">{tierOptions}</select></Field>
        <Field label="Meet 링크"><input name="meet_url" className="field" placeholder="https://meet.google.com/..." /></Field>
        <div className="lg:col-span-3"><button className="btn-primary">일정 추가</button></div>
      </form>
    </>
  );
}
