// 관리자 입력값 변환. 날짜는 서울 기준 (6.11)
export function kstDayStart(d: string) { return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00+09:00` : null; }
export function kstDayEnd(d: string) { return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T23:59:59+09:00` : null; }
export function kstLocal(dt: string) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt) ? `${dt}:00+09:00` : null; }

export function kstDateInput(iso: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
export function kstDateTimeInput(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function kstLabel(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
export function kstDateLabel(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(new Date(iso));
}
// 서울 기준 이번 달 1일 (YYYY-MM-01)
export function kstMonthStart(d: Date = new Date()) {
  return `${kstDateInput(d).slice(0, 7)}-01`;
}
export function addDays(d: string, n: number) {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function parseVideo(input: string): { provider: "youtube" | "vimeo"; id: string | null } {
  const s = input.trim();
  if (!s) return { provider: "youtube", id: null };
  const vimeo = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { provider: "vimeo", id: vimeo[1] };
  const yt = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,20})/);
  if (yt) return { provider: "youtube", id: yt[1] };
  if (/^\d{6,12}$/.test(s)) return { provider: "vimeo", id: s };
  if (/^[A-Za-z0-9_-]{6,20}$/.test(s)) return { provider: "youtube", id: s };
  return { provider: "youtube", id: null };
}

export function videoInputValue(provider: string, id: string | null) {
  if (!id) return "";
  return provider === "vimeo" ? `https://vimeo.com/${id}` : `https://youtu.be/${id}`;
}

export function lines(s: string) { return s.split("\n").map((x) => x.trim()).filter(Boolean); }

export function str(fd: FormData, key: string, max = 10000) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}
export function int(fd: FormData, key: string): number | null {
  const v = String(fd.get(key) ?? "").trim();
  if (!/^-?\d+$/.test(v)) return null;
  return Number(v);
}
export function bool(fd: FormData, key: string) {
  return fd.get(key) === "on" || fd.get(key) === "true";
}
