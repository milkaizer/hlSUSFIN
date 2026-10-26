"use client";
import { useEffect, useState } from "react";

const SPOTS = [
  { top: "8%", left: "6%" }, { top: "70%", left: "58%" }, { top: "40%", left: "30%" },
  { top: "15%", left: "62%" }, { top: "78%", left: "8%" }, { top: "50%", left: "70%" },
];

// 영상 위 반투명 이메일. 20초마다 위치 이동 (9.2). iframe 전체화면에서는 보이지 않는다 (알려진 문제)
export function Watermark({ text }: { text: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % SPOTS.length), 20000);
    return () => clearInterval(id);
  }, []);
  return (
    <span aria-hidden data-testid="watermark"
      className="pointer-events-none absolute z-10 select-none whitespace-nowrap text-[13px] font-semibold text-white/45 [text-shadow:0_0_2px_rgba(0,0,0,.6)]"
      style={SPOTS[i]}>
      {text}
    </span>
  );
}
