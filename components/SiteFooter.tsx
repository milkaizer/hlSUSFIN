import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { env } from "@/lib/env";
import { flags } from "@/lib/flags";

// 사업자 정보는 넣지 않는다 (1.3). 어두운 배경, 글자 대비는 흰색 70% 이상
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const year = new Date().getFullYear();
  const link = "text-white/80 hover:text-white hover:underline";
  return (
    <footer data-section="footer" className="mt-24 bg-ink text-white">
      <div className={`wrap grid gap-10 py-12 md:py-16 ${env.contactEmail ? "md:grid-cols-[1.4fr_1fr_1fr]" : "md:grid-cols-[2fr_1fr]"}`}>
        <div>
          <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-[19px] leading-none tracking-[-0.03em]">
            <span className="font-extrabold text-white">Vita</span>
            <span className="font-medium text-white/75">Language</span>
          </span>
          <p className="mt-4 text-sm text-white/70">&copy; {year} Vita Language. {t("rights")}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">{t("links")}</p>
          <ul className="mt-4 space-y-2.5 text-sm font-semibold">
            {flags.showReviews && <li><Link href="/reviews" className={link}>{nav("reviews")}</Link></li>}
            <li><Link href="/board" className={link}>{nav("board")}</Link></li>
            <li><Link href="/terms" className={link}>{t("terms")}</Link></li>
            <li><Link href="/privacy" className={link}>{t("privacy")}</Link></li>
          </ul>
        </div>
        {env.contactEmail && (
          <div>
            <p className="text-sm font-bold text-white">{t("contact")}</p>
            <a href={`mailto:${env.contactEmail}`}
              className="mt-4 inline-flex min-h-10 max-w-full items-center break-all border border-white/15 px-4 text-sm font-bold text-white/80 transition-colors hover:border-white/40 hover:text-white">
              {env.contactEmail}
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
