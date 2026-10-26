import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";

const OTP_TYPES: EmailOtpType[] = ["magiclink", "email", "signup", "invite"];

// 로그인 콜백: 코드 교환 후 1계정 1세션 토큰 발급 (9.1)
// code: PKCE (Google, 기본 매직링크). token_hash: 메일 템플릿을 token_hash 방식으로 바꾼 매직링크 (다른 브라우저에서 열어도 됨)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));
  const loginBase = next === "/en" || next.startsWith("/en/") ? "/en/login" : "/login";
  const fail = () => NextResponse.redirect(`${origin}${loginBase}?reason=failed`);

  const supabase = await createClient();
  if (!supabase) return fail();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail();
  } else if (tokenHash && otpType && OTP_TYPES.includes(otpType)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (error) return fail();
  } else {
    return fail();
  }

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
