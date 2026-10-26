import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// 과목별 Cal.com 예약 링크 (공개 환경변수). 예약 시 metadata 로 사용자와 과목을 넘긴다 (10.3)
// metadata 는 예약자가 바꿀 수 있으므로 서버 시크릿으로 서명(metadata[sig])해서 웹훅이 확인한다 (P8-2)
const links: Record<string, string | undefined> = {
  "es-conversation": process.env.NEXT_PUBLIC_CAL_LINK_ES_CONVERSATION,
  "es-school": process.env.NEXT_PUBLIC_CAL_LINK_ES_SCHOOL,
  "ko-conversation": process.env.NEXT_PUBLIC_CAL_LINK_KO_CONVERSATION,
  topik: process.env.NEXT_PUBLIC_CAL_LINK_TOPIK,
};

export function calMetadataSig(userId: string, category: string, secret = process.env.CAL_WEBHOOK_SECRET ?? "") {
  return createHmac("sha256", secret).update(`vita-booking:${userId}:${category}`).digest("hex").slice(0, 32);
}

export function verifyCalMetadataSig(userId: string, category: string, sig: unknown) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret || typeof sig !== "string" || !/^[0-9a-f]{32}$/.test(sig)) return false;
  const a = Buffer.from(calMetadataSig(userId, category, secret));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function calBookingUrl(category: string, user: { id: string; email: string; name: string | null }) {
  const base = links[category];
  // 서명할 시크릿이 없으면 웹훅도 동작하지 않으므로 링크를 내보내지 않는다
  if (!base || !/^https:\/\//.test(base) || !process.env.CAL_WEBHOOK_SECRET) return null;
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  url.searchParams.set("email", user.email);
  if (user.name) url.searchParams.set("name", user.name);
  url.searchParams.set("metadata[user_id]", user.id);
  url.searchParams.set("metadata[category]", category);
  url.searchParams.set("metadata[sig]", calMetadataSig(user.id, category));
  return url.toString();
}
