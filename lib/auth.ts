import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/session";

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
// 1계정 1세션: 이 기기의 vita_sid 가 DB 토큰과 다르면 로그아웃 상태로 본다.
// 미들웨어가 보호 경로에서 먼저 끊지만, 경로 모양과 상관없이 페이지와 서버 액션에서도 막는다
export const getViewer = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, profile: null, otherDevice: false } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, otherDevice: false } as const;
  const [{ data: profile }, { data: sess }, cookieStore] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase.from("user_sessions").select("session_token").eq("user_id", user.id).maybeSingle<{ session_token: string }>(),
    cookies(),
  ]);
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !sess || sess.session_token !== token) return { supabase, user: null, profile: null, otherDevice: true } as const;
  return { supabase, user, profile: profile ?? null, otherDevice: false } as const;
});

export function localePath(locale: string, path: string) {
  return locale === "ko" ? path : `/${locale}${path === "/" ? "" : path}`;
}

function loginPath(locale: string, next: string) {
  return `${localePath(locale, "/login")}?next=${encodeURIComponent(next)}`;
}

export async function requireUser(locale: string, next: string) {
  const v = await getViewer();
  if (v.otherDevice) redirect(`${localePath(locale, "/login")}?reason=other_device`);
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
