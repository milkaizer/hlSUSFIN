import "server-only";
import { CATEGORY_SLUGS } from "@/content/categories";
import { TIER_RANK, type TierSlug } from "@/content/tiers";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export type Ent = { id: string; category: string; tier: TierSlug; starts_at: string; expires_at: string };

// 지금 유효한 권한. 같은 과목이 여러 개면 가장 높은 단계, 같은 단계면 가장 늦은 만료
export async function activeEntitlements(supabase: ServerSupabase, profile: Profile): Promise<Ent[]> {
  if (profile.status !== "approved") return [];
  const now = new Date().toISOString();
  const { data } = await supabase.from("entitlements").select("id,category,tier,starts_at,expires_at")
    .eq("user_id", profile.id).lte("starts_at", now).gt("expires_at", now);
  const best = new Map<string, Ent>();
  for (const e of (data as Ent[] | null) ?? []) {
    const cur = best.get(e.category);
    if (!cur || TIER_RANK[e.tier] > TIER_RANK[cur.tier] || (TIER_RANK[e.tier] === TIER_RANK[cur.tier] && e.expires_at > cur.expires_at)) {
      best.set(e.category, e);
    }
  }
  return CATEGORY_SLUGS.flatMap((s) => (best.has(s) ? [best.get(s)!] : []));
}

// Q&A 를 볼 수 있는 과목. 관리자는 전부
export async function readableCategories(supabase: ServerSupabase, profile: Profile): Promise<string[]> {
  if (profile.role === "admin" && profile.status === "approved") return [...CATEGORY_SLUGS];
  return (await activeEntitlements(supabase, profile)).map((e) => e.category);
}
