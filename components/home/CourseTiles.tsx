import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { CategoryInfo } from "@/content/categories";
import { SpecList } from "@/components/SpecList";

// 과목 카드: 언어 표시, 제목, 한 줄 설명, 고정 라벨 격자. 가격은 넣지 않는다 (거래는 요금제 페이지)
export async function CourseTile({ c, locale }: { c: CategoryInfo; locale: string }) {
  const t = await getTranslations("course");
  const en = locale === "en";
  const curriculum = en ? c.curriculum.en : c.curriculum.ko;
  return (
    <Link href={`/courses/${c.slug}`} data-course={c.slug}
      className="show-card group h-full p-[2em] transition-shadow hover:ring-1 hover:ring-azul/40">
      <span className="inline-flex items-center gap-[0.5em] text-[0.875em] font-bold text-muted">
        <span aria-hidden className={`h-[0.5em] w-[0.5em] rounded-full ${c.lang === "es" ? "bg-azul" : "bg-azafran"}`} />
        {c.lang === "es" ? t("lang_es") : t("lang_ko")}
      </span>
      <span className="mt-[0.5em] block text-[1.5em] font-extrabold leading-[1.25] tracking-[-0.02em] text-ink group-hover:text-azul">{en ? c.name.en : c.name.ko}</span>
      <span className="mt-[0.375em] block text-[0.9375em] leading-relaxed text-muted">{en ? c.short.en : c.short.ko}</span>
      <SpecList className="mt-[1.25em]" locale={locale} rows={[
        { key: "audience", label: t("specAudience"), value: en ? c.audience.en : c.audience.ko },
        { key: "curriculum", label: t("specCurriculum"), value: t("unitCount", { count: curriculum.length }), sub: t("firstUnit", { first: curriculum[0] }) },
        { key: "includes", label: t("specIncludes"), value: t("includesShort"), sub: t("includesSub") },
      ]} />
    </Link>
  );
}

export async function CourseTiles({ items, locale }: { items: CategoryInfo[]; locale: string }) {
  const t = await getTranslations("home");
  return (
    <section id="courses" data-section="courses" className="wrap sec">
      <div className="sec-head">
        <h2 className="h-section">{t("coursesTitle")}</h2>
        <p className="lead mt-2">{t("coursesLead")}</p>
      </div>
      <ul className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
        {items.map((c) => (
          <li key={c.slug}><CourseTile c={c} locale={locale} /></li>
        ))}
      </ul>
    </section>
  );
}
