import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { ReviewRow } from "@/lib/data/public";
import { categoryName } from "@/content/categories";

export async function ReviewList({ items, locale }: { items: ReviewRow[]; locale: string }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((r) => (
        <li key={r.id} className="panel p-5" data-review>
          <p className="whitespace-pre-line leading-relaxed">{r.body}</p>
          <p className="mt-3 text-sm text-muted">{[r.masked_name, r.category ? categoryName(r.category, locale) : null].filter(Boolean).join(", ")}</p>
        </li>
      ))}
    </ul>
  );
}

// 스페이서 (10.6). 홈에선 최대 4개
export async function ReviewsSection({ items, locale }: { items: ReviewRow[]; locale: string }) {
  const t = await getTranslations("home");
  const shown = items.slice(0, 4);
  return (
    <section data-section="reviews" className="wrap py-12 sm:py-16">
      <h2 className="h-section">{t("reviewsTitle")}</h2>
      {shown.length === 0 ? (
        <p className="mt-4 text-muted" data-testid="reviews-empty">{t("reviewsEmpty")}</p>
      ) : (
        <div className="mt-8">
          <ReviewList items={shown} locale={locale} />
          {items.length > 4 && <Link href="/reviews" className="btn-quiet mt-6">{t("reviewsMore")}</Link>}
        </div>
      )}
    </section>
  );
}
