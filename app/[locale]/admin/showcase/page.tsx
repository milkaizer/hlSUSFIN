import { requireAdmin } from "@/lib/auth";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { categories } from "@/content/categories";
import { flags } from "@/lib/flags";
import { H, H2, Notice, Field, Badge } from "@/components/admin/ui";
import { deleteResult, deleteReview, saveResult, saveReview } from "../actions";

type Result = { id: string; category: string | null; masked_name: string; headline: string; detail: string | null; year: number | null; published: boolean };
type Review = { id: string; category: string | null; masked_name: string; body: string; published: boolean };
type SP = Promise<Record<string, string | string[] | undefined>>;

function CategorySelect({ value }: { value?: string | null }) {
  return (
    <select name="category" defaultValue={value ?? ""} className="field">
      <option value="">과목 없음</option>
      {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name.ko}</option>)}
    </select>
  );
}

// 스페이서 입력 화면 (10.6). 공개 화면은 NEXT_PUBLIC_SHOW_* 플래그로 켠다
export default async function Showcase({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/showcase");
  const [{ data: rd }, { data: vd }] = await Promise.all([
    supabase.from("results").select("id,category,masked_name,headline,detail,year,published").order("created_at", { ascending: false }),
    supabase.from("reviews").select("id,category,masked_name,body,published").order("created_at", { ascending: false }),
  ]);
  const results = (rd as Result[] | null) ?? [];
  const reviews = (vd as Review[] | null) ?? [];
  const hidden = <input type="hidden" name="locale" value={locale} />;

  return (
    <>
      <H sub="이름은 가려서 입력합니다 (예: 김**). 공개에 체크한 항목만 사이트에 보입니다.">합격자·후기</H>
      <Notice msg={sp.msg} err={sp.err} />
      <div className="panel mb-6 flex flex-wrap gap-4 p-4 text-sm" data-testid="flag-state">
        <span>합격자 공개 화면 {flags.showResults ? <Badge tone="green">켜짐</Badge> : <Badge>꺼짐</Badge>}</span>
        <span>후기 공개 화면 {flags.showReviews ? <Badge tone="green">켜짐</Badge> : <Badge>꺼짐</Badge>}</span>
        <span className="text-muted">바꾸려면 NEXT_PUBLIC_SHOW_RESULTS, NEXT_PUBLIC_SHOW_REVIEWS 를 true 로 두고 다시 배포합니다.</span>
      </div>

      <H2>합격자·성과 {results.length}건</H2>
      <div className="space-y-3">
        {[...results, null].map((r) => (
          <div key={r?.id ?? "new"} className="panel p-4" data-result-row={r?.id ?? "new"}>
            <form action={saveResult} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {hidden}
              {r && <input type="hidden" name="id" value={r.id} />}
              <Field label="과목"><CategorySelect value={r?.category} /></Field>
              <Field label="가린 이름"><input name="masked_name" defaultValue={r?.masked_name} maxLength={50} placeholder="김**" className="field" required /></Field>
              <Field label="성과"><input name="headline" defaultValue={r?.headline} maxLength={200} placeholder="TOPIK 6급" className="field" required /></Field>
              <Field label="연도"><input type="number" name="year" defaultValue={r?.year ?? ""} min={2000} max={2100} className="field" /></Field>
              <Field label="설명 (선택)" className="sm:col-span-2 lg:col-span-3"><input name="detail" defaultValue={r?.detail ?? ""} maxLength={2000} className="field" /></Field>
              <label className="flex items-center gap-2 self-end pb-3 font-semibold"><input type="checkbox" name="published" defaultChecked={r?.published} className="h-4 w-4 accent-azul" /> 공개</label>
              <div className="flex gap-2 lg:col-span-4">
                <button className={r ? "btn-quiet btn-sm" : "btn-primary btn-sm"}>{r ? "저장" : "합격자 추가"}</button>
              </div>
            </form>
            {r && (
              <form action={deleteResult} className="mt-2">
                {hidden}
                <input type="hidden" name="id" value={r.id} />
                <ConfirmSubmit message="삭제하면 되돌릴 수 없습니다. 계속할까요?" className="text-sm font-semibold text-warn hover:underline">삭제</ConfirmSubmit>
              </form>
            )}
          </div>
        ))}
      </div>

      <H2>수강후기 {reviews.length}건</H2>
      <div className="space-y-3">
        {[...reviews, null].map((r) => (
          <div key={r?.id ?? "new"} className="panel p-4">
            <form action={saveReview} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {hidden}
              {r && <input type="hidden" name="id" value={r.id} />}
              <Field label="과목"><CategorySelect value={r?.category} /></Field>
              <Field label="가린 이름"><input name="masked_name" defaultValue={r?.masked_name} maxLength={50} placeholder="이**" className="field" required /></Field>
              <Field label="후기" className="sm:col-span-2"><textarea name="body" defaultValue={r?.body} rows={2} maxLength={5000} className="field" required /></Field>
              <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="published" defaultChecked={r?.published} className="h-4 w-4 accent-azul" /> 공개</label>
              <div className="lg:col-span-3"><button className={r ? "btn-quiet btn-sm" : "btn-primary btn-sm"}>{r ? "저장" : "후기 추가"}</button></div>
            </form>
            {r && (
              <form action={deleteReview} className="mt-2">
                {hidden}
                <input type="hidden" name="id" value={r.id} />
                <ConfirmSubmit message="삭제하면 되돌릴 수 없습니다. 계속할까요?" className="text-sm font-semibold text-warn hover:underline">삭제</ConfirmSubmit>
              </form>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
