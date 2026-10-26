import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { getNotices } from "@/lib/data/public";
import { readableCategories } from "@/lib/data/student";
import { categoryName, isCategorySlug } from "@/content/categories";
import { PageHead } from "@/components/PageHead";
import { LocalTime } from "@/components/LocalTime";
import { createQuestion } from "./actions";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
type QRow = { id: string; title: string; is_private: boolean; author_id: string; created_at: string; board_comments: { is_instructor: boolean }[] };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "board" });
  return { title: t("title") };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("board");
  const notices = await getNotices();
  const { supabase, user, profile } = await getViewer();

  // Q&A 는 권한 있는 과목만 탭으로 (6.7)
  const readable = supabase && profile ? await readableCategories(supabase, profile) : [];
  const requested = typeof sp.c === "string" ? sp.c : null;
  const current = requested ?? readable[0] ?? null;
  const allowed = current !== null && readable.includes(current);

  let questions: QRow[] = [];
  if (supabase && allowed && current) {
    const { data } = await supabase.from("board_posts").select("id,title,is_private,author_id,created_at,board_comments(is_instructor)")
      .eq("kind", "question").eq("category", current).order("created_at", { ascending: false }).limit(100);
    questions = (data as QRow[] | null) ?? [];
  }

  return (
    <>
      <PageHead title={t("title")} />
      <div className="wrap py-12">
        <section>
          <h2 className="h-section">{t("notices")}</h2>
          {notices.length === 0 ? (
            <p className="mt-3 text-muted">{t("emptyNotices")}</p>
          ) : (
            <ul className="mt-5 divide-y divide-line border-y border-line" data-testid="notice-list">
              {notices.map((n) => (
                <li key={n.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
                  <Link href={`/board/${n.id}`} className="font-semibold hover:text-azul">{n.title}</Link>
                  <LocalTime iso={n.created_at} locale={locale} mode="date" className="text-sm text-muted" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14" id="qa">
          <h2 className="h-section">{t("qa")}</h2>
          {readable.length === 0 ? (
            <p className="mt-3 text-muted" data-testid="qa-locked">{t("qaLocked")}</p>
          ) : (
            <>
              <nav aria-label={t("qa")} className="mt-5 overflow-x-auto border-b border-line">
                <ul className="flex min-w-max gap-1">
                  {readable.map((c) => (
                    <li key={c}>
                      <Link href={{ pathname: "/board", query: { c } }} aria-current={current === c ? "page" : undefined} data-qa-tab={c}
                        className="-mb-px block border-b-[3px] border-transparent px-3 py-3 text-[15px] font-semibold text-muted hover:text-ink aria-[current=page]:border-azul aria-[current=page]:text-ink">
                        {categoryName(c, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              {!allowed ? (
                <p className="mt-6 rounded-tile border border-line bg-white p-4 text-muted" data-testid="qa-no-access">{t("noAccess")}</p>
              ) : (
                <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem]">
                  <div>
                    {questions.length === 0 ? (
                      <p className="text-muted">{t("emptyQa")}</p>
                    ) : (
                      <ul className="divide-y divide-line border-y border-line" data-testid="question-list">
                        {questions.map((q) => {
                          const answered = q.board_comments.some((c) => c.is_instructor);
                          return (
                            <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-3.5" data-question={q.id}>
                              <span className="min-w-0">
                                <Link href={`/board/${q.id}`} className="font-semibold hover:text-azul">{q.title}</Link>
                                <LocalTime iso={q.created_at} locale={locale} mode="date" className="ml-2 text-sm text-muted" />
                              </span>
                              <span className="flex gap-1.5">
                                {q.is_private && <span className="badge bg-line/70 text-ink">{t("privateBadge")}</span>}
                                <span className={`badge ${answered ? "bg-ok/10 text-ok" : "bg-azafran-soft text-ink"}`} data-answered={answered}>{answered ? t("answered") : t("waiting")}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <form action={createQuestion} className="panel h-fit space-y-4 p-5">
                    <h3 className="text-[18px] font-extrabold">{t("write")}</h3>
                    {sp.err === "1" && <p role="alert" className="text-sm font-semibold text-warn">{t("error")}</p>}
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="category" value={current && isCategorySlug(current) ? current : ""} />
                    <div>
                      <label htmlFor="q-title" className="label">{t("titleLabel")}</label>
                      <input id="q-title" name="title" maxLength={200} className="field" required />
                    </div>
                    <div>
                      <label htmlFor="q-body" className="label">{t("bodyLabel")}</label>
                      <textarea id="q-body" name="body" rows={6} maxLength={10000} className="field" required />
                    </div>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" name="is_private" className="mt-0.5 h-4 w-4 accent-azul" />
                      <span>{t("private")}</span>
                    </label>
                    <button className="btn-primary w-full">{t("submit")}</button>
                  </form>
                </div>
              )}
            </>
          )}
          {!user && <Link href="/login" className="btn-quiet mt-5">{(await getTranslations("nav"))("login")}</Link>}
        </section>
      </div>
    </>
  );
}
