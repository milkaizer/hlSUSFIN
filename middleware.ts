import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

type CookieList = { name: string; value: string; options: CookieOptions }[];

const intl = createIntlMiddleware(routing);
const LOGIN = /^\/(en\/)?login(\/|$)/;

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
  if (!user) return response;

  // 1계정 1세션 (9.1): 로그인한 요청은 모든 페이지에서 쿠키 토큰과 DB 토큰을 비교한다
  // (처음엔 보호 경로만 봤지만 /%6Dyclass 같은 인코딩 경로와 게시판으로 우회돼 전체로 넓힘)
  const path = request.nextUrl.pathname;
  let decoded = path;
  try { decoded = decodeURIComponent(path); } catch { decoded = path; }
  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
  const { data } = await supabase.from("user_sessions").select("session_token").eq("user_id", user.id).maybeSingle();
  if (!cookieToken || !data || data.session_token !== cookieToken) {
    // 링크 미리 가져오기(prefetch)는 사용자가 보지 않는 요청이라 쿠키를 지우지 않는다.
    // 여기서 지우면 다음 이동 때 로그아웃 상태로만 보여 other_device 안내가 사라진다 (13.3-2).
    // 페이지와 서버 액션은 getViewer 가 같은 비교로 막는다
    if (isPrefetch(request)) return response;
    await supabase.auth.signOut({ scope: "local" });
    // 로그인 화면이면 이동 없이 이 기기 세션만 정리 (리다이렉트 반복 방지)
    if (LOGIN.test(decoded)) {
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    const prefix = decoded === "/en" || decoded.startsWith("/en/") ? "/en" : "";
    const target = new URL(`${prefix}/login?reason=other_device`, request.url);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.cookies.delete(SESSION_COOKIE);
    return redirect;
  }
  // 쓰는 동안은 세션 쿠키 기한을 늘린다 (30일 고정 만료로 같은 기기가 튕기는 것 방지, P8-9)
  response.cookies.set(SESSION_COOKIE, cookieToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

// App Router 링크 prefetch 와 브라우저 수준 prefetch
function isPrefetch(request: NextRequest) {
  const h = request.headers;
  if (h.has("next-router-prefetch") || h.has("x-middleware-prefetch")) return true;
  return /prefetch/i.test(`${h.get("purpose") ?? ""} ${h.get("sec-purpose") ?? ""}`);
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
