import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

// 어두운 라운드 패널 + 알약 버튼
export async function BoardEntry() {
  const t = await getTranslations("home");
  return (
    <section data-section="board" className="wrap pt-7 md:pt-12">
      <div className="flex flex-col gap-6 rounded-card bg-ink p-7 text-white md:flex-row md:items-center md:justify-between md:p-12">
        <div>
          <h2 className="text-[22px] font-extrabold text-white md:text-[26px]">{t("boardTitle")}</h2>
          <p className="mt-2 max-w-prose leading-relaxed text-white/80">{t("boardBody")}</p>
        </div>
        <Link href="/board" className="btn-pill-invert shrink-0 self-start md:self-auto">{t("boardCta")}</Link>
      </div>
    </section>
  );
}
