import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { env } from "@/lib/env";

// 로그인 상태에 따라 헤더가 달라지므로 모든 페이지를 요청 시 렌더
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: t("title"), template: `%s | ${t("title")}` },
    description: t("description"),
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6F7FB" };

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);
  // 클라이언트 컴포넌트가 쓰는 네임스페이스만 보낸다 (NavBar, LoginForm, MonthCalendar, QuizRunner)
  const all = await getMessages();
  const messages = { nav: all.nav, login: all.login, myclass: all.myclass, quiz: all.quiz };
  const t = await getTranslations("nav");
  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-tile focus:bg-white focus:px-3 focus:py-2">
          {t("skip")}
        </a>
        <NextIntlClientProvider messages={messages}>
          <SiteHeader locale={locale} />
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
