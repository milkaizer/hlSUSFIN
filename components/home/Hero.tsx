import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

// ¿ ? 장치는 이 한 곳에만 (7.1)
export async function Hero() {
  const t = await getTranslations("home");
  return (
    <section data-section="hero" className="wrap pb-16 pt-14 sm:pb-20 sm:pt-20">
      <h1 className="max-w-5xl text-[clamp(2.3rem,7.2vw,5rem)] font-extrabold leading-[1.08] tracking-[-0.035em]">
        <span aria-hidden className="mr-[0.08em] text-azafran">{t("heroBefore")}</span>
        {t("heroQuestion")}
        <span aria-hidden className="ml-[0.06em] text-azafran">{t("heroAfter")}</span>
      </h1>
      <p className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-muted sm:text-[18px]">{t("heroLead")}</p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/apply" className="btn-primary">{t("ctaApply")}</Link>
        <a href="#courses" className="btn-quiet">{t("ctaCourses")}</a>
      </div>
    </section>
  );
}
