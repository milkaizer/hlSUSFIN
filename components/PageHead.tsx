import type { ReactNode } from "react";

// 공개 페이지 머리.
// start(기본): 흰 띠 + 왼쪽 정렬. 아래 본문이 왼쪽 정렬로 이어지는 실무형 페이지(신청, 공지, 라이브 등)
// center: 띠 없이 가운데 정렬. 아래가 쇼케이스 카드인 페이지(요금제)
export function PageHead({ title, lead, children, align = "start" }: { title: string; lead?: string; children?: ReactNode; align?: "start" | "center" }) {
  if (align === "center") {
    return (
      <div className="wrap pb-10 pt-14 text-center md:pb-14 md:pt-20">
        <h1 className="h-page">{title}</h1>
        {lead && <p className="lead mx-auto mt-3">{lead}</p>}
        {children}
      </div>
    );
  }
  return (
    <div className="border-b border-line bg-white">
      <div className="wrap py-10 sm:py-14">
        <h1 className="h-page">{title}</h1>
        {lead && <p className="lead mt-3">{lead}</p>}
        {children}
      </div>
    </div>
  );
}
