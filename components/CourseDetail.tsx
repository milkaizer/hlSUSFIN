import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { categories, type CategoryInfo, type Track } from "@/content/categories";
import { CourseTile } from "@/components/home/CourseTiles";
import { Check } from "@/components/ui/Icons";
import { SpecList } from "@/components/SpecList";

type L = { ko: string; en: string };

// 과목 페이지 본문. trail 이 있으면 세부 과정 페이지 (제목에 과정 이름, 위치 표시)
export async function CourseDetail({ c, locale, trail = [] }: { c: CategoryInfo; locale: string; trail?: Track[] }) {
  const t = await getTranslations("course");
  const L = (v: L) => (locale === "en" ? v.en : v.ko);
  const LL = (v: { ko: string[]; en: string[] }) => (locale === "en" ? v.en : v.ko);
  const others = categories.filter((x) => x.slug !== c.slug);
  const curriculum = LL(c.curriculum);
  const base = `/courses/${c.slug}`;
  // 지나온 경로마다 링크 주소
  const crumbs = trail.map((tr, i) => ({ track: tr, href: `${base}/${trail.slice(0, i + 1).map((x) => x.slug).join("/")}` }));
  const last = crumbs.at(-1);
  // 고를 수 있는 세부 과정: 하위가 있으면 하위, 끝 단계면 같은 단계 형제
  const parentTracks = trail.length > 1 ? trail[trail.length - 2].children : c.tracks;
  const options = !last ? (c.tracks ?? []).map((tr) => ({ track: tr, href: `${base}/${tr.slug}` }))
    : last.track.children ? last.track.children.map((tr) => ({ track: tr, href: `${last.href}/${tr.slug}` }))
    : (parentTracks ?? []).map((tr) => ({ track: tr, href: `${last.href.slice(0, last.href.lastIndexOf("/"))}/${tr.slug}` }));
  const title = trail.length ? `${L(c.name)} · ${trail.map((tr) => L(tr.name)).join(" ")}` : L(c.name);
  const dot = <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${c.lang === "es" ? "bg-azul" : "bg-azafran"}`} />;
  return (
    <>
      <div className="bg-white">
        <div className="wrap py-12 md:py-20">
          {trail.length ? (
            <nav aria-label={t("breadcrumb")}>
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-muted">
                <li className="inline-flex items-center gap-2">{dot}<Link href={base} className="hover:text-azul">{L(c.name)}</Link></li>
                {crumbs.map((cr) => (
                  <li key={cr.href} className="inline-flex items-center gap-2">
                    <span aria-hidden>/</span>
                    <Link href={cr.href} aria-current={cr === last ? "page" : undefined} className="hover:text-azul aria-[current=page]:text-ink">{L(cr.track.name)}</Link>
                  </li>
                ))}
              </ol>
            </nav>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
              {dot}
              {c.lang === "es" ? t("lang_es") : t("lang_ko")}
            </p>
          )}
          <h1 className="h-page mt-1" data-testid="course-title">{title}</h1>
          <p className="lead mt-3">{L(c.short)}</p>
          {options.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-muted">{t("tracks")}</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {options.map((o) => (
                  <li key={o.href}>
                    <Link href={o.href} aria-current={o.href === last?.href ? "page" : undefined}
                      className="inline-flex min-h-10 items-center rounded-pill border border-line bg-white px-4 text-[14px] font-semibold text-ink transition-colors hover:border-azul hover:text-azul aria-[current=page]:border-azul aria-[current=page]:bg-azul-soft aria-[current=page]:text-azul">
                      {L(o.track.name)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              {curriculum.map((item, i) => (
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
