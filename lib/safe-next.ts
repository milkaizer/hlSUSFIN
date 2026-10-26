// 로그인 후 이동 경로는 사이트 내부 경로만 허용
// 제어 문자(탭 등)는 브라우저가 지워 //evil.com 이 될 수 있으므로 거부한다 (P9-5)
export function safeNext(next: string | null | undefined, fallback = "/myclass"): string {
  if (!next || next.length > 1000 || !next.startsWith("/") || /[\u0000-\u001F\u007F\\]|\s/.test(next)) return fallback;
  try {
    const u = new URL(next, "http://vita.invalid");
    if (u.origin !== "http://vita.invalid" || u.pathname.startsWith("//")) return fallback;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}
