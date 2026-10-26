import { getTranslations } from "next-intl/server";
import { instructor } from "@/content/instructor";

// 위 3px ink 선, 좌측 제목 / 우측 본문 (7.4)
export async function Instructor({ locale }: { locale: string }) {
  const t = await getTranslations("home");
  return (
    <section data-section="instructor" className="wrap py-12 sm:py-16">
      <div className="grid gap-6 border-t-[3px] border-ink pt-6 md:grid-cols-[16rem_1fr] md:gap-12">
        <div>
          <h2 className="h-section">{t("instructorTitle")}</h2>
          {instructor.name && <p className="mt-2 text-[18px] font-bold">{locale === "en" ? instructor.name.en : instructor.name.ko}</p>}
        </div>
        <p className="max-w-prose text-[17px] leading-relaxed">{t("instructorBody")}</p>
      </div>
    </section>
  );
}
