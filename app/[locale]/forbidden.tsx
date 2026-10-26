import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function Forbidden() {
  const t = await getTranslations("common");
  return (
    <div className="wrap py-20 sm:py-28">
      <p className="text-[56px] font-extrabold leading-none text-warn">403</p>
      <h1 className="h-page mt-4">{t("forbidden")}</h1>
      <p className="lead mt-3">{t("forbiddenBody")}</p>
      <Link href="/" className="btn-primary mt-8">{t("home")}</Link>
    </div>
  );
}
