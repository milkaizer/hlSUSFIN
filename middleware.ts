import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE } from "@/lib/session";

type CookieList = { name: string; value: string; options: CookieOptions }[];

const intl = createIntlMiddleware(routing);
const PROTECTED = /^\/(en\/)?(myclass|admin|apply)(\/|$)/;

export async function middleware(request: NextRequest) {
  const response = intl(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: CookieList) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });

  // 세션 갱신 (만료된 access token 을 새로 받아 쿠키에 쓴다)
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  // /%6Dyclass 처럼 인코딩된 경로도 같은 페이지로 가므로 풀어서 검사한다. 풀 수 없으면 보호 경로로 본다
  let decoded = path;
  try { decoded = decodeURIComponent(path); } catch { decoded = "/myclass"; }
  if (!user || !(PROTECTED.test(path) || PROTECTED.test(decoded))) return response;

  // 1계정 1세션: 쿠키 토큰과 DB 토큰 비교
  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
  const { data } = await supabase.from("user_sessions").select("session_token").eq("user_id", user.id).maybeSingle();
  if (!cookieToken || !data || data.session_token !== cookieToken) {
    await supabase.auth.signOut({ scope: "local" });
    const prefix = decoded === "/en" || decoded.startsWith("/en/") ? "/en" : "";
    const target = new URL(`${prefix}/login?reason=other_device`, request.url);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.cookies.delete(SESSION_COOKIE);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
