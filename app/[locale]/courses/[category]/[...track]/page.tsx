import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory, resolveTrack } from "@/content/categories";
import { CourseDetail } from "@/components/CourseDetail";

// 세부 과정 페이지 (/courses/es-school/jeju/grade-2). 안내용이고 수강신청은 과목 단위 그대로
type Params = { params: Promise<{ locale: string; category: string; track: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, category, track } = await params;
  const c = getCategory(category);
  const trail = resolveTrack(category, track);
  if (!c || !trail) return {};
  const L = (v: { ko: string; en: string }) => (locale === "en" ? v.en : v.ko);
  return { title: `${L(c.name)} · ${trail.map((t) => L(t.name)).join(" ")}`, description: L(c.short) };
}

export default async function TrackPage({ params }: Params) {
  const { locale, category, track } = await params;
  const c = getCategory(category);
  const trail = resolveTrack(category, track);
  if (!c || !trail) notFound();
  return <CourseDetail c={c} locale={locale} trail={trail} />;
}
