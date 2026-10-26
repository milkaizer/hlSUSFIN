import { requireAdmin } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { categories, categoryName } from "@/content/categories";
import { H, H2, Notice, Field, Table, TD, Badge, Empty } from "@/components/admin/ui";
import { createCourse } from "../actions";

type CourseRow = { id: string; category: string; title: string; sort: number; published: boolean; lessons: { count: number }[] };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ContentPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/content");
  const { data } = await supabase.from("courses").select("id,category,title,sort,published,lessons(count)").order("category").order("sort").order("created_at");
  const courses = (data as CourseRow[] | null) ?? [];
  return (
    <>
      <H sub="비공개 강의는 학생에게 보이지 않습니다. 레슨은 강의 상세에서 관리합니다.">강의</H>
      <Notice msg={sp.msg} err={sp.err} />
      <Table head={["과목", "강의명", "레슨", "순서", "공개"]} empty={courses.length === 0 ? <Empty>등록된 강의가 없습니다.</Empty> : null}>
        {courses.map((c) => (
          <tr key={c.id}>
            <TD className="whitespace-nowrap">{categoryName(c.category, "ko")}</TD>
            <TD><Link href={`/admin/content/${c.id}`} className="link">{c.title}</Link></TD>
            <TD className="tabular-nums">{c.lessons?.[0]?.count ?? 0}</TD>
            <TD className="tabular-nums">{c.sort}</TD>
            <TD>{c.published ? <Badge tone="green">공개</Badge> : <Badge>비공개</Badge>}</TD>
          </tr>
        ))}
      </Table>
      <H2>새 강의</H2>
      <form action={createCourse} className="panel grid gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <Field label="과목">
          <select name="category" className="field">{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name.ko}</option>)}</select>
        </Field>
        <Field label="강의명"><input name="title" maxLength={200} className="field" required /></Field>
        <Field label="설명 (선택)" className="sm:col-span-2"><textarea name="description" rows={2} maxLength={2000} className="field" /></Field>
        <Field label="순서" hint="작은 숫자가 먼저"><input type="number" name="sort" defaultValue={0} className="field" /></Field>
        <label className="flex items-center gap-2 self-end pb-3 font-semibold"><input type="checkbox" name="published" className="h-4 w-4 accent-azul" /> 공개</label>
        <div className="sm:col-span-2"><button className="btn-primary">강의 만들기</button></div>
      </form>
    </>
  );
}
