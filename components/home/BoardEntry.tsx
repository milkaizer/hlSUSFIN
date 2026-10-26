import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function BoardEntry() {
  const t = await getTranslations("home");
  return (
    <section data-section="board" className="wrap py-12 sm:py-16">
      <div className="flex flex-col gap-5 rounded-tile bg-azul-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-[22px] font-extrabold">{t("boardTitle")}</h2>
          <p className="mt-2 max-w-prose leading-relaxed text-ink/80">{t("boardBody")}</p>
        </div>
        <Link href="/board" className="btn-quiet shrink-0">{t("boardCta")}</Link>
      </div>
    </section>
  );
}
