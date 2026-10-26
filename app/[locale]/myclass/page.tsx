import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myclass" });
  return { title: t("title") };
}

export default async function MyClassPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { profile } = await requireUser(locale, "/myclass");
  const t = await getTranslations("myclass");
  return (
    <div className="wrap py-12">
      <h1 className="h-page">{t("title")}</h1>
      {profile.status === "pending" && (
        <div className="panel mt-8 p-6" data-testid="myclass-pending">
          <h2 className="text-[20px] font-extrabold">{t("pendingTitle")}</h2>
          <p className="mt-2 max-w-prose leading-relaxed text-muted">{t("pendingBody")}</p>
          <Link href="/apply" className="btn-primary mt-5">{t("applyNow")}</Link>
        </div>
      )}
      {profile.status === "blocked" && (
        <div className="panel mt-8 p-6" data-testid="myclass-blocked">
          <h2 className="text-[20px] font-extrabold">{t("blockedTitle")}</h2>
          <p className="mt-2 text-muted">{t("blockedBody")}</p>
        </div>
      )}
    </div>
  );
}
