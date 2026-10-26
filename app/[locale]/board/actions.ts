"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getViewer, isAdminProfile, localePath } from "@/lib/auth";
import { isCategorySlug } from "@/content/categories";
import { isUuid } from "@/lib/validate";

function ctx(fd: FormData) {
  return { locale: fd.get("locale") === "en" ? "en" : "ko" };
}

// 질문 올리기. 권한 있는 과목만 RLS 가 허용한다
export async function createQuestion(fd: FormData) {
  const { locale } = ctx(fd);
  const category = String(fd.get("category") ?? "");
  const title = String(fd.get("title") ?? "").trim().slice(0, 200);
  const body = String(fd.get("body") ?? "").trim().slice(0, 10000);
  const isPrivate = fd.get("is_private") === "on";
  const back = (q: string) => redirect(`${localePath(locale, "/board")}?c=${encodeURIComponent(category)}${q}`);
  const { supabase, user } = await getViewer();
  if (!supabase || !user) redirect(`${localePath(locale, "/login")}?next=${localePath(locale, "/board")}`);
  if (!isCategorySlug(category) || !title || !body) back("&err=1");
  const id = randomUUID();
  const { error } = await supabase.from("board_posts")
    .insert({ id, kind: "question", category, author_id: user.id, title, body, is_private: isPrivate });
  if (error) back("&err=1");
  redirect(localePath(locale, `/board/${id}`));
}

export async function createComment(fd: FormData) {
  const { locale } = ctx(fd);
  const postId = String(fd.get("post_id") ?? "");
  const body = String(fd.get("body") ?? "").trim().slice(0, 10000);
  if (!isUuid(postId)) redirect(localePath(locale, "/board"));
  const { supabase, user } = await getViewer();
  if (!supabase || !user) redirect(`${localePath(locale, "/login")}?next=${localePath(locale, `/board/${postId}`)}`);
  if (!body) redirect(`${localePath(locale, `/board/${postId}`)}?err=1`);
  // is_instructor 는 트리거가 정한다
  const { error } = await supabase.from("board_comments").insert({ post_id: postId, author_id: user.id, body });
  redirect(`${localePath(locale, `/board/${postId}`)}${error ? "?err=del" : "#comments"}`);
}

export async function deletePost(fd: FormData) {
  const { locale } = ctx(fd);
  const postId = String(fd.get("post_id") ?? "");
  const category = String(fd.get("category") ?? "");
  const { supabase, user } = await getViewer();
  if (!supabase || !user || !isUuid(postId)) redirect(localePath(locale, "/board"));
  const { error } = await supabase.from("board_posts").delete().eq("id", postId);
  if (error) redirect(`${localePath(locale, `/board/${postId}`)}?err=del`);
  redirect(`${localePath(locale, "/board")}${isCategorySlug(category) ? `?c=${category}` : ""}`);
}

export async function deleteComment(fd: FormData) {
  const { locale } = ctx(fd);
  const postId = String(fd.get("post_id") ?? "");
  const commentId = String(fd.get("comment_id") ?? "");
  const { supabase, user } = await getViewer();
  if (!supabase || !user || !isUuid(postId) || !isUuid(commentId)) redirect(localePath(locale, "/board"));
  const { error } = await supabase.from("board_comments").delete().eq("id", commentId);
  redirect(`${localePath(locale, `/board/${postId}`)}${error ? "?err=1" : "#comments"}`);
}

// 공지 작성 (관리자). RLS 가 관리자만 허용한다
export async function createNotice(fd: FormData) {
  const { locale } = ctx(fd);
  const title = String(fd.get("title") ?? "").trim().slice(0, 200);
  const body = String(fd.get("body") ?? "").trim().slice(0, 10000);
  const v = await getViewer();
  if (!v.supabase || !v.user || !isAdminProfile(v.profile)) redirect(localePath(locale, "/board"));
  if (!title || !body) redirect(`${localePath(locale, "/admin/board")}?err=input`);
  const { error } = await v.supabase.from("board_posts").insert({ kind: "notice", category: null, author_id: v.user.id, title, body });
  redirect(`${localePath(locale, "/admin/board")}?${error ? "err=db" : "msg=created"}`);
}
