import type { ReactNode } from "react";

export type SpecRow = { key: string; label: string; value: ReactNode; sub?: ReactNode };

// 고정 폭 라벨 격자. 모든 크기를 em 으로 잡아 카드 루트 글자 크기(14px/16px)에 따라 통째로 비례 축소된다.
// 라벨 폭 58px = 0.8em 라벨 글자 기준 4.53125em. 영어 라벨은 길어서 한 단계 넓힌다
export function SpecList({ rows, locale, tone = "light", className = "" }: { rows: SpecRow[]; locale: string; tone?: "light" | "dark"; className?: string }) {
  const dark = tone === "dark";
  const labelW = locale === "en" ? "w-[5.3125em]" : "w-[4.53125em]";
  return (
    <dl className={`space-y-[0.5em] ${className}`}>
      {rows.map((r) => (
        <div key={r.key} className="flex items-baseline gap-[0.625em]">
          <dt className={`${labelW} shrink-0 text-[0.8em] font-bold leading-[1.6] ${dark ? "text-white/70" : "text-muted"}`}>{r.label}</dt>
          <dd className="min-w-0 flex-1 leading-[1.5]">
            <span className={`font-semibold ${dark ? "text-white" : "text-ink/90"}`}>{r.value}</span>
            {r.sub && " "}
            {r.sub && <span className={`inline-block text-[0.875em] font-medium ${dark ? "text-white/75" : "text-muted"}`}>{r.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
