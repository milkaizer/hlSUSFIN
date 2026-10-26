import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { TierInfo } from "@/content/tiers";
import { Check, Cross } from "@/components/ui/Icons";
import { SpecList } from "@/components/SpecList";

// 단계 카드. 라벨은 한 벌(구성, 라이브, 회화 콜, 수강료)로 홈과 요금제 페이지에 똑같이 쓴다.
// 요금제 페이지(withPayButtons)에서는 상위 단계부터, 프리미엄을 맨 위 넓은 카드로 보여 준다
export async function TierCards({ tiers, locale, withPayButtons = false }: { tiers: TierInfo[]; locale: string; withPayButtons?: boolean }) {
  const t = await getTranslations("pricing");
  const price = (p: number | null) => {
    if (p == null) return null;
    const n = new Intl.NumberFormat(locale === "en" ? "en-US" : "ko-KR").format(p);
    return locale === "en" ? `${t("won")} ${n} / ${t("perMonth")}` : `${t("perMonth")} ${n}${t("won")}`;
  };

  const mark = (on: boolean, text: string, dark: boolean) => (
    <span className="inline-flex items-baseline gap-[0.375em]">
      <span className={`shrink-0 translate-y-[0.125em] ${on ? (dark ? "text-white" : "text-ok") : (dark ? "text-white/50" : "text-muted/70")}`}>
        {on ? <Check className="h-[1em] w-[1em]" /> : <Cross className="h-[1em] w-[1em]" />}
      </span>
      <span className="sr-only">{on ? t("included") : t("notIncluded")}: </span>
      <span className={on ? "" : (dark ? "text-white/70" : "text-muted")}>{text}</span>
    </span>
  );

  const ordered = withPayButtons ? [...tiers].reverse() : tiers;

  return (
    <ul className={`grid gap-5 md:gap-6 ${withPayButtons ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
      {ordered.map((tier) => {
        const p = price(tier.priceKrw);
        const flagship = withPayButtons && tier.slug === "premium";
        const dark = flagship;
        const rows = [
          { key: "core", label: t("specCore"), value: mark(true, t("coreShort"), dark) },
          { key: "live", label: t("specLive"), value: mark(tier.live, tier.live ? t("live") : t("noLive"), dark) },
          {
            key: "calls", label: t("specCalls"),
            value: mark(tier.monthlyCalls > 0, tier.monthlyCalls > 0 ? t("calls", { count: tier.monthlyCalls }) : t("noCalls"), dark),
          },
          {
            key: "price", label: t("specPrice"),
            value: <span data-testid="price" className={`tabular-nums ${p ? "" : dark ? "text-white/80" : "text-muted"}`}>{p ?? t("preparing")}</span>,
          },
        ];
        const name = locale === "en" ? tier.name.en : tier.name.ko;
        return (
          <li key={tier.slug} data-tier={tier.slug}
            className={`show-card ${flagship ? "bg-ink text-white md:col-span-2" : ""}`}>
            {/* 추천 단계 표시: 하단 버튼 배경에 가리지 않도록 맨 위 겹 테두리로 그린다 */}
            {tier.slug === "standard" && <span aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] ring-2 ring-inset ring-azul" />}
            <div className={`flex-1 p-[2em] ${flagship ? "md:grid md:grid-cols-[1fr_1.15fr] md:gap-[2.5em] md:p-[2.5em]" : ""}`}>
              <div>
                <h3 className={`font-extrabold leading-[1.25] tracking-[-0.02em] ${flagship ? "text-[1.875em] text-white" : "text-[1.5em]"}`}>{name}</h3>
                {flagship && <p className="mt-[0.75em] max-w-[26em] text-[0.9375em] leading-relaxed text-white/80">{t("payGuide")}</p>}
              </div>
              <div className={flagship ? "mt-[1.5em] md:mt-[0.375em]" : "mt-[1.25em]"}>
                <SpecList rows={rows} locale={locale} tone={dark ? "dark" : "light"} />
              </div>
            </div>
            {withPayButtons && (
              <div className={`card-actions ${dark ? "border-white/15" : ""}`}>
                <button type="button" disabled data-testid="pay-button"
                  className={`card-action ${dark ? "disabled:bg-white/5 disabled:text-white/70 disabled:hover:bg-white/5" : ""}`}>
                  {t("payDisabled")}
                </button>
                <Link href={{ pathname: "/apply" }} className={`card-action ${dark ? "border-white/15 text-white hover:bg-white/10" : ""}`}>{t("applyShort")}</Link>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
