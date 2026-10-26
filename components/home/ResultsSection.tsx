import { getTranslations } from "next-intl/server";
import type { ResultRow } from "@/lib/data/public";
import { categoryName } from "@/content/categories";

// 스페이서 (10.6). 플래그가 꺼져 있으면 호출부에서 렌더하지 않는다
export async function ResultsSection({ items, locale }: { items: ResultRow[]; locale: string }) {
  const t = await getTranslations("home");
  return (
    <section data-section="results" className="wrap sec">
      <h2 className="h-section text-center">{t("resultsTitle")}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-center text-muted" data-testid="results-empty">{t("resultsEmpty")}</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-card bg-white p-6" data-result>
              <p className="text-[20px] font-extrabold">{r.headline}</p>
              <p className="mt-1 text-sm text-muted">
                {[r.masked_name, r.category ? categoryName(r.category, locale) : null, r.year].filter(Boolean).join(", ")}
              </p>
              {r.detail && <p className="mt-3 text-[15px] leading-relaxed">{r.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
