import { getViewer, isAdminProfile } from "@/lib/auth";
import { categories } from "@/content/categories";
import { flags } from "@/lib/flags";
import { NavBar } from "@/components/NavBar";

export async function SiteHeader({ locale }: { locale: string }) {
  const { user, profile } = await getViewer();
  const courses = categories.map((c) => ({ slug: c.slug, name: locale === "en" ? c.name.en : c.name.ko, lang: c.lang }));
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <NavBar courses={courses} loggedIn={Boolean(user)} isAdmin={isAdminProfile(profile)} showReviews={flags.showReviews} />
    </header>
  );
}
