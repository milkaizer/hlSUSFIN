import { getTranslations } from "next-intl/server";
import { env } from "@/lib/env";
import type { LegalSection } from "@/content/legal";

// 약관, 개인정보처리방침 본문. 문의처는 NEXT_PUBLIC_CONTACT_EMAIL 이 있으면 이메일, 없으면 게시판 안내
export async function LegalDoc({ sections }: { sections: LegalSection[] }) {
  const t = await getTranslations("legal");
  return (
    <div className="wrap py-12">
      <div className="max-w-3xl space-y-10" data-testid="legal-doc">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-[20px] font-extrabold">{s.h}</h2>
            {s.p?.map((x, i) => <p key={i} className="mt-3 leading-relaxed">{x}</p>)}
            {s.ul && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
                {s.ul.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            )}
            {s.after?.map((x, i) => <p key={i} className="mt-3 leading-relaxed">{x}</p>)}
            {s.contact && (
              env.contactEmail ? (
                <p className="mt-3 leading-relaxed">
                  {t("contactEmail")}:{" "}
                  <a href={`mailto:${env.contactEmail}`} className="break-all font-semibold text-azul underline">{env.contactEmail}</a>
                </p>
              ) : (
                <p className="mt-3 leading-relaxed">{t("contactFallback")}</p>
              )
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
