import { getMessages, getTranslations } from "next-intl/server";

type Feature = { q: string; a: string };

// 카드가 아닌 질문·답 격자 (7.4). lg 3열 x 2행, md 2열, 모바일 1열
export async function Features() {
  const t = await getTranslations("home");
  const messages = (await getMessages()) as unknown as { features: Feature[] };
  return (
    <section data-section="features" className="wrap sec">
      <div className="sec-head">
        <h2 className="h-section">{t("featuresTitle")}</h2>
      </div>
      <dl className="mt-10 grid gap-x-10 gap-y-8 md:mt-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-y-12">
        {messages.features.map((f) => (
          <div key={f.q} className="border-t border-line pt-5">
            <dt className="text-[18px] font-bold leading-snug">{f.q}</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-muted">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
