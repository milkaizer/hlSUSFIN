import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory } from "@/content/categories";
import { CourseDetail } from "@/components/CourseDetail";

type Params = { params: Promise<{ locale: string; category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, category } = await params;
  const c = getCategory(category);
  if (!c) return {};
  return { title: locale === "en" ? c.name.en : c.name.ko, description: locale === "en" ? c.short.en : c.short.ko };
}

export default async function CoursePage({ params }: Params) {
  const { locale, category } = await params;
  const c = getCategory(category);
  if (!c) notFound();
  return <CourseDetail c={c} locale={locale} />;
}
