import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { isUuid, safeHttpsUrl } from "@/lib/validate";
import { categoryName } from "@/content/categories";
import { VideoPlayer } from "@/components/myclass/VideoPlayer";
import { Check } from "@/components/ui/Icons";
import { toggleLesson } from "../../actions";

type Props = { params: Promise<{ locale: string; id: string }> };
type LessonRow = {
  id: string; title: string; video_provider: string; video_id: string | null; materials_url: string | null; sort: number; course_id: string;
  courses: { id: string; title: string; category: string } | null;
};

export const metadata: Metadata = { robots: { index: false } };

// 레슨: 권한 밖이면 RLS 가 0행을 돌려주고 404 (13.4-6, 7)
export default async function LessonPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, profile } = await requireUser(locale, `/myclass/lesson/${id}`);
  const t = await getTranslations("myclass");

  const { data } = await supabase.from("lessons")
    .select("id,title,video_provider,video_id,materials_url,sort,course_id,courses(id,title,category)")
    .eq("id", id).maybeSingle<LessonRow>();
  if (!data || !data.courses) notFound();
  const lesson = data;
  const course = data.courses;

  const [{ data: siblings }, { data: prog }] = await Promise.all([
    supabase.from("lessons").select("id,title,sort").eq("course_id", lesson.course_id).order("sort").order("title"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", profile.id).eq("lesson_id", id).maybeSingle(),
  ]);
  const list = (siblings as { id: string; title: string; sort: number }[] | null) ?? [];
  const idx = list.findIndex((l) => l.id === id);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const isDone = Boolean(prog);
  const materials = safeHttpsUrl(lesson.materials_url);

  return (
    <div className="wrap py-8 sm:py-10">
      <Link href={{ pathname: "/myclass", query: { tab: "courses" } }} className="text-sm font-semibold text-muted hover:text-azul">
        {categoryName(course.category, locale)}, {course.title}
      </Link>
      <h1 className="mt-2 text-[24px] font-extrabold leading-snug sm:text-[30px]">{lesson.title}</h1>
      <div className="mt-6 max-w-4xl">
        <VideoPlayer provider={lesson.video_provider} videoId={lesson.video_id} title={lesson.title} watermark={profile.email} emptyText={t("noVideo")} />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <form action={toggleLesson}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <input type="hidden" name="done" value={isDone ? "1" : "0"} />
            <input type="hidden" name="back" value="lesson" />
            <button className={isDone ? "btn border border-ok/40 bg-ok/10 text-ok" : "btn-primary"} aria-pressed={isDone} data-testid="lesson-toggle">
              {isDone && <Check />}
              {isDone ? t("markUndo") : t("markDone")}
            </button>
          </form>
          {isDone && <span className="text-sm font-semibold text-ok" data-testid="lesson-done">{t("completed")}</span>}
          {materials && (
            <a href={materials} target="_blank" rel="noopener noreferrer" className="btn-quiet">{t("materials")}</a>
          )}
        </div>
        <nav className="mt-10 grid gap-3 border-t border-line pt-6 sm:grid-cols-2" aria-label={t("lessons")}>
          {prev ? (
            <Link href={`/myclass/lesson/${prev.id}`} className="panel block p-4 hover:border-azul">
              <span className="text-sm text-muted">{t("prevLesson")}</span>
              <span className="mt-0.5 block font-semibold">{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link href={`/myclass/lesson/${next.id}`} className="panel block p-4 text-right hover:border-azul">
              <span className="text-sm text-muted">{t("nextLesson")}</span>
              <span className="mt-0.5 block font-semibold">{next.title}</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
