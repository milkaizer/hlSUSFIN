import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  locale: "ko" | "en";
  role: "admin" | "student";
  status: "pending" | "approved" | "blocked";
  created_at: string;
};

// 요청당 한 번만 조회 (헤더와 페이지가 함께 쓴다)
export const getViewer = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, profile: null } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null } as const;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return { supabase, user, profile: profile ?? null } as const;
});

export function localePath(locale: string, path: string) {
  return locale === "ko" ? path : `/${locale}${path === "/" ? "" : path}`;
}

function loginPath(locale: string, next: string) {
  return `${localePath(locale, "/login")}?next=${encodeURIComponent(next)}`;
}

export async function requireUser(locale: string, next: string) {
  const v = await getViewer();
  // 로그인은 됐는데 프로필을 못 읽으면 로그인 화면에 실패 안내 (로그인 화면은 프로필이 있을 때만 되돌려 보낸다)
  if (v.supabase && v.user && !v.profile) redirect(`${localePath(locale, "/login")}?reason=failed`);
  if (!v.supabase || !v.user || !v.profile) redirect(loginPath(locale, localePath(locale, next)));
  return { supabase: v.supabase, user: v.user, profile: v.profile };
}

export function isAdminProfile(p: Profile | null | undefined) {
  return Boolean(p && p.role === "admin" && p.status === "approved");
}

export async function requireAdmin(locale: string, next: string) {
  const v = await requireUser(locale, next);
  if (!isAdminProfile(v.profile)) forbidden();
  return v;
}
