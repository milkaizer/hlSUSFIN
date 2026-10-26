import { getTranslations } from "next-intl/server";
import { instructor } from "@/content/instructor";

// 흰 라운드 블록, 좌측 제목 / 우측 본문
export async function Instructor({ locale }: { locale: string }) {
  const t = await getTranslations("home");
  return (
    <section data-section="instructor" className="wrap sec">
      <div className="grid gap-5 rounded-card bg-white p-7 md:grid-cols-[14rem_1fr] md:gap-12 md:p-12">
        <div>
          <h2 className="h-section">{t("instructorTitle")}</h2>
          {instructor.name && <p className="mt-2 text-[18px] font-bold">{locale === "en" ? instructor.name.en : instructor.name.ko}</p>}
        </div>
        <p className="max-w-prose text-[16px] leading-relaxed text-ink/85 md:pt-1 md:text-[17px]">{t("instructorBody")}</p>
      </div>
    </section>
  );
}
