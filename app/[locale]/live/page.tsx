import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { categoryName } from "@/content/categories";
import { PageHead } from "@/components/PageHead";
import { LocalTime } from "@/components/LocalTime";

type LiveRow = { id: string; category: string; title: string; starts_at: string; duration_min: number };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "live" });
  return { title: t("title") };
}

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("live");
  const { supabase, user } = await getViewer();

  // 로그인 시 RLS 가 권한 있는 라이브만 돌려준다 (meet_url 컬럼은 학생에게 비공개)
  let lives: LiveRow[] = [];
  if (supabase && user) {
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from("live_sessions").select("id,category,title,starts_at,duration_min")
      .gte("starts_at", since).order("starts_at").limit(20);
    const now = Date.now();
    lives = ((data as LiveRow[] | null) ?? []).filter((l) => new Date(l.starts_at).getTime() + l.duration_min * 60000 > now);
  }

  return (
    <>
      <PageHead title={t("title")} lead={t("lead")} />
      <div className="wrap py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="panel border-t-[3px] border-t-azul p-6">
            <h2 className="text-[20px] font-extrabold">{t("liveHow")}</h2>
            <p className="mt-3 leading-relaxed text-muted">{t("liveHowBody")}</p>
          </section>
          <section className="panel border-t-[3px] border-t-azafran p-6">
            <h2 className="text-[20px] font-extrabold">{t("callHow")}</h2>
            <p className="mt-3 leading-relaxed text-muted">{t("callHowBody")}</p>
          </section>
        </div>
        <section className="mt-12">
          <h2 className="h-section">{t("upcoming")}</h2>
          {!user ? (
            <p className="mt-3 text-muted">{t("loginToSee")}</p>
          ) : lives.length === 0 ? (
            <p className="mt-3 text-muted">{t("empty")}</p>
          ) : (
            <ul className="mt-5 divide-y divide-line border-y border-line" data-testid="live-list">
              {lives.map((l) => (
                <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
                  <span className="font-semibold">{l.title}</span>
                  <span className="text-sm text-muted">
                    {categoryName(l.category, locale)}, <LocalTime iso={l.starts_at} locale={locale} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href={{ pathname: "/myclass", query: { tab: "calls" } }} className="btn-primary mt-8">{t("goMyclass")}</Link>
        </section>
      </div>
    </>
  );
}
