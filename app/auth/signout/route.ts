import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/session";

// 로그아웃: 이 기기 세션만 끊고 홈으로 (303)
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const home = form?.get("locale") === "en" ? "/en" : "/";
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  const response = NextResponse.redirect(new URL(home, request.url), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
