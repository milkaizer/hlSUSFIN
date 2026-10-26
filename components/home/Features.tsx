import { getMessages, getTranslations } from "next-intl/server";

type Feature = { q: string; a: string };

// 카드가 아닌 2열 정의 목록 (7.4)
export async function Features() {
  const t = await getTranslations("home");
  const messages = (await getMessages()) as unknown as { features: Feature[] };
  return (
    <section data-section="features" className="wrap py-12 sm:py-16">
      <h2 className="h-section">{t("featuresTitle")}</h2>
      <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
        {messages.features.map((f) => (
          <div key={f.q} className="border-t border-line pt-5">
            <dt className="text-[18px] font-bold leading-snug">{f.q}</dt>
            <dd className="mt-2 leading-relaxed text-muted">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
