import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { env, supabaseConfigured } from "@/lib/env";
import { getViewer, localePath } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./LoginForm";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return { title: t("title") };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("login");
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, localePath(locale, "/myclass"));
  const reason = sp.reason === "other_device" || sp.reason === "failed" ? sp.reason : null;

  const { user } = await getViewer();
  if (user) redirect(next);

  const configured = supabaseConfigured();
  return (
    <div className="wrap py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <h1 className="h-page">{t("title")}</h1>
        <p className="mt-3 leading-relaxed text-muted">{t("lead")}</p>
        {reason && (
          <p role="alert" data-testid="login-reason" className={`mt-6 rounded-tile border p-4 font-semibold ${reason === "other_device" ? "border-azafran bg-azafran-soft text-ink" : "border-warn/40 bg-warn/10 text-warn"}`}>
            {t(reason)}
          </p>
        )}
        {!configured && <p role="alert" className="mt-6 rounded-tile border border-line bg-white p-4 text-muted" data-testid="login-not-configured">{t("notConfigured")}</p>}
        <div className="panel mt-6 p-6">
          <LoginForm next={next} configured={configured} supabaseUrl={env.supabaseUrl} supabaseAnonKey={env.supabaseAnonKey} />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-muted">{t("policy")}</p>
      </div>
    </div>
  );
}
