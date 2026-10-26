import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

// ¿ ? 장치는 이 한 곳에만 (7.1). 가운데 정렬, 이미지 없이 타이포 하나로.
// 제목은 카드의 0.875 배율과 별개로 폭에 따라 2rem~3rem 으로 따로 줄인다
export async function Hero() {
  const t = await getTranslations("home");
  return (
    <section data-section="hero" className="wrap pb-10 pt-16 text-center md:pb-16 md:pt-28">
      <h1 className="mx-auto max-w-4xl text-[clamp(2rem,1.25rem+3.2vw,3rem)] font-extrabold leading-[1.15] tracking-[-0.03em]">
        <span aria-hidden className="mr-[0.08em] text-azafran">{t("heroBefore")}</span>
        {t("heroQuestion")}
        <span aria-hidden className="ml-[0.06em] text-azafran">{t("heroAfter")}</span>
      </h1>
      <p className="mx-auto mt-6 max-w-[34rem] text-[16px] leading-relaxed text-muted md:text-[18px]">{t("heroLead")}</p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link href="/apply" className="btn-primary">{t("ctaApply")}</Link>
        <a href="#courses" className="btn-pill">{t("ctaCourses")}</a>
      </div>
    </section>
  );
}
