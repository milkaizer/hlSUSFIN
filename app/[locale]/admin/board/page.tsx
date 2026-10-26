import { requireAdmin } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { categoryName } from "@/content/categories";
import { kstLabel } from "@/lib/admin-utils";
import { H, H2, Notice, Field, Table, TD, Badge, Empty } from "@/components/admin/ui";
import { createNotice } from "../../board/actions";

type Q = { id: string; category: string; title: string; is_private: boolean; created_at: string; profiles: { email: string } | null; board_comments: { is_instructor: boolean }[] };
type N = { id: string; title: string; created_at: string };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminBoard({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(locale, "/admin/board");
  const [{ data: qd }, { data: nd }] = await Promise.all([
    supabase.from("board_posts").select("id,category,title,is_private,created_at,profiles(email),board_comments(is_instructor)").eq("kind", "question").order("created_at", { ascending: false }).limit(200),
    supabase.from("board_posts").select("id,title,created_at").eq("kind", "notice").order("created_at", { ascending: false }).limit(20),
  ]);
  const questions = ((qd as Q[] | null) ?? []).filter((q) => !q.board_comments.some((c) => c.is_instructor));
  const notices = (nd as N[] | null) ?? [];

  return (
    <>
      <H sub="강사 댓글이 달리면 학생 화면에 답변 완료로 바뀝니다. 답변은 글 상세에서 댓글로 남깁니다.">게시판</H>
      <Notice msg={sp.msg} err={sp.err} />
      <H2>답변 대기 질문 {questions.length}건</H2>
      <Table head={["작성", "과목", "제목", "작성자", ""]} empty={questions.length === 0 ? <Empty>답변을 기다리는 질문이 없습니다.</Empty> : null}>
        {questions.map((q) => (
          <tr key={q.id}>
            <TD className="whitespace-nowrap text-muted">{kstLabel(q.created_at)}</TD>
            <TD className="whitespace-nowrap">{categoryName(q.category, "ko")}</TD>
            <TD>{q.title} {q.is_private && <Badge>비공개</Badge>}</TD>
            <TD>{q.profiles?.email ?? ""}</TD>
            <TD><Link href={`/board/${q.id}`} className="btn-quiet btn-sm">답변하기</Link></TD>
          </tr>
        ))}
      </Table>

      <H2>공지 작성</H2>
      <form action={createNotice} className="panel space-y-4 p-5">
        <input type="hidden" name="locale" value={locale} />
        <Field label="제목"><input name="title" maxLength={200} className="field" required /></Field>
        <Field label="내용"><textarea name="body" rows={6} maxLength={10000} className="field" required /></Field>
        <button className="btn-primary">공지 올리기</button>
      </form>

      <H2>최근 공지</H2>
      {notices.length === 0 ? <p className="text-muted">공지가 없습니다.</p> : (
        <ul className="divide-y divide-line rounded-tile border border-line bg-white">
          {notices.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <Link href={`/board/${n.id}`} className="link">{n.title}</Link>
              <span className="text-sm text-muted">{kstLabel(n.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
