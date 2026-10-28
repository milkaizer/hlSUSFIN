"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Logo } from "@/components/Logo";
import { Caret, MenuIcon } from "@/components/ui/Icons";

// 세부 과정 (스페인어 내신은 학교 아래 학년까지 2단계)
export type NavTrack = { slug: string; name: string; children: NavTrack[] };
type Course = { slug: string; name: string; menu: string; lang: "es" | "ko"; tracks: NavTrack[] };

// 대각선으로 옮겨 가는 동안 펼친 메뉴가 바뀌지 않도록 잠깐 기다린다
const HOVER_DELAY = 150;

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
  const searchParams = useSearchParams();
  const otherLocale = locale === "ko" ? "en" : "ko";
  // 언어를 바꿔도 쿼리(과목, next 등)는 유지
  const switchHref = { pathname, query: Object.fromEntries(searchParams.entries()) };

  const [menuOpen, setMenuOpen] = useState(false);
  // 데스크톱에서 펼친 경로 (["es-school", "jeju"], 빈 배열이면 모두 닫힘), 모바일에서 펼친 항목 ("es-school", "es-school/jeju")
  const [flyout, setFlyout] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const hoverTimer = useRef<number | undefined>(undefined);
  // 8px 넘게 내리면 데스크톱 헤더를 72px 에서 56px 로 줄인다 (모바일은 64px 고정)
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef<HTMLUListElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const dropId = useId();
  const panelId = useId();

  const closeFlyout = () => {
    window.clearTimeout(hoverTimer.current);
    setFlyout([]);
  };
  const dropOpen = flyout.length > 0;

  // 경로가 바뀌면 메뉴를 닫는다
  useEffect(() => {
    setMenuOpen(false);
    closeFlyout();
  }, [pathname]);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // 창을 넓혀 데스크톱 메뉴로 바뀌면 열려 있던 모바일 메뉴를 닫는다
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const onChange = () => { if (mq.matches) setMenuOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 드롭다운 바깥 클릭으로 닫기
  useEffect(() => {
    if (!dropOpen) return;
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) closeFlyout();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [dropOpen]);

  // Esc 로 닫고 헤더의 과목 링크로 포커스 복귀
  useEffect(() => {
    if (!dropOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dropOpen) {
        // 마우스로 연 경우에는 포커스를 헤더로 끌어오지 않는다
        if (barRef.current?.contains(document.activeElement)) {
          barRef.current.querySelector<HTMLAnchorElement>(`a[data-path="${flyout[0]}"]`)?.focus();
        }
        closeFlyout();
      } else {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dropOpen, menuOpen, flyout]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navLink = "rounded-tile whitespace-nowrap px-2.5 py-2 text-[15px] font-semibold text-ink hover:bg-azul-soft hover:text-azul aria-[current=page]:text-azul";

  const mainLinks = [
    { href: "/live", label: t("live") },
    { href: "/pricing", label: t("pricing") },
    ...(showReviews ? [{ href: "/reviews", label: t("reviews") }] : []),
    { href: "/board", label: t("board") },
  ];

  // 마우스는 잠깐 기다렸다 바꾸고, 키보드 포커스는 바로 바꾼다
  const hoverTo = (path: string[]) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setFlyout(path), HOVER_DELAY);
  };
  const focusTo = (path: string[]) => {
    window.clearTimeout(hoverTimer.current);
    setFlyout(path);
  };
  const isOpen = (path: string[]) => path.every((p, i) => flyout[i] === p);
  const toggleExpanded = (key: string) => setExpanded((v) => (v.includes(key) ? v.filter((k) => k !== key) : [...v, key]));

  // 방향키: 헤더의 과목에서 아래는 드롭다운 열기, 좌우는 과목 사이 이동.
  // 드롭다운 안에서 위아래는 같은 단계 이동, 오른쪽은 옆 메뉴로 들어가기, 왼쪽은 나오기
  const onMenuKey = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-path]");
    if (!a) return;
    const path = (a.dataset.path ?? "").split("/");
    const li = a.parentElement;
    const ul = li?.parentElement;
    if (!li || !ul) return;
    if (path.length === 1) {
      if (e.key === "ArrowDown" && a.getAttribute("aria-controls")) {
        e.preventDefault();
        flushSync(() => focusTo(path));
        li.querySelector<HTMLAnchorElement>(":scope > div a")?.focus();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const tops = Array.from(ul.querySelectorAll<HTMLAnchorElement>(":scope > li > a[data-path]"));
        const i = tops.indexOf(a);
        e.preventDefault();
        tops[(i + (e.key === "ArrowRight" ? 1 : tops.length - 1)) % tops.length]?.focus();
      }
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const links = Array.from(ul.children).map((c) => c.querySelector<HTMLAnchorElement>(":scope > a"));
      const i = links.indexOf(a);
      e.preventDefault();
      links[(i + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length]?.focus();
    } else if (e.key === "ArrowRight" && a.getAttribute("aria-controls")) {
      e.preventDefault();
      flushSync(() => focusTo(path));
      li.querySelector<HTMLAnchorElement>(":scope > div a")?.focus();
    } else if (e.key === "ArrowLeft" && path.length > 1) {
      const parent = ul.closest("li")?.querySelector<HTMLAnchorElement>(":scope > a");
      if (!parent) return;
      e.preventDefault();
      parent.focus();
      setFlyout(path.slice(0, -2));
    }
  };

  const dot = (lang: "es" | "ko") => <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${lang === "es" ? "bg-azul" : "bg-azafran"}`} />;
  const panel = "rounded-2xl bg-white p-1.5 shadow-[0_8px_24px_rgba(22,33,62,0.12)] ring-1 ring-line/70";
  const item = "flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-azul-soft aria-[current=page]:text-azul aria-expanded:bg-azul-soft";
  const subCaret = <Caret className="ml-auto h-3.5 w-3.5 shrink-0 -rotate-90 text-muted" />;
  const subId = (path: string[]) => `${dropId}-${path.join("-")}`;

  // 데스크톱 드롭다운. 첫 단계는 아래로, 그다음은 오른쪽으로 펼친다. pt-2, pl-3 은 마우스가 건너가는 다리
  const flyoutList = (base: string[], list: NavTrack[], width: string) => (
    <div className={`absolute z-10 ${base.length === 1 ? "left-0 top-full pt-2" : "-top-1.5 left-full pl-3"}`} hidden={!isOpen(base)}>
      <ul id={subId(base)} className={`w-max ${width} ${panel}`}>
        {list.map((tr) => {
          const path = [...base, tr.slug];
          const href = `/courses/${path.join("/")}`;
          const has = tr.children.length > 0;
          return (
            <li key={tr.slug} className="relative" onMouseEnter={() => hoverTo(has ? path : base)}>
              <Link href={href} data-path={path.join("/")} onFocus={() => focusTo(has ? path : base)}
                aria-current={pathname === href ? "page" : undefined}
                aria-expanded={has ? isOpen(path) : undefined} aria-controls={has ? subId(path) : undefined}
                className={item}>
                {tr.name}
                {has && subCaret}
              </Link>
              {has && flyoutList(path, tr.children, "min-w-36")}
            </li>
          );
        })}
      </ul>
    </div>
  );

  // 모바일 아코디언: 이동 링크와 펼침 버튼을 따로 둔다 (터치 영역 44px 이상)
  const mItem = "flex min-h-11 flex-1 items-center rounded-xl pr-3 text-[15px] font-semibold text-ink aria-[current=page]:text-azul";
  const accId = (key: string) => `${panelId}-${key.replace("/", "-")}`;
  const accordionButton = (key: string, name: string) => (
    <button type="button" onClick={() => toggleExpanded(key)} aria-expanded={expanded.includes(key)} aria-controls={accId(key)}
      aria-label={t("submenu", { name })} className="flex w-12 shrink-0 items-center justify-center rounded-xl text-muted hover:text-azul">
      <Caret className={`h-4 w-4 transition-transform ${expanded.includes(key) ? "rotate-180" : ""}`} />
    </button>
  );

  return (
    <nav aria-label={t("main")}
      className={`wrap flex h-16 items-center gap-4 xl:max-w-[80rem] transition-[height] duration-200 motion-reduce:transition-none ${scrolled ? "xl:h-14" : "xl:h-[72px]"}`}>
      <Link href="/" aria-label={t("home")} className="mr-2 shrink-0 rounded-tile">
        <Logo />
      </Link>

      {/* 데스크톱 */}
      {/* 과목을 헤더에 바로 두고, 마우스를 올리면 세부 과정이 아래로 펼쳐진다 */}
      <ul ref={barRef} className="hidden items-center gap-0.5 xl:flex" data-testid="desktop-nav"
        onKeyDown={onMenuKey} onMouseLeave={() => hoverTo([])}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) closeFlyout(); }}>
        {courses.map((c) => {
          const has = c.tracks.length > 0;
          return (
            <li key={c.slug} className="relative" onMouseEnter={() => hoverTo(has ? [c.slug] : [])}>
              {/* 포커스만으로는 열지 않는다 (Tab 이 드롭다운 안으로 빠지지 않게). 아래 방향키로 연다 */}
              <Link href={`/courses/${c.slug}`} data-path={c.slug} onFocus={() => { if (flyout[0] !== c.slug) closeFlyout(); }}
                aria-current={isActive(`/courses/${c.slug}`) ? "page" : undefined}
                aria-expanded={has ? isOpen([c.slug]) : undefined} aria-controls={has ? subId([c.slug]) : undefined}
                className={`${navLink} inline-flex items-center gap-1 aria-expanded:bg-azul-soft aria-expanded:text-azul`}>
                {c.menu}
                {has && <Caret className={`h-3.5 w-3.5 transition-transform ${isOpen([c.slug]) ? "rotate-180" : ""}`} />}
              </Link>
              {has && flyoutList([c.slug], c.tracks, "min-w-48")}
            </li>
          );
        })}
        {mainLinks.map((l) => (
          <li key={l.href} onMouseEnter={() => hoverTo([])}>
            <Link href={l.href} onFocus={closeFlyout} className={`${navLink} inline-flex`} aria-current={isActive(l.href) ? "page" : undefined}>{l.label}</Link>
          </li>
        ))}
      </ul>

      {/* 언어, 관리자, 로그아웃은 위쪽 띠(UtilityBar)에 두어 이 줄의 길이가 로그인 상태에 따라 크게 바뀌지 않게 한다 */}
      <div className="ml-auto hidden shrink-0 items-center gap-1 xl:flex">
        {loggedIn ? (
          <Link href="/myclass" className={navLink} aria-current={isActive("/myclass") ? "page" : undefined}>{t("myclass")}</Link>
        ) : (
          <Link href="/login" className={navLink} aria-current={isActive("/login") ? "page" : undefined}>{t("login")}</Link>
        )}
        <Link href="/apply" className="btn-primary ml-2">{t("apply")}</Link>
      </div>

      {/* 모바일 */}
      <div className="ml-auto flex items-center gap-2 xl:hidden">
        <Link href="/apply" className="btn-primary btn-sm">{t("apply")}</Link>
        <button ref={menuBtnRef} type="button" className="btn-quiet btn-sm" aria-expanded={menuOpen} aria-controls={panelId}
          onClick={() => setMenuOpen((v) => !v)} data-testid="menu-toggle">
          <MenuIcon open={menuOpen} />
          <span>{menuOpen ? t("close") : t("menu")}</span>
        </button>
      </div>

      <div id={panelId} hidden={!menuOpen} onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setMenuOpen(false); }}
        className="absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto bg-paper shadow-[0_8px_24px_rgba(22,33,62,0.10)] xl:hidden">
        <div className="wrap py-5">
          {/* 과목 > 세부 과정 > 학년 아코디언 */}
          <ul className="space-y-2" data-testid="courses-accordion">
            {courses.map((c) => (
              <li key={c.slug} className="rounded-2xl bg-white">
                <div className="flex items-stretch">
                  <Link href={`/courses/${c.slug}`} aria-current={isActive(`/courses/${c.slug}`) ? "page" : undefined}
                    className="flex min-h-12 flex-1 items-center gap-2 px-3.5 py-3 text-[15px] font-bold aria-[current=page]:text-azul">
                    {dot(c.lang)}
                    {c.name}
                  </Link>
                  {c.tracks.length > 0 && accordionButton(c.slug, c.name)}
                </div>
                {c.tracks.length > 0 && (
                  <ul id={accId(c.slug)} hidden={!expanded.includes(c.slug)} className="border-t border-line p-1.5">
                    {c.tracks.map((tr) => {
                      const key = `${c.slug}/${tr.slug}`;
                      return (
                        <li key={tr.slug}>
                          <div className="flex items-stretch">
                            <Link href={`/courses/${key}`} aria-current={pathname === `/courses/${key}` ? "page" : undefined} className={`${mItem} pl-7`}>{tr.name}</Link>
                            {tr.children.length > 0 && accordionButton(key, tr.name)}
                          </div>
                          {tr.children.length > 0 && (
                            <ul id={accId(key)} hidden={!expanded.includes(key)}>
                              {tr.children.map((g) => (
                                <li key={g.slug}>
                                  <Link href={`/courses/${key}/${g.slug}`} aria-current={pathname === `/courses/${key}/${g.slug}` ? "page" : undefined}
                                    className={`${mItem} pl-12`}>{g.name}</Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {mainLinks.map((l) => (
              <li key={l.href}><Link href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className="block py-3 text-[16px] font-semibold aria-[current=page]:text-azul">{l.label}</Link></li>
            ))}
            {isAdmin && <li><Link href="/admin" aria-current={isActive("/admin") ? "page" : undefined} className="block py-3 text-[16px] font-semibold aria-[current=page]:text-azul">{t("admin")}</Link></li>}
            {loggedIn ? (
              <li><Link href="/myclass" aria-current={isActive("/myclass") ? "page" : undefined} className="block py-3 text-[16px] font-semibold aria-[current=page]:text-azul">{t("myclass")}</Link></li>
            ) : (
              <li><Link href="/login" aria-current={isActive("/login") ? "page" : undefined} className="block py-3 text-[16px] font-semibold aria-[current=page]:text-azul">{t("login")}</Link></li>
            )}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href={switchHref} locale={otherLocale} hrefLang={otherLocale} className="btn-quiet btn-sm">{t("language")}</Link>
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

// 데스크톱 맨 위 얇은 띠: 언어, 관리자, 로그아웃. 고정 헤더 밖에 있어 스크롤하면 사라진다
export function UtilityBar({ loggedIn, isAdmin }: { loggedIn: boolean; isAdmin: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const otherLocale = locale === "ko" ? "en" : "ko";
  const switchHref = { pathname, query: Object.fromEntries(searchParams.entries()) };
  const link = "rounded-tile px-2 py-1 text-[13px] font-semibold text-muted hover:text-azul aria-[current=page]:text-azul";
  return (
    <div className="hidden border-b border-line/60 bg-white xl:block">
      <div className="wrap flex h-9 items-center justify-end gap-1 xl:max-w-[80rem]">
        <Link href={switchHref} locale={otherLocale} hrefLang={otherLocale} className={link}>{t("language")}</Link>
        {isAdmin && (
          <Link href="/admin" className={link} aria-current={pathname === "/admin" || pathname.startsWith("/admin/") ? "page" : undefined}>{t("admin")}</Link>
        )}
        {loggedIn && (
          <form action="/auth/signout" method="post">
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className={link}>{t("logout")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
