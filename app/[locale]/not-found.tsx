import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="wrap py-20 sm:py-28">
      <p className="text-[56px] font-extrabold leading-none text-azafran">404</p>
      <h1 className="h-page mt-4">{t("notFound")}</h1>
      <p className="lead mt-3">{t("notFoundBody")}</p>
      <Link href="/" className="btn-primary mt-8">{t("home")}</Link>
    </div>
  );
}
