import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireUser, type Profile } from "@/lib/auth";
import { activeEntitlements, type Ent } from "@/lib/data/student";
import type { ServerSupabase } from "@/lib/supabase/server";
import { categoryName } from "@/content/categories";
import { tierName } from "@/content/tiers";
import { calBookingUrl } from "@/lib/cal";
import { safeHttpsUrl } from "@/lib/validate";
import { LocalTime } from "@/components/LocalTime";
import { MonthCalendar, type CalEvent } from "@/components/myclass/MonthCalendar";
import { Check } from "@/components/ui/Icons";
import { toggleLesson } from "./actions";

const TABS = ["courses", "quizzes", "schedule", "calls", "questions"] as const;
type Tab = (typeof TABS)[number];
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myclass" });
  return { title: t("title") };
}

export default async function MyClassPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await requireUser(locale, "/myclass");
  const t = await getTranslations("myclass");
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "courses";

  if (profile.status === "pending") {
    return (
      <Shell title={t("title")}>
        <div className="panel p-6" data-testid="myclass-pending">
          <h2 className="text-[20px] font-extrabold">{t("pendingTitle")}</h2>
          <p className="mt-2 max-w-prose leading-relaxed text-muted">{t("pendingBody")}</p>
          <Link href="/apply" className="btn-primary mt-5">{t("applyNow")}</Link>
        </div>
      </Shell>
    );
  }
  if (profile.status === "blocked") {
    return (
      <Shell title={t("title")}>
        <div className="panel p-6" data-testid="myclass-blocked">
          <h2 className="text-[20px] font-extrabold">{t("blockedTitle")}</h2>
          <p className="mt-2 text-muted">{t("blockedBody")}</p>
        </div>
      </Shell>
    );
  }

  const ents = await activeEntitlements(supabase, profile);
  return (
    <Shell title={t("title")} sub={profile.email}>
      <nav aria-label={t("title")} className="-mx-5 mb-8 overflow-x-auto border-b border-line px-5 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {TABS.map((k) => (
            <li key={k}>
              <Link href={{ pathname: "/myclass", query: { tab: k } }} aria-current={tab === k ? "page" : undefined} data-tab={k}
                className="-mb-px block border-b-[3px] border-transparent px-3 py-3 text-[15px] font-semibold text-muted hover:text-ink aria-[current=page]:border-azul aria-[current=page]:text-ink">
                {t(`tabs.${k}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {tab === "courses" && <CoursesTab supabase={supabase} profile={profile} ents={ents} locale={locale} />}
      {tab === "quizzes" && <QuizzesTab supabase={supabase} profile={profile} locale={locale} />}
      {tab === "schedule" && <ScheduleTab supabase={supabase} profile={profile} locale={locale} />}
      {tab === "calls" && <CallsTab supabase={supabase} profile={profile} ents={ents} locale={locale} />}
      {tab === "questions" && <QuestionsTab supabase={supabase} profile={profile} locale={locale} />}
    </Shell>
  );
}

function Shell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="wrap py-10 sm:py-12">
      <h1 className="h-page">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

type TabProps = { supabase: ServerSupabase; profile: Profile; locale: string };

// ---------------------------------------------------------------
// 내 과목
// ---------------------------------------------------------------
type LessonRow = { id: string; title: string; sort: number };
type CourseRow = { id: string; category: string; title: string; description: string | null; sort: number; lessons: LessonRow[] };

async function CoursesTab({ supabase, profile, ents, locale }: TabProps & { ents: Ent[] }) {
  const t = await getTranslations("myclass");
  const format = await getFormatter();
  if (ents.length === 0) {
    return (
      <div className="panel p-6" data-testid="no-courses">
        <p className="text-muted">{t("noCourses")}</p>
        <Link href="/apply" className="btn-primary mt-4">{t("applyNow")}</Link>
      </div>
    );
  }
  const [{ data: courseData }, { data: progressData }] = await Promise.all([
    supabase.from("courses").select("id,category,title,description,sort,lessons(id,title,sort)")
      .in("category", ents.map((e) => e.category)).order("sort").order("created_at"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", profile.id),
  ]);
  const courses = (courseData as CourseRow[] | null) ?? [];
  const done = new Set(((progressData as { lesson_id: string }[] | null) ?? []).map((p) => p.lesson_id));

  return (
    <div className="space-y-12">
      {ents.map((e) => {
        const list = courses.filter((c) => c.category === e.category);
        return (
          <section key={e.category} data-course-section={e.category}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[3px] border-ink pb-3">
              <h2 className="text-[22px] font-extrabold">{categoryName(e.category, locale)}</h2>
              <p className="text-sm text-muted">
                {t("tier")} {tierName(e.tier, locale)}, {t("expires", { date: format.dateTime(new Date(e.expires_at), { dateStyle: "medium" }) })}
              </p>
            </div>
            {list.length === 0 ? (
              <p className="mt-4 text-muted">{t("noLessons")}</p>
            ) : (
              list.map((c) => {
                const lessons = [...c.lessons].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
                const n = lessons.filter((l) => done.has(l.id)).length;
                return (
                  <div key={c.id} className="mt-6" data-course={c.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[18px] font-extrabold">{c.title}</h3>
                      <span className="text-sm font-semibold text-muted" data-testid="progress">{t("progress", { done: n, total: lessons.length })}</span>
                    </div>
                    {c.description && <p className="mt-1 text-[15px] text-muted">{c.description}</p>}
                    {lessons.length === 0 ? (
                      <p className="mt-3 text-muted">{t("noLessons")}</p>
                    ) : (
                      <ol className="mt-3 divide-y divide-line rounded-tile border border-line bg-white">
                        {lessons.map((l, i) => {
                          const isDone = done.has(l.id);
                          return (
                            <li key={l.id} className="flex items-center gap-3 px-4 py-3" data-lesson={l.id}>
                              <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-muted">{i + 1}</span>
                              <Link href={`/myclass/lesson/${l.id}`} className="min-w-0 flex-1 font-semibold hover:text-azul">{l.title}</Link>
                              <form action={toggleLesson}>
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="lesson_id" value={l.id} />
                                <input type="hidden" name="done" value={isDone ? "1" : "0"} />
                                <button className={`badge min-h-8 gap-1 border px-2.5 ${isDone ? "border-ok/30 bg-ok/10 text-ok" : "border-line bg-white text-muted hover:text-ink"}`}
                                  aria-pressed={isDone} aria-label={`${l.title}: ${isDone ? t("markUndo") : t("markDone")}`}>
                                  {isDone && <Check className="h-3.5 w-3.5" />}
                                  {isDone ? t("completed") : t("markDone")}
                                </button>
                              </form>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                );
              })
            )}
          </section>
        );
      })}
      <Link href="/apply" className="btn-quiet">{t("applyMore")}</Link>
    </div>
  );
}

// ---------------------------------------------------------------
// 문제·모의고사
// ---------------------------------------------------------------
type QuizRow = { id: string; category: string; title: string; kind: "practice" | "mock"; time_limit_min: number | null; max_attempts: number | null };
type AttemptRow = { id: string; quiz_id: string; status: string; started_at: string; deadline_at: string | null; score: number | null; max_score: number | null };

async function QuizzesTab({ supabase, profile, locale }: TabProps) {
  const t = await getTranslations("myclass");
  const [{ data: qd }, { data: ad }] = await Promise.all([
    supabase.from("quizzes").select("id,category,title,kind,time_limit_min,max_attempts").order("category").order("created_at"),
    supabase.from("attempts").select("id,quiz_id,status,started_at,deadline_at,score,max_score").eq("user_id", profile.id).order("started_at", { ascending: false }),
  ]);
  const quizzes = (qd as QuizRow[] | null) ?? [];
  const attempts = (ad as AttemptRow[] | null) ?? [];
  if (quizzes.length === 0) return <p className="text-muted" data-testid="no-quizzes">{t("noQuizzes")}</p>;
  const now = Date.now();
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {quizzes.map((q) => {
        const mine = attempts.filter((a) => a.quiz_id === q.id);
        const open = mine.find((a) => a.status === "in_progress" && (!a.deadline_at || new Date(a.deadline_at).getTime() + 120000 > now));
        const left = q.max_attempts == null ? null : Math.max(0, q.max_attempts - mine.length);
        const last = mine.find((a) => a.status !== "in_progress");
        return (
          <li key={q.id} className="panel flex flex-col p-5" data-quiz={q.id}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`badge ${q.kind === "mock" ? "bg-azafran-soft text-ink" : "bg-azul-soft text-azul-deep"}`}>{q.kind === "mock" ? t("quizMock") : t("quizPractice")}</span>
              <span className="text-muted">{categoryName(q.category, locale)}</span>
            </div>
            <h3 className="mt-2 text-[18px] font-extrabold">{q.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {q.time_limit_min ? t("minutes", { n: q.time_limit_min }) : t("noLimit")}, {left == null ? t("unlimited") : t("attemptsLeft", { n: left })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {open ? (
                <Link href={`/myclass/attempt/${open.id}`} className="btn-primary btn-sm">{t("continue")}</Link>
              ) : left === 0 ? (
                <span className="text-sm font-semibold text-muted" data-testid="no-more-attempts">{t("noMoreAttempts")}</span>
              ) : (
                <Link href={`/myclass/quiz/${q.id}`} className="btn-primary btn-sm">{t("start")}</Link>
              )}
              {last && <Link href={`/myclass/attempt/${last.id}`} className="btn-quiet btn-sm">{t("viewResult")}</Link>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------
// 일정
// ---------------------------------------------------------------
type LiveRow = { id: string; category: string; title: string; starts_at: string; duration_min: number };
type BookingRow = { id: string; category: string | null; starts_at: string; ends_at: string; status: "accepted" | "cancelled" | "over_limit"; meet_url: string | null };

async function ScheduleTab({ supabase, profile, locale }: TabProps) {
  const t = await getTranslations("myclass");
  const from = new Date(Date.now() - 62 * 86400000).toISOString();
  const to = new Date(Date.now() + 190 * 86400000).toISOString();
  const [{ data: ld }, { data: bd }] = await Promise.all([
    supabase.from("live_sessions").select("id,category,title,starts_at,duration_min").gte("starts_at", from).lte("starts_at", to).order("starts_at"),
    supabase.from("call_bookings").select("id,category,starts_at,ends_at,status,meet_url").eq("user_id", profile.id).neq("status", "cancelled").gte("starts_at", from).lte("starts_at", to).order("starts_at"),
  ]);
  const lives = (ld as LiveRow[] | null) ?? [];
  const bookings = (bd as BookingRow[] | null) ?? [];
  const events: CalEvent[] = [
    ...bookings.map((b) => ({ id: `c-${b.id}`, kind: "call" as const, title: `${t("call")}${b.category ? `, ${categoryName(b.category, locale)}` : ""}`, startsAt: b.starts_at })),
    ...lives.map((l) => ({ id: `l-${l.id}`, kind: "live" as const, title: `${t("liveClass")}, ${l.title}`, startsAt: l.starts_at })),
  ];
  const now = Date.now();
  const upcoming = lives.filter((l) => new Date(l.starts_at).getTime() + l.duration_min * 60000 > now).slice(0, 5);
  const links = await Promise.all(upcoming.map(async (l) => {
    const { data } = await supabase.rpc("live_link", { p_session: l.id });
    return safeHttpsUrl(data);
  }));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <MonthCalendar events={events} locale={locale} />
      <aside>
        <h3 className="text-[17px] font-extrabold">{t("upcomingLive")}</h3>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-muted">{t("noUpcoming")}</p>
        ) : (
          <ul className="mt-3 space-y-3" data-testid="upcoming-live">
            {upcoming.map((l, i) => (
              <li key={l.id} className="panel p-4" data-live={l.id}>
                <p className="font-semibold">{l.title}</p>
                <p className="mt-0.5 text-sm text-muted">{categoryName(l.category, locale)}, <LocalTime iso={l.starts_at} locale={locale} /></p>
                {links[i] ? (
                  <a href={links[i]!} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm mt-3" data-testid="join-live">{t("join")}</a>
                ) : (
                  <p className="mt-2 text-xs text-muted" data-testid="link-soon">{t("linkSoon")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------
// 회화콜 예약
// ---------------------------------------------------------------
async function CallsTab({ supabase, profile, ents, locale }: TabProps & { ents: Ent[] }) {
  const t = await getTranslations("myclass");
  if (ents.length === 0) return <p className="text-muted">{t("noCourses")}</p>;
  const credits = await Promise.all(ents.map(async (e) => {
    const { data } = await supabase.rpc("my_call_credits", { p_category: e.category });
    return typeof data === "number" ? data : 0;
  }));
  const { data: bd } = await supabase.from("call_bookings").select("id,category,starts_at,ends_at,status,meet_url")
    .eq("user_id", profile.id).neq("status", "cancelled").gte("ends_at", new Date().toISOString()).order("starts_at").limit(20);
  const bookings = (bd as BookingRow[] | null) ?? [];

  return (
    <div className="space-y-10">
      <ul className="grid gap-4 md:grid-cols-2">
        {ents.map((e, i) => {
          const n = credits[i];
          const url = calBookingUrl(e.category, { id: profile.id, email: profile.email, name: profile.name });
          return (
            <li key={e.category} className="panel p-5" data-call-card={e.category}>
              <h3 className="text-[18px] font-extrabold">{categoryName(e.category, locale)}</h3>
              <p className="mt-1 text-sm text-muted">{t("tier")} {tierName(e.tier, locale)}</p>
              {n > 0 ? (
                <>
                  <p className="mt-3 font-semibold" data-testid="credits-left" data-credits={n}>{t("creditsLeft", { n })}</p>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4" data-testid="book-call">{t("book")}</a>
                  ) : (
                    <p className="mt-3 text-sm text-muted">{t("bookNotReady")}</p>
                  )}
                </>
              ) : (
                <p className="mt-3 rounded-tile bg-paper p-3 text-sm text-muted" data-testid="no-credits" data-credits={0}>{t("noCredits")}</p>
              )}
            </li>
          );
        })}
      </ul>
      <section>
        <h3 className="text-[17px] font-extrabold">{t("upcomingCalls")}</h3>
        {bookings.length === 0 ? (
          <p className="mt-2 text-muted">{t("noUpcoming")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line" data-testid="upcoming-calls">
            {bookings.map((b) => {
              const meet = safeHttpsUrl(b.meet_url);
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <span className="font-semibold">{b.category ? categoryName(b.category, locale) : t("call")}</span>
                    <span className="text-muted">, <LocalTime iso={b.starts_at} locale={locale} /></span>
                    {b.status === "over_limit" && <span className="badge ml-2 bg-azafran-soft text-ink">{t("overLimit")}</span>}
                  </span>
                  {meet && <a href={meet} target="_blank" rel="noopener noreferrer" className="btn-quiet btn-sm">{t("meetLink")}</a>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------
// 내 질문
// ---------------------------------------------------------------
type PostRow = { id: string; category: string; title: string; is_private: boolean; created_at: string; board_comments: { is_instructor: boolean }[] };

async function QuestionsTab({ supabase, profile, locale }: TabProps) {
  const t = await getTranslations("myclass");
  const b = await getTranslations("board");
  const { data } = await supabase.from("board_posts").select("id,category,title,is_private,created_at,board_comments(is_instructor)")
    .eq("kind", "question").eq("author_id", profile.id).order("created_at", { ascending: false });
  const posts = (data as PostRow[] | null) ?? [];
  if (posts.length === 0) {
    return (
      <div>
        <p className="text-muted">{t("noQuestions")}</p>
        <Link href="/board" className="btn-quiet mt-4">{t("goBoard")}</Link>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {posts.map((p) => {
        const answered = p.board_comments.some((c) => c.is_instructor);
        return (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className="min-w-0">
              <Link href={`/board/${p.id}`} className="font-semibold hover:text-azul">{p.title}</Link>
              <span className="ml-2 text-sm text-muted">{categoryName(p.category, locale)}, <LocalTime iso={p.created_at} locale={locale} mode="date" /></span>
            </span>
            <span className="flex gap-1.5">
              {p.is_private && <span className="badge bg-line/70 text-ink">{b("privateBadge")}</span>}
              <span className={`badge ${answered ? "bg-ok/10 text-ok" : "bg-azafran-soft text-ink"}`}>{answered ? b("answered") : b("waiting")}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
