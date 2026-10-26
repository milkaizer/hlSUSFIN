import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { requireAdmin } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { isUuid } from "@/lib/validate";
import { categories } from "@/content/categories";
import { tiers } from "@/content/tiers";
import { videoInputValue } from "@/lib/admin-utils";
import { H, H2, Notice, Field, Table, TD, Empty } from "@/components/admin/ui";
import { createLesson, deleteCourse, deleteLesson, updateCourse, updateLesson } from "../../actions";

type Course = { id: string; category: string; title: string; description: string | null; sort: number; published: boolean };
type Lesson = { id: string; title: string; video_provider: string; video_id: string | null; materials_url: string | null; min_tier: string; sort: number; published: boolean };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CourseDetail({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: SP }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireAdmin(locale, `/admin/content/${id}`);
  const { data: course } = await supabase.from("courses").select("id,category,title,description,sort,published").eq("id", id).maybeSingle<Course>();
  if (!course) notFound();
  const { data } = await supabase.from("lessons").select("id,title,video_provider,video_id,materials_url,min_tier,sort,published").eq("course_id", id).order("sort").order("created_at");
  const lessons = (data as Lesson[] | null) ?? [];
  const base = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="course_id" value={course.id} />
    </>
  );
  const tierOptions = tiers.map((t) => <option key={t.slug} value={t.slug}>{t.name.ko}</option>);

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/content" className="link">강의 목록</Link></p>
      <H>{course.title}</H>
      <Notice msg={sp.msg} err={sp.err} />

      <form action={updateCourse} className="panel grid gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={course.id} />
        <Field label="과목">
          <select name="category" defaultValue={course.category} className="field">{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name.ko}</option>)}</select>
        </Field>
        <Field label="강의명"><input name="title" defaultValue={course.title} maxLength={200} className="field" required /></Field>
        <Field label="설명 (선택)" className="sm:col-span-2"><textarea name="description" defaultValue={course.description ?? ""} rows={2} maxLength={2000} className="field" /></Field>
        <Field label="순서"><input type="number" name="sort" defaultValue={course.sort} className="field" /></Field>
        <label className="flex items-center gap-2 self-end pb-3 font-semibold"><input type="checkbox" name="published" defaultChecked={course.published} className="h-4 w-4 accent-azul" /> 공개</label>
        <div className="sm:col-span-2"><button className="btn-primary">강의 저장</button></div>
      </form>

      <H2>레슨 {lessons.length}개</H2>
      <p className="mb-3 text-sm text-muted">영상은 YouTube 또는 Vimeo 주소나 ID를 넣습니다. 최소 단계보다 낮은 단계 학생에게는 보이지 않습니다.</p>
      <Table head={["제목", "최소 단계", "순서", "공개", "영상", "자료 링크", ""]} empty={lessons.length === 0 ? <Empty>레슨이 없습니다.</Empty> : null}>
        {lessons.map((l) => {
          const f = `lesson-${l.id}`;
          return (
            <tr key={l.id} data-lesson={l.id}>
              <TD><input form={f} name="title" defaultValue={l.title} maxLength={200} className="field min-w-48 py-1.5" aria-label="제목" required /></TD>
              <TD><select form={f} name="min_tier" defaultValue={l.min_tier} className="field w-28 py-1.5" aria-label="최소 단계">{tierOptions}</select></TD>
              <TD><input form={f} type="number" name="sort" defaultValue={l.sort} className="field w-20 py-1.5" aria-label="순서" /></TD>
              <TD><input form={f} type="checkbox" name="published" defaultChecked={l.published} className="h-4 w-4 accent-azul" aria-label="공개" /></TD>
              <TD><input form={f} name="video" defaultValue={videoInputValue(l.video_provider, l.video_id)} className="field min-w-56 py-1.5" aria-label="영상" placeholder="https://youtu.be/..." /></TD>
              <TD><input form={f} name="materials_url" defaultValue={l.materials_url ?? ""} className="field min-w-48 py-1.5" aria-label="자료 링크" placeholder="https://" /></TD>
              <TD>
                <div className="flex justify-end gap-1.5">
                  <form id={f} action={updateLesson}>{base}<input type="hidden" name="id" value={l.id} /><button className="btn-quiet btn-sm">저장</button></form>
                  <form action={deleteLesson}>{base}<input type="hidden" name="id" value={l.id} /><ConfirmSubmit message="삭제하면 되돌릴 수 없습니다. 계속할까요?" className="btn-danger btn-sm">삭제</ConfirmSubmit></form>
                </div>
              </TD>
            </tr>
          );
        })}
      </Table>

      <H2>레슨 추가</H2>
      <form action={createLesson} className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {base}
        <Field label="제목"><input name="title" maxLength={200} className="field" required /></Field>
        <Field label="최소 단계"><select name="min_tier" defaultValue="basic" className="field">{tierOptions}</select></Field>
        <Field label="순서"><input type="number" name="sort" defaultValue={(lessons.at(-1)?.sort ?? 0) + 1} className="field" /></Field>
        <Field label="영상 주소 또는 ID"><input name="video" className="field" placeholder="https://youtu.be/..." /></Field>
        <Field label="자료 링크 (선택)"><input name="materials_url" className="field" placeholder="https://" /></Field>
        <label className="flex items-center gap-2 self-end pb-3 font-semibold"><input type="checkbox" name="published" defaultChecked className="h-4 w-4 accent-azul" /> 공개</label>
        <div className="lg:col-span-3"><button className="btn-primary">레슨 추가</button></div>
      </form>

      <H2 className="text-warn">강의 삭제</H2>
      <form action={deleteCourse} className="panel flex flex-wrap items-center justify-between gap-3 border-warn/40 p-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={course.id} />
        <p className="text-sm text-muted">레슨과 학생 진도 기록도 함께 삭제됩니다. 잠시 숨기려면 비공개로 바꾸세요.</p>
        <ConfirmSubmit message="강의와 레슨, 학생 진도 기록이 모두 삭제됩니다. 계속할까요?" className="btn-danger">강의 삭제</ConfirmSubmit>
      </form>
    </>
  );
}
