// 과목별 Cal.com 예약 링크 (공개 환경변수). 예약 시 metadata 로 사용자와 과목을 넘긴다 (10.3)
const links: Record<string, string | undefined> = {
  "es-conversation": process.env.NEXT_PUBLIC_CAL_LINK_ES_CONVERSATION,
  "es-school": process.env.NEXT_PUBLIC_CAL_LINK_ES_SCHOOL,
  "ko-conversation": process.env.NEXT_PUBLIC_CAL_LINK_KO_CONVERSATION,
  topik: process.env.NEXT_PUBLIC_CAL_LINK_TOPIK,
};

export function calBookingUrl(category: string, user: { id: string; email: string; name: string | null }) {
  const base = links[category];
  if (!base || !/^https:\/\//.test(base)) return null;
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
  return url.toString();
}
