import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";

// 관리자 화면 공용 조각 (한국어 전용)
export function H({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-[26px] font-extrabold">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`mb-3 mt-10 text-[19px] font-extrabold first:mt-0 ${className}`}>{children}</h2>;
}

const MESSAGES: Record<string, string> = {
  saved: "저장했습니다.",
  created: "추가했습니다.",
  deleted: "삭제했습니다.",
  granted: "권한을 부여했습니다.",
  revoked: "권한을 회수했습니다.",
  approved: "승인하고 권한을 부여했습니다.",
  rejected: "반려했습니다.",
  graded: "채점을 저장했습니다.",
};
const ERRORS: Record<string, string> = {
  input: "입력값을 확인해 주세요.",
  date: "날짜 형식이나 순서를 확인해 주세요. 만료일은 시작일보다 뒤여야 합니다.",
  meet: "Meet 링크는 https://meet.google.com/ 으로 시작해야 합니다.",
  url: "자료 링크는 https:// 로 시작해야 합니다.",
  video: "영상 주소나 ID를 알아볼 수 없습니다. YouTube 또는 Vimeo 주소를 넣어 주세요.",
  answer: "정답 형식을 확인해 주세요. 객관식은 1부터 시작하는 번호, 복수는 1,3 처럼 씁니다.",
  self: "자기 계정의 관리자 권한이나 승인 상태는 바꿀 수 없습니다.",
  db: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

export function Notice({ msg, err }: { msg?: string | string[]; err?: string | string[] }) {
  const m = typeof msg === "string" ? MESSAGES[msg] : undefined;
  const e = typeof err === "string" ? ERRORS[err] ?? ERRORS.db : undefined;
  if (!m && !e) return null;
  return (
    <p role={e ? "alert" : "status"} data-testid={e ? "admin-error" : "admin-ok"}
      className={`mb-6 rounded-tile border p-3.5 text-[15px] font-semibold ${e ? "border-warn/40 bg-warn/10 text-warn" : "border-ok/40 bg-ok/10 text-ok"}`}>
      {e ?? m}
    </p>
  );
}

export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="table-wrap rounded-tile border border-line bg-white">
      <table className="w-full min-w-[40rem] border-collapse text-left text-[14px]">
        <thead className="border-b border-line bg-paper text-[13px] text-muted">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function TD({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-6 text-center text-muted">{children}</p>;
}

const TONES = {
  gray: "bg-line/70 text-ink",
  blue: "bg-azul-soft text-azul-deep",
  yellow: "bg-azafran-soft text-ink",
  green: "bg-ok/10 text-ok",
  red: "bg-warn/10 text-warn",
} as const;

export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`badge ${TONES[tone]}`}>{children}</span>;
}

export function Card({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "warn" }) {
  return (
    <Link href={href} className={`block rounded-tile border bg-white p-5 hover:border-azul ${tone === "warn" && value > 0 ? "border-warn/50" : "border-line"}`} data-card={label}>
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className={`mt-1 block text-[30px] font-extrabold tabular-nums ${tone === "warn" && value > 0 ? "text-warn" : ""}`}>{value}</span>
    </Link>
  );
}

export const STATUS_LABEL = { pending: "승인 대기", approved: "승인됨", blocked: "차단" } as const;
export const STATUS_TONE = { pending: "yellow", approved: "green", blocked: "red" } as const;
