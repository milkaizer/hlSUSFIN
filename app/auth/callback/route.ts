import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";

// 로그인 콜백: 코드 교환 후 1계정 1세션 토큰 발급 (9.1)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const loginBase = next === "/en" || next.startsWith("/en/") ? "/en/login" : "/login";
  const fail = () => NextResponse.redirect(`${origin}${loginBase}?reason=failed`);

  const supabase = await createClient();
  if (!supabase || !code) return fail();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail();

  // 새 세션 토큰 발급. 이전 기기는 다음 보호 경로 요청에서 로그아웃된다
  const token = randomUUID();
  const { error: claimError } = await supabase.rpc("claim_session", {
    p_token: token,
    p_user_agent: request.headers.get("user-agent") ?? "",
  });
  if (claimError) return fail();

  const response = NextResponse.redirect(`${origin}${next}`);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
