import type { ReactNode } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "관리자", robots: { index: false } };

// 관리자 화면은 한국어 전용 (6.11). 관리자가 아니면 403
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale, "/admin");
  return (
    <div lang="ko" className="wrap grid gap-8 py-8 lg:grid-cols-[12rem_1fr]">
      <AdminNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
