import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { categories, getCategory } from "@/content/categories";
import { CourseTile } from "@/components/home/CourseTiles";
import { Check } from "@/components/ui/Icons";
import { SpecList } from "@/components/SpecList";

type Params = { params: Promise<{ locale: string; category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, category } = await params;
  const c = getCategory(category);
  if (!c) return {};
  return { title: locale === "en" ? c.name.en : c.name.ko, description: locale === "en" ? c.short.en : c.short.ko };
}

export default async function CoursePage({ params }: Params) {
  const { locale, category } = await params;
  const c = getCategory(category);
  if (!c) notFound();
  const t = await getTranslations("course");
  const L = (v: { ko: string; en: string }) => (locale === "en" ? v.en : v.ko);
  const LL = (v: { ko: string[]; en: string[] }) => (locale === "en" ? v.en : v.ko);
  const others = categories.filter((x) => x.slug !== c.slug);
  const curriculum = LL(c.curriculum);
  return (
    <>
      <div className="bg-white">
        <div className="wrap py-12 md:py-20">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
            <span aria-hidden className={`h-2 w-2 rounded-full ${c.lang === "es" ? "bg-azul" : "bg-azafran"}`} />
            {c.lang === "es" ? t("lang_es") : t("lang_ko")}
          </p>
          <h1 className="h-page mt-1">{L(c.name)}</h1>
          <p className="lead mt-3">{L(c.short)}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={{ pathname: "/apply", query: { category: c.slug } }} className="btn-primary">{t("apply")}</Link>
            <Link href="/pricing" className="btn-pill">{t("seePricing")}</Link>
          </div>
        </div>
      </div>
      <div className="wrap grid gap-10 py-12 md:py-16 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div className="space-y-12">
          <section>
            <h2 className="text-[20px] font-extrabold">{t("audience")}</h2>
            <p className="mt-3 max-w-prose text-[17px] leading-relaxed">{L(c.audience)}</p>
          </section>
          <section>
            <h2 className="text-[20px] font-extrabold">{t("curriculum")}</h2>
            <ol className="mt-4 space-y-0 border-t border-line">
              {LL(c.curriculum).map((item, i) => (
                <li key={item} className="flex gap-4 border-b border-line py-3.5">
                  <span className="w-6 shrink-0 text-right font-extrabold tabular-nums text-muted">{i + 1}</span>
                  <span className="text-[16px]">{item}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="show-card h-fit p-[2em]">
          <SpecList locale={locale} rows={[
            { key: "audience", label: t("specAudience"), value: L(c.audience) },
            { key: "curriculum", label: t("specCurriculum"), value: t("unitCount", { count: curriculum.length }) },
          ]} />
          <h2 className="mt-[1.5em] border-t border-line pt-[1.25em] text-[1.125em] font-extrabold">{t("includes")}</h2>
          <ul className="mt-[0.75em] space-y-[0.625em] text-[0.9375em]">
            {LL(c.includes).map((item) => (
              <li key={item} className="flex items-start gap-[0.625em]">
                <span className="mt-[0.2em] shrink-0 text-ok"><Check className="h-[1em] w-[1em]" /></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <section className="wrap pb-4 pt-8 md:pt-12">
        <h2 className="h-section">{t("other")}</h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
          {others.map((o) => (
            <li key={o.slug}><CourseTile c={o} locale={locale} /></li>
          ))}
        </ul>
      </section>
    </>
  );
}
