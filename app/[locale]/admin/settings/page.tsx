import { requireAdmin } from "@/lib/auth";
import { H, Notice, Field } from "@/components/admin/ui";
import { updateTier } from "../actions";

type Tier = { slug: string; rank: number; name_ko: string; name_en: string; monthly_call_credits: number; live_access: boolean; price_krw: number | null };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TierSettings({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/settings");
  const { data } = await supabase.from("tiers").select("*").order("rank");
  const tiers = (data as Tier[] | null) ?? [];
  return (
    <>
      <H sub="요금제 화면과 회화콜 횟수에 바로 반영됩니다. 가격을 비우면 준비 중으로 표시됩니다.">단계 설정</H>
      <Notice msg={sp.msg} err={sp.err} />
      {tiers.length === 0 && <p className="panel p-5 text-muted">단계 데이터가 없습니다. seed.sql 을 실행했는지 확인해 주세요.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        {tiers.map((t) => (
          <form key={t.slug} action={updateTier} className="panel space-y-4 p-5" data-tier-form={t.slug}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="slug" value={t.slug} />
            <p className="text-sm font-semibold text-muted">{t.slug}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="이름 (한국어)"><input name="name_ko" defaultValue={t.name_ko} maxLength={30} className="field" required /></Field>
              <Field label="이름 (영어)"><input name="name_en" defaultValue={t.name_en} maxLength={30} className="field" required /></Field>
            </div>
            <Field label="월 회화콜 횟수"><input type="number" name="monthly_call_credits" defaultValue={t.monthly_call_credits} min={0} max={100} className="field" required /></Field>
            <Field label="월 가격 (원)" hint="비우면 준비 중"><input name="price_krw" defaultValue={t.price_krw ?? ""} inputMode="numeric" className="field" /></Field>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="live_access" defaultChecked={t.live_access} className="h-4 w-4 accent-azul" /> 라이브 표시</label>
            <p className="text-xs text-muted">라이브 일정 노출은 라이브마다 정한 최소 단계로 결정됩니다. 이 체크는 요금제 화면 표시용입니다.</p>
            <button className="btn-primary w-full">저장</button>
          </form>
        ))}
      </div>
    </>
  );
}
