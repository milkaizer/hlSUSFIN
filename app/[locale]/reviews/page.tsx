import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { flags } from "@/lib/flags";
import { getPublishedReviews } from "@/lib/data/public";
import { PageHead } from "@/components/PageHead";
import { ReviewList } from "@/components/home/ReviewsSection";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("reviewsTitle") };
}

// 스페이서: 플래그가 꺼져 있으면 404 (10.6)
export default async function ReviewsPage({ params }: { params: Promise<{ locale: string }> }) {
  if (!flags.showReviews) notFound();
  const { locale } = await params;
  const t = await getTranslations("home");
  const items = await getPublishedReviews();
  return (
    <>
      <PageHead title={t("reviewsTitle")} />
      <div className="wrap py-12">
        {items.length === 0 ? <p className="text-muted" data-testid="reviews-empty">{t("reviewsEmpty")}</p> : <ReviewList items={items} locale={locale} />}
      </div>
    </>
  );
}
