import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getTiers } from "@/lib/data/public";
import { TierCards } from "@/components/TierCards";
import { PageHead } from "@/components/PageHead";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: t("title") };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("pricing");
  const tiers = await getTiers();
  return (
    <>
      <PageHead title={t("title")} lead={t("lead")} />
      <div className="wrap py-12">
        <TierCards tiers={tiers} locale={locale} withPayButtons />
        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:gap-5">
          <Link href="/apply" className="btn-primary">{t("useApply")}</Link>
          <p className="text-sm text-muted">{t("note")}</p>
        </div>
      </div>
    </>
  );
}
