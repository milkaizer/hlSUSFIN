"use client";
import { Link, usePathname } from "@/i18n/routing";

const ITEMS = [
  { href: "/admin", label: "현황" },
  { href: "/admin/members", label: "회원·권한" },
  { href: "/admin/requests", label: "수강신청" },
  { href: "/admin/content", label: "강의" },
  { href: "/admin/quizzes", label: "문제" },
  { href: "/admin/grading", label: "채점" },
  { href: "/admin/live", label: "라이브" },
  { href: "/admin/calls", label: "회화콜" },
  { href: "/admin/board", label: "게시판" },
  { href: "/admin/showcase", label: "합격자·후기" },
  { href: "/admin/settings", label: "단계 설정" },
];

export function AdminNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="관리자 메뉴" className="lg:sticky lg:top-24 lg:h-fit">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map((i) => (
          <li key={i.href} className="shrink-0">
            <Link href={i.href} aria-current={active(i.href) ? "page" : undefined}
              className="block whitespace-nowrap rounded-tile px-3 py-2 text-[15px] font-semibold text-ink hover:bg-azul-soft aria-[current=page]:bg-azul aria-[current=page]:text-white">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
