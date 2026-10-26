import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { CategoryInfo } from "@/content/categories";

export async function CourseTile({ c, locale }: { c: CategoryInfo; locale: string }) {
  const t = await getTranslations("course");
  const en = locale === "en";
  return (
    <Link href={`/courses/${c.slug}`} data-course={c.slug}
      className={`group block h-full rounded-tile border border-line border-l-[6px] bg-white p-5 transition-colors hover:border-azul sm:p-6 ${c.lang === "es" ? "border-l-azul" : "border-l-azafran hover:border-l-azafran"}`}>
      <span className="text-sm font-semibold text-muted">{c.lang === "es" ? t("lang_es") : t("lang_ko")}</span>
      <span className="mt-1 block text-[22px] font-extrabold leading-snug tracking-[-0.02em] group-hover:text-azul">{en ? c.name.en : c.name.ko}</span>
      <span className="mt-2 block text-[15px] leading-relaxed text-muted">{en ? c.short.en : c.short.ko}</span>
    </Link>
  );
}

export async function CourseTiles({ items, locale }: { items: CategoryInfo[]; locale: string }) {
  const t = await getTranslations("home");
  return (
    <section id="courses" data-section="courses" className="wrap py-12 sm:py-16">
      <h2 className="h-section">{t("coursesTitle")}</h2>
      <p className="lead mt-2">{t("coursesLead")}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.slug}><CourseTile c={c} locale={locale} /></li>
        ))}
      </ul>
    </section>
  );
}
