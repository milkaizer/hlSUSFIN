// 2.3 단계 기본값. DB tiers 가 있으면 그 값이 우선. price_krw null 이면 "준비 중" 표시
export const TIER_SLUGS = ["basic", "standard", "premium"] as const;
export type TierSlug = (typeof TIER_SLUGS)[number];

export type TierInfo = {
  slug: TierSlug;
  name: { ko: string; en: string };
  priceKrw: number | null;
  monthlyCalls: number;
  live: boolean;
};

export const tiers: TierInfo[] = [
  { slug: "basic", name: { ko: "베이직", en: "Basic" }, priceKrw: null, monthlyCalls: 0, live: false },
  { slug: "standard", name: { ko: "스탠다드", en: "Standard" }, priceKrw: null, monthlyCalls: 2, live: true },
  { slug: "premium", name: { ko: "프리미엄", en: "Premium" }, priceKrw: null, monthlyCalls: 4, live: true },
];

export const TIER_RANK = { basic: 1, standard: 2, premium: 3 } as const;

export function isTierSlug(s: unknown): s is TierSlug {
  return typeof s === "string" && (TIER_SLUGS as readonly string[]).includes(s);
}

export function tierName(slug: string, locale: string) {
  const t = tiers.find((x) => x.slug === slug);
  if (!t) return slug;
  return locale === "en" ? t.name.en : t.name.ko;
}
