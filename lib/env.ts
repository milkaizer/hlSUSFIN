// 환경변수 모음. NEXT_PUBLIC_* 는 빌드 시 번들에 들어간다
export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

// Supabase 값이 없으면 앱은 로그아웃 상태로 동작한다 (공개 페이지 테스트용)
export function supabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
