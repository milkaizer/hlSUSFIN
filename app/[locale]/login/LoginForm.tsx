"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Props = { next: string; configured: boolean; supabaseUrl: string; supabaseAnonKey: string };

export function LoginForm({ next, configured, supabaseUrl, supabaseAnonKey }: Props) {
  const t = useTranslations("login");
  const supabase = useMemo(() => (configured ? createBrowserSupabase(supabaseUrl, supabaseAnonKey) : null), [configured, supabaseUrl, supabaseAnonKey]);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    if (!supabase) return;
    setError(null);
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (e) setError(t("failed"));
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(t("invalidEmail"));
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: value, options: { emailRedirectTo: callback(), shouldCreateUser: true } });
    setBusy(false);
    if (err) setError(t("failed"));
    else setSentTo(value);
  }

  return (
    <div>
      <button type="button" className="btn-quiet w-full" onClick={google} disabled={!configured} data-testid="login-google">
        <svg aria-hidden viewBox="0 0 18 18" className="h-[18px] w-[18px]">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        {t("google")}
      </button>
      <div className="my-5 flex items-center gap-3 text-sm text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      {sentTo ? (
        <div role="status" className="rounded-tile border border-ok/40 bg-ok/10 p-4" data-testid="login-sent">
          <p className="font-semibold text-ok">{t("emailSent", { email: sentTo })}</p>
          <p className="mt-2 text-sm text-ink/80">{t("sameBrowser")}</p>
        </div>
      ) : (
        <form onSubmit={sendLink} noValidate>
          <label htmlFor="email" className="label">{t("email")}</label>
          <input id="email" type="email" autoComplete="email" inputMode="email" className="field" value={email}
            onChange={(e) => setEmail(e.target.value)} disabled={!configured} required />
          <button type="submit" className="btn-primary mt-4 w-full" disabled={!configured || busy} data-testid="login-email-submit">
            {busy ? t("sending") : t("emailSubmit")}
          </button>
          <p className="mt-3 text-sm text-muted">{t("sameBrowser")}</p>
        </form>
      )}
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-warn">{error}</p>}
    </div>
  );
}
