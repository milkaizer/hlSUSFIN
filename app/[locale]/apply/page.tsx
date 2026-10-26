import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getViewer, localePath } from "@/lib/auth";
import { categories, categoryName, isCategorySlug } from "@/content/categories";
import { tierName } from "@/content/tiers";
import { getTiers } from "@/lib/data/public";
import { PageHead } from "@/components/PageHead";
import { LocalTime } from "@/components/LocalTime";
import { submitApplication } from "./actions";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
type RequestRow = { id: string; category: string; tier: string; status: "pending" | "approved" | "rejected"; created_at: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "apply" });
  return { title: t("title") };
}

const STATUS_CLASS = {
  pending: "bg-azafran-soft text-ink",
  approved: "bg-ok/10 text-ok",
  rejected: "bg-warn/10 text-warn",
} as const;

export default async function ApplyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("apply");
  const { supabase, user, profile } = await getViewer();
  const tiers = await getTiers();
  const loggedIn = Boolean(supabase && user && profile);
  const blocked = profile?.status === "blocked";
  const defaultCategory = isCategorySlug(sp.category) ? sp.category : categories[0].slug;

  let requests: RequestRow[] = [];
  if (loggedIn && supabase && user) {
    const { data } = await supabase.from("enrollment_requests").select("id,category,tier,status,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    requests = (data as RequestRow[] | null) ?? [];
  }

  const applyPath = localePath(locale, "/apply");
  const loginHref = `${localePath(locale, "/login")}?next=${isCategorySlug(sp.category) ? encodeURIComponent(`${applyPath}?category=${sp.category}`) : applyPath}`;

  return (
    <>
      <PageHead title={t("title")} lead={t("lead")} />
      <div className="wrap grid gap-10 py-12 lg:grid-cols-[minmax(0,40rem)_1fr]">
        <div>
          {sp.sent === "1" && <p role="status" className="mb-6 rounded-tile border border-ok/40 bg-ok/10 p-4 font-semibold text-ok">{t("sent")}</p>}
          {(sp.error === "1" || sp.error === "dup") && (
            <p role="alert" className="mb-6 rounded-tile border border-warn/40 bg-warn/10 p-4 font-semibold text-warn">{sp.error === "dup" ? t("duplicate") : t("error")}</p>
          )}
          {!loggedIn && (
            <p className="mb-6 rounded-tile border border-azafran bg-azafran-soft p-4">
              <a href={loginHref} className="link" data-testid="apply-login">{t("loginFirst")}</a>
            </p>
          )}
          {blocked && <p role="alert" className="mb-6 rounded-tile border border-warn/40 bg-warn/10 p-4 text-warn">{t("blocked")}</p>}
          <form action={submitApplication} className="panel p-6">
            <input type="hidden" name="locale" value={locale} />
            <fieldset disabled={!loggedIn || blocked} className="space-y-6 disabled:opacity-70" data-testid="apply-fieldset">
              <div>
                <label htmlFor="category" className="label">{t("category")}</label>
                <select id="category" name="category" defaultValue={defaultCategory} className="field">
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{locale === "en" ? c.name.en : c.name.ko}</option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="label">{t("tier")}</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {tiers.map((tier, i) => (
                    <label key={tier.slug} className="flex cursor-pointer items-center gap-2.5 rounded-tile border border-line bg-white px-3 py-3 has-[:checked]:border-azul has-[:checked]:bg-azul-soft">
                      <input type="radio" name="tier" value={tier.slug} defaultChecked={i === 0} className="accent-azul" required />
                      <span className="font-semibold">{locale === "en" ? tier.name.en : tier.name.ko}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="message" className="label">{t("message")}</label>
                <textarea id="message" name="message" rows={5} maxLength={1000} className="field" placeholder={t("messagePlaceholder")} />
              </div>
              <button type="submit" className="btn-primary w-full sm:w-auto">{t("submit")}</button>
            </fieldset>
          </form>
        </div>
        {loggedIn && (
          <section>
            <h2 className="text-[20px] font-extrabold">{t("myRequests")}</h2>
            {requests.length === 0 ? (
              <p className="mt-3 text-muted">{t("noRequests")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line border-y border-line" data-testid="my-requests">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span>
                      <span className="font-semibold">{categoryName(r.category, locale)}</span>
                      <span className="text-muted">, {tierName(r.tier, locale)}, </span>
                      <LocalTime iso={r.created_at} locale={locale} mode="date" className="text-muted" />
                    </span>
                    <span className={`badge ${STATUS_CLASS[r.status]}`} data-status={r.status}>{t(`status_${r.status}`)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/myclass" className="btn-ghost mt-4 -ml-3">My Class</Link>
          </section>
        )}
      </div>
    </>
  );
}
