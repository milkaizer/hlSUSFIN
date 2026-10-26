import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { NoticeRow } from "@/lib/data/public";

// 최신 공지 1개. 없으면 렌더하지 않는다 (6.1)
export async function NoticeBanner({ notice }: { notice: NoticeRow | null }) {
  if (!notice) return null;
  const t = await getTranslations("home");
  return (
    <div data-section="notice" className="border-b border-line bg-azul-soft">
      <div className="wrap flex items-center gap-3 py-2.5 text-[15px]">
        <span className="badge shrink-0 bg-azul text-white">{t("noticeLabel")}</span>
        <Link href={`/board/${notice.id}`} className="truncate font-semibold hover:underline">{notice.title}</Link>
      </div>
    </div>
  );
}
