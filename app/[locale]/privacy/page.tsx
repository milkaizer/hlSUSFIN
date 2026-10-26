import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/PageHead";
import { LegalDoc } from "@/components/LegalDoc";
import { privacy } from "@/content/legal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "footer" });
  return { title: t("privacy") };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  return (
    <>
      <PageHead title={t("footer.privacy")} lead={t("legal.testNote")}>
        <p className="mt-2 text-sm font-semibold text-muted">{t("legal.effective")}</p>
      </PageHead>
      <LegalDoc sections={locale === "en" ? privacy.en : privacy.ko} />
    </>
  );
}
