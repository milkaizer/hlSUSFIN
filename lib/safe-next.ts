// 로그인 후 이동 경로는 사이트 내부 경로만 허용
export function safeNext(next: string | null | undefined, fallback = "/myclass"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  return next;
}
