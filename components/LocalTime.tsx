"use client";
import { useEffect, useState } from "react";

type Props = {
  iso: string;
  locale: string;
  mode?: "datetime" | "date" | "time";
  className?: string;
};

function format(iso: string, locale: string, mode: Props["mode"], timeZone?: string) {
  const d = new Date(iso);
  const loc = locale === "en" ? "en-US" : "ko-KR";
  const opts: Intl.DateTimeFormatOptions =
    mode === "date" ? { dateStyle: "medium" } : mode === "time" ? { timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" };
  return new Intl.DateTimeFormat(loc, { ...opts, timeZone }).format(d);
}

// 서버는 서울 시간으로 그리고, 브라우저에서 사용자 시간대로 다시 그린다 (10.7)
export function LocalTime({ iso, locale, mode = "datetime", className }: Props) {
  const [text, setText] = useState(() => format(iso, locale, mode, "Asia/Seoul"));
  useEffect(() => {
    setText(format(iso, locale, mode));
  }, [iso, locale, mode]);
  return (
    <time dateTime={iso} className={className} data-local-time>
      {text}
    </time>
  );
}
