import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { getViewer, isAdminProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { categoryName } from "@/content/categories";
import { LocalTime } from "@/components/LocalTime";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { createComment, deleteComment, deletePost } from "../actions";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
type Post = { id: string; kind: "notice" | "question"; category: string | null; author_id: string; title: string; body: string; is_private: boolean; created_at: string };
type Comment = { id: string; author_id: string; body: string; is_instructor: boolean; created_at: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return {};
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase.from("board_posts").select("title").eq("id", id).maybeSingle<{ title: string }>();
  return data ? { title: data.title } : {};
}

// 볼 수 있는지는 RLS(can_read_post)가 정한다
export default async function PostPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const t = await getTranslations("board");
  const { supabase, user, profile } = await getViewer();
  const db = supabase ?? null;

  const { data: post } = db ? await db.from("board_posts").select("id,kind,category,author_id,title,body,is_private,created_at").eq("id", id).maybeSingle<Post>() : { data: null };
  if (!post) {
    return (
      <div className="wrap py-16">
        <p className="panel p-6 text-muted" data-testid="post-no-access">{t("noAccess")}</p>
        <Link href="/board" className="btn-quiet mt-6">{t("back")}</Link>
      </div>
    );
  }
  const { data: cd } = await db!.from("board_comments").select("id,author_id,body,is_instructor,created_at").eq("post_id", id).order("created_at");
  const comments = (cd as Comment[] | null) ?? [];
  const admin = isAdminProfile(profile);
  const canDelete = Boolean(user && (post.author_id === user.id || admin));
  const canComment = Boolean(user && (post.kind === "question" || admin));
  const backHref = post.kind === "question" && post.category ? { pathname: "/board", query: { c: post.category } } : "/board";

  return (
    <div className="wrap max-w-3xl py-10 sm:py-12">
      <Link href={backHref} className="text-sm font-semibold text-muted hover:text-azul">{t("back")}</Link>
      <article className="mt-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {post.kind === "notice" ? <span className="badge bg-azul text-white">{t("notice")}</span> : post.category && <span>{categoryName(post.category, locale)}</span>}
          {post.is_private && <span className="badge bg-line/70 text-ink">{t("privateBadge")}</span>}
          <LocalTime iso={post.created_at} locale={locale} />
        </div>
        <h1 className="mt-2 text-[26px] font-extrabold leading-snug sm:text-[30px]">{post.title}</h1>
        <div className="mt-5 whitespace-pre-line border-t border-line pt-5 text-[16px] leading-relaxed">{post.body}</div>
        {canDelete && (
          <form action={deletePost} className="mt-6">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="category" value={post.category ?? ""} />
            <ConfirmSubmit message={t("deleteConfirm")} className="btn-danger btn-sm">{t("delete")}</ConfirmSubmit>
          </form>
        )}
      </article>

      <section id="comments" className="mt-12">
        <h2 className="text-[19px] font-extrabold">{t("comment")} {comments.length}</h2>
        {comments.length === 0 ? (
          <p className="mt-3 text-muted">{t("noComments")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {comments.map((c) => (
              <li key={c.id} data-comment={c.id} data-instructor={c.is_instructor}
                className={`rounded-tile border p-4 ${c.is_instructor ? "border-azul/30 bg-azul-soft" : "border-line bg-white"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  {c.is_instructor && <span className="badge bg-azul text-white">{t("instructor")}</span>}
                  <LocalTime iso={c.created_at} locale={locale} />
                </div>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{c.body}</p>
                {user && (c.author_id === user.id || admin) && (
                  <form action={deleteComment} className="mt-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="post_id" value={post.id} />
                    <input type="hidden" name="comment_id" value={c.id} />
                    <ConfirmSubmit message={t("deleteConfirm")} className="text-sm font-semibold text-warn hover:underline">{t("delete")}</ConfirmSubmit>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canComment && (
          <form action={createComment} className="mt-6 space-y-3">
            {sp.err === "1" && <p role="alert" className="text-sm font-semibold text-warn">{t("error")}</p>}
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="post_id" value={post.id} />
            <label htmlFor="c-body" className="sr-only">{t("comment")}</label>
            <textarea id="c-body" name="body" rows={4} maxLength={10000} className="field" required />
            <button className="btn-primary">{t("commentSubmit")}</button>
          </form>
        )}
      </section>
    </div>
  );
}
