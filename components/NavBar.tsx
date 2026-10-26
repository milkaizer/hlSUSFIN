"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Logo } from "@/components/Logo";
import { Caret, MenuIcon } from "@/components/ui/Icons";

type Course = { slug: string; name: string; lang: "es" | "ko" };

type Props = {
  courses: Course[];
  loggedIn: boolean;
  isAdmin: boolean;
  showReviews: boolean;
};

export function NavBar({ courses, loggedIn, isAdmin, showReviews }: Props) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === "ko" ? "en" : "ko";

  const [menuOpen, setMenuOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const dropBtnRef = useRef<HTMLButtonElement>(null);
  const dropId = useId();
  const panelId = useId();

  // 경로가 바뀌면 메뉴를 닫는다
  useEffect(() => {
    setMenuOpen(false);
    setCoursesOpen(false);
  }, [pathname]);

  // 드롭다운 바깥 클릭으로 닫기
  useEffect(() => {
    if (!coursesOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setCoursesOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [coursesOpen]);

  // Esc 로 닫고 여는 버튼으로 포커스 복귀
  useEffect(() => {
    if (!coursesOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (coursesOpen) {
        setCoursesOpen(false);
        dropBtnRef.current?.focus();
      } else {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [coursesOpen, menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navLink = "rounded-tile px-3 py-2 text-[15px] font-semibold text-ink hover:bg-azul-soft hover:text-azul aria-[current=page]:text-azul";

  const mainLinks = [
    { href: "/live", label: t("live") },
    { href: "/pricing", label: t("pricing") },
    ...(showReviews ? [{ href: "/reviews", label: t("reviews") }] : []),
    { href: "/board", label: t("board") },
  ];

  return (
    <nav aria-label={t("main")} className="wrap flex h-16 items-center gap-4">
      <Link href="/" aria-label={t("home")} className="mr-2 shrink-0 rounded-tile">
        <Logo />
      </Link>

      {/* 데스크톱 */}
      <ul className="hidden items-center gap-1 lg:flex">
        <li>
          <div ref={dropRef} className="relative"
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCoursesOpen(false); }}>
            <button ref={dropBtnRef} type="button" className={`${navLink} inline-flex items-center gap-1`}
              aria-expanded={coursesOpen} aria-controls={dropId} aria-current={pathname.startsWith("/courses/") ? "page" : undefined}
              onClick={() => setCoursesOpen((v) => !v)} data-testid="courses-toggle">
              {t("courses")}
              <Caret className={`h-3.5 w-3.5 transition-transform ${coursesOpen ? "rotate-180" : ""}`} />
            </button>
            <ul id={dropId} hidden={!coursesOpen} data-testid="courses-menu"
              className="absolute left-0 top-full mt-2 w-64 rounded-tile border border-line bg-white p-1.5">
              {courses.map((c) => (
                <li key={c.slug}>
                  <Link href={`/courses/${c.slug}`} aria-current={isActive(`/courses/${c.slug}`) ? "page" : undefined}
                    className="flex items-center gap-3 rounded px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-azul-soft aria-[current=page]:text-azul">
                    <span aria-hidden className={`h-4 w-1 rounded-full ${c.lang === "es" ? "bg-azul" : "bg-azafran"}`} />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </li>
        {mainLinks.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={navLink} aria-current={isActive(l.href) ? "page" : undefined}>{l.label}</Link>
          </li>
        ))}
      </ul>

      <div className="ml-auto hidden items-center gap-1 lg:flex">
        <Link href={pathname} locale={otherLocale} className="rounded-tile px-3 py-2 text-sm font-semibold text-muted hover:text-azul" hrefLang={otherLocale}>
          {t("language")}
        </Link>
        {isAdmin && <Link href="/admin" className={navLink} aria-current={isActive("/admin") ? "page" : undefined}>{t("admin")}</Link>}
        {loggedIn ? (
          <>
            <Link href="/myclass" className={navLink} aria-current={isActive("/myclass") ? "page" : undefined}>{t("myclass")}</Link>
            <form action="/auth/signout" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="rounded-tile px-3 py-2 text-[15px] font-semibold text-muted hover:text-azul">{t("logout")}</button>
            </form>
          </>
        ) : (
          <Link href="/login" className={navLink} aria-current={isActive("/login") ? "page" : undefined}>{t("login")}</Link>
        )}
        <Link href="/apply" className="btn-primary ml-2">{t("apply")}</Link>
      </div>

      {/* 모바일 */}
      <div className="ml-auto flex items-center gap-2 lg:hidden">
        <Link href="/apply" className="btn-primary btn-sm">{t("apply")}</Link>
        <button type="button" className="btn-quiet btn-sm" aria-expanded={menuOpen} aria-controls={panelId}
          onClick={() => setMenuOpen((v) => !v)} data-testid="menu-toggle">
          <MenuIcon open={menuOpen} />
          <span>{menuOpen ? t("close") : t("menu")}</span>
        </button>
      </div>

      <div id={panelId} hidden={!menuOpen} className="absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-paper lg:hidden">
        <div className="wrap py-5">
          <p className="mb-2 text-sm font-semibold text-muted">{t("courses")}</p>
          <ul className="grid grid-cols-2 gap-2">
            {courses.map((c) => (
              <li key={c.slug}>
                <Link href={`/courses/${c.slug}`} className={`block h-full rounded-tile border border-line border-l-[6px] bg-white px-3 py-3 text-[15px] font-bold ${c.lang === "es" ? "border-l-azul" : "border-l-azafran"}`}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {mainLinks.map((l) => (
              <li key={l.href}><Link href={l.href} className="block py-3 text-[16px] font-semibold">{l.label}</Link></li>
            ))}
            {isAdmin && <li><Link href="/admin" className="block py-3 text-[16px] font-semibold">{t("admin")}</Link></li>}
            {loggedIn ? (
              <li><Link href="/myclass" className="block py-3 text-[16px] font-semibold">{t("myclass")}</Link></li>
            ) : (
              <li><Link href="/login" className="block py-3 text-[16px] font-semibold">{t("login")}</Link></li>
            )}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href={pathname} locale={otherLocale} hrefLang={otherLocale} className="btn-quiet btn-sm">{t("language")}</Link>
            {loggedIn && (
              <form action="/auth/signout" method="post">
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="btn-ghost btn-sm">{t("logout")}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
