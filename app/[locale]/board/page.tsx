import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getNotices } from "@/lib/data/public";
import { PageHead } from "@/components/PageHead";
import { LocalTime } from "@/components/LocalTime";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "board" });
  return { title: t("title") };
}

export default async function BoardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("board");
  const notices = await getNotices();
  return (
    <>
      <PageHead title={t("title")} />
      <div className="wrap py-12">
        <section>
          <h2 className="h-section">{t("notices")}</h2>
          {notices.length === 0 ? (
            <p className="mt-3 text-muted">{t("emptyNotices")}</p>
          ) : (
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {notices.map((n) => (
                <li key={n.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
                  <Link href={`/board/${n.id}`} className="font-semibold hover:text-azul">{n.title}</Link>
                  <LocalTime iso={n.created_at} locale={locale} mode="date" className="text-sm text-muted" />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="mt-12">
          <h2 className="h-section">{t("qa")}</h2>
          <p className="mt-3 text-muted">{t("qaLocked")}</p>
        </section>
      </div>
    </>
  );
}
