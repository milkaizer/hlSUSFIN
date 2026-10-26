// 입력 형식 검사 (9장 5~7)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function isUuid(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s);
}

export function isVideoId(s: unknown): s is string {
  return typeof s === "string" && VIDEO_ID_RE.test(s);
}

// 외부 링크는 https 만 렌더한다
export function safeHttpsUrl(s: unknown): string | null {
  if (typeof s !== "string" || !/^https:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function isMeetUrl(s: unknown): s is string {
  return typeof s === "string" && /^https:\/\/meet\.google\.com\/[A-Za-z0-9-]+(\?[^\s]*)?$/.test(s);
}
