import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/Logo";
import { env } from "@/lib/env";
import { flags } from "@/lib/flags";

// 사업자 정보는 넣지 않는다 (1.3)
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const year = new Date().getFullYear();
  return (
    <footer data-section="footer" className="mt-24 border-t border-line bg-white">
      <div className="wrap flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted">&copy; {year} Vita Language. {t("rights")}</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          {flags.showReviews && <li><Link href="/reviews" className="hover:text-azul">{nav("reviews")}</Link></li>}
          <li><Link href="/board" className="hover:text-azul">{nav("board")}</Link></li>
          <li><Link href="/terms" className="hover:text-azul">{t("terms")}</Link></li>
          <li><Link href="/privacy" className="hover:text-azul">{t("privacy")}</Link></li>
          {env.contactEmail && <li><a href={`mailto:${env.contactEmail}`} className="hover:text-azul">{t("contact")}</a></li>}
        </ul>
      </div>
    </footer>
  );
}
