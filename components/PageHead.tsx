import type { ReactNode } from "react";

export function PageHead({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
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
