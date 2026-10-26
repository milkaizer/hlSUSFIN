import "server-only";
import { createClient } from "@/lib/supabase/server";
import { tiers as defaultTiers, type TierInfo, type TierSlug } from "@/content/tiers";

export type NoticeRow = { id: string; title: string; body: string; created_at: string };
export type ResultRow = { id: string; category: string | null; masked_name: string; headline: string; detail: string | null; year: number | null };
export type ReviewRow = { id: string; category: string | null; masked_name: string; body: string; created_at: string };

type TierRow = { slug: TierSlug; rank: number; name_ko: string; name_en: string; monthly_call_credits: number; live_access: boolean; price_krw: number | null };

// DB tiers 우선, 없거나 연결 전이면 content/tiers.ts
export async function getTiers(): Promise<TierInfo[]> {
  const supabase = await createClient();
  if (!supabase) return defaultTiers;
  const { data, error } = await supabase.from("tiers").select("*").order("rank");
  if (error || !data || data.length === 0) return defaultTiers;
  return (data as TierRow[]).map((t) => ({
    slug: t.slug,
    name: { ko: t.name_ko, en: t.name_en },
    priceKrw: t.price_krw,
    monthlyCalls: t.monthly_call_credits,
    live: t.live_access,
  }));
}

export async function getNotices(limit = 20): Promise<NoticeRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("board_posts").select("id,title,body,created_at")
    .eq("kind", "notice").order("created_at", { ascending: false }).limit(limit);
  return (data as NoticeRow[] | null) ?? [];
}

export async function getLatestNotice(): Promise<NoticeRow | null> {
  return (await getNotices(1))[0] ?? null;
}

export async function getPublishedResults(limit = 12): Promise<ResultRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("results").select("id,category,masked_name,headline,detail,year")
    .eq("published", true).order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(limit);
  return (data as ResultRow[] | null) ?? [];
}

export async function getPublishedReviews(limit = 50): Promise<ReviewRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("reviews").select("id,category,masked_name,body,created_at")
    .eq("published", true).order("created_at", { ascending: false }).limit(limit);
  return (data as ReviewRow[] | null) ?? [];
}
