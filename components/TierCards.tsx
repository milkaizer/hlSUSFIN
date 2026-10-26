import { getTranslations } from "next-intl/server";
import type { TierInfo } from "@/content/tiers";
import { Check, Cross } from "@/components/ui/Icons";

function Item({ on, children, onLabel, offLabel }: { on: boolean; children: React.ReactNode; onLabel: string; offLabel: string }) {
  return (
    <li className={`flex items-start gap-2.5 ${on ? "text-ink" : "text-muted"}`}>
      <span className={`mt-0.5 shrink-0 ${on ? "text-ok" : "text-muted/70"}`}>{on ? <Check /> : <Cross />}</span>
      <span className="sr-only">{on ? onLabel : offLabel}: </span>
      <span>{children}</span>
    </li>
  );
}

export async function TierCards({ tiers, locale, withPayButtons = false }: { tiers: TierInfo[]; locale: string; withPayButtons?: boolean }) {
  const t = await getTranslations("pricing");
  const price = (p: number | null) => {
    if (p == null) return null;
    const n = new Intl.NumberFormat(locale === "en" ? "en-US" : "ko-KR").format(p);
    return locale === "en" ? `${t("won")} ${n} / ${t("perMonth")}` : `${t("perMonth")} ${n}${t("won")}`;
  };
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {tiers.map((tier) => {
        const p = price(tier.priceKrw);
        return (
          <li key={tier.slug} data-tier={tier.slug}
            className={`flex flex-col rounded-tile border bg-white p-6 ${tier.slug === "standard" ? "border-azul" : "border-line"}`}>
            <h3 className="text-[20px] font-extrabold">{locale === "en" ? tier.name.en : tier.name.ko}</h3>
            <p className="mt-2 text-[22px] font-extrabold tabular-nums" data-testid="price">
              {p ?? <span className="text-muted">{t("preparing")}</span>}
            </p>
            <ul className="mt-5 space-y-2.5 text-[15px]">
              <Item on onLabel={t("included")} offLabel={t("notIncluded")}>{t("lessons")}</Item>
              <Item on onLabel={t("included")} offLabel={t("notIncluded")}>{t("quizzes")}</Item>
              <Item on onLabel={t("included")} offLabel={t("notIncluded")}>{t("qa")}</Item>
              <Item on={tier.live} onLabel={t("included")} offLabel={t("notIncluded")}>{tier.live ? t("live") : t("noLive")}</Item>
              <Item on={tier.monthlyCalls > 0} onLabel={t("included")} offLabel={t("notIncluded")}>
                {tier.monthlyCalls > 0 ? t("calls", { count: tier.monthlyCalls }) : t("noCalls")}
              </Item>
            </ul>
            {withPayButtons && (
              <button type="button" className="btn mt-6 w-full" disabled data-testid="pay-button">{t("payDisabled")}</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
