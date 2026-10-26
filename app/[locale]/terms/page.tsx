import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/PageHead";
import { LegalDoc } from "@/components/LegalDoc";
import { terms } from "@/content/legal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "footer" });
  return { title: t("terms") };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  return (
    <>
      <PageHead title={t("footer.terms")} lead={t("legal.testNote")}>
        <p className="mt-2 text-sm font-semibold text-muted">{t("legal.effective")}</p>
      </PageHead>
      <LegalDoc sections={locale === "en" ? terms.en : terms.ko} />
    </>
  );
}
