import { getViewer, isAdminProfile } from "@/lib/auth";
import { categories, type Track } from "@/content/categories";
import { flags } from "@/lib/flags";
import { NavBar, UtilityBar, type NavTrack } from "@/components/NavBar";

export async function SiteHeader({ locale }: { locale: string }) {
  const { user, profile } = await getViewer();
  const L = (v: { ko: string; en: string }) => (locale === "en" ? v.en : v.ko);
  // 메뉴에는 짧은 이름을 쓴다 (영어 학교명)
  const toNav = (list: Track[] = []): NavTrack[] => list.map((t) => ({ slug: t.slug, name: L(t.short ?? t.name), children: toNav(t.children) }));
  const courses = categories.map((c) => ({ slug: c.slug, name: L(c.name), menu: L(c.menu ?? c.name), lang: c.lang, tracks: toNav(c.tracks) }));
  return (
    <>
      <UtilityBar loggedIn={Boolean(user)} isAdmin={isAdminProfile(profile)} />
      <header className="sticky top-0 z-40 bg-white/95 shadow-hairline backdrop-blur">
        <NavBar courses={courses} loggedIn={Boolean(user)} isAdmin={isAdminProfile(profile)} showReviews={flags.showReviews} />
      </header>
    </>
  );
}
