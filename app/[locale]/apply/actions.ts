"use server";
import { redirect } from "next/navigation";
import { getViewer, localePath } from "@/lib/auth";
import { isCategorySlug } from "@/content/categories";
import { isTierSlug } from "@/content/tiers";

// 수강신청 제출 (6.4). status 는 DB 정책이 pending 만 허용한다
export async function submitApplication(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "ko";
  const category = formData.get("category");
  const tier = formData.get("tier");
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);
  const back = (q: string) => redirect(`${localePath(locale, "/apply")}?${q}`);

  if (!isCategorySlug(category) || !isTierSlug(tier)) back("error=1");
  const { supabase, user, profile } = await getViewer();
  if (!supabase || !user || !profile) redirect(`${localePath(locale, "/login")}?next=${localePath(locale, "/apply")}`);
  if (profile.status === "blocked") back("error=1");

  const { error } = await supabase.from("enrollment_requests").insert({
    user_id: user.id,
    category: category as string,
    tier: tier as string,
    message: message || null,
  });
  // 같은 과목에 확인 중인 신청이 이미 있으면 유니크 인덱스가 막는다
  back(error ? (error.code === "23505" ? "error=dup" : "error=1") : "sent=1");
}
