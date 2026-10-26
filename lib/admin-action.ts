import "server-only";
import { redirect } from "next/navigation";
import { getViewer, isAdminProfile, localePath } from "@/lib/auth";

// 관리자 서버 액션 공통: 권한 확인과 결과 메시지를 붙인 리다이렉트
// DB 함수와 RLS 가 다시 한 번 is_admin() 을 검사한다
export async function adminContext(fd: FormData) {
  const locale = fd.get("locale") === "en" ? "en" : "ko";
  const v = await getViewer();
  if (!v.supabase || !v.user || !isAdminProfile(v.profile)) {
    redirect(`${localePath(locale, "/login")}?next=${localePath(locale, "/admin")}`);
  }
  const done = (path: string, q: { msg?: string; err?: string } = {}): never => {
    const params = new URLSearchParams();
    if (q.msg) params.set("msg", q.msg);
    if (q.err) params.set("err", q.err);
    const qs = params.toString();
    redirect(`${localePath(locale, path)}${qs ? (path.includes("?") ? "&" : "?") + qs : ""}`);
  };
  return { supabase: v.supabase, user: v.user, profile: v.profile, locale, done };
}
