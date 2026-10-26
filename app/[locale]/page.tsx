import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { categories } from "@/content/categories";
import { flags } from "@/lib/flags";
import { getLatestNotice, getPublishedResults, getPublishedReviews, getTiers } from "@/lib/data/public";
import { NoticeBanner } from "@/components/home/NoticeBanner";
import { Hero } from "@/components/home/Hero";
import { CourseTiles } from "@/components/home/CourseTiles";
import { Features } from "@/components/home/Features";
import { ResultsSection } from "@/components/home/ResultsSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { Instructor } from "@/components/home/Instructor";
import { BoardEntry } from "@/components/home/BoardEntry";
import { TierCards } from "@/components/TierCards";

// 홈 섹션 순서 (6.1)
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const [notice, tiers, results, reviews] = await Promise.all([
    getLatestNotice(),
    getTiers(),
    flags.showResults ? getPublishedResults() : Promise.resolve([]),
    flags.showReviews ? getPublishedReviews(5) : Promise.resolve([]),
  ]);
  return (
    <>
      <NoticeBanner notice={notice} />
      <Hero />
      <CourseTiles items={categories} locale={locale} />
      <Features />
      <section data-section="pricing" className="wrap py-12 sm:py-16">
        <h2 className="h-section">{t("pricingTitle")}</h2>
        <p className="lead mt-2">{t("pricingLead")}</p>
        <div className="mt-8"><TierCards tiers={tiers} locale={locale} /></div>
        <Link href="/pricing" className="btn-quiet mt-6">{t("pricingMore")}</Link>
      </section>
      {flags.showResults && <ResultsSection items={results} locale={locale} />}
      {flags.showReviews && <ReviewsSection items={reviews} locale={locale} />}
      <Instructor locale={locale} />
      <BoardEntry />
    </>
  );
}
