import { requireAdmin } from "@/lib/auth";

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale, "/admin");
  return (
    <div className="wrap py-12">
      <h1 className="h-page">관리자</h1>
    </div>
  );
}
