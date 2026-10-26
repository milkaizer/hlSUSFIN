"use client";
import type { ReactNode } from "react";

// 되돌릴 수 없는 작업 전에 확인창을 띄우는 제출 버튼
export function ConfirmSubmit({ message, className, children }: { message: string; className?: string; children: ReactNode }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
