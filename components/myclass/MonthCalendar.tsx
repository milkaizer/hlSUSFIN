"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type CalEvent = { id: string; kind: "call" | "live"; title: string; startsAt: string; href?: string | null };

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 월간 캘린더. 날짜와 시간은 브라우저 시간대 기준 (10.7). 콜은 파란 점, 라이브는 노란 점
export function MonthCalendar({ events, locale }: { events: CalEvent[]; locale: string }) {
  const t = useTranslations("myclass");
  const loc = locale === "en" ? "en-US" : "ko-KR";
  // 서버와 브라우저 시간대가 다를 수 있으므로 마운트 후에 그린다
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  useEffect(() => {
    const now = new Date();
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
      const key = ymd(new Date(e.startsAt));
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  if (!cursor) return <div className="panel h-[22rem] animate-pulse" aria-busy="true" />;

  const first = new Date(cursor.y, cursor.m, 1);
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = first.getDay();
  const today = ymd(new Date());
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: "short" }).format(new Date(2024, 0, 7 + i)));
  const monthLabel = new Intl.DateTimeFormat(loc, { year: "numeric", month: "long" }).format(first);
  const monthEvents = events
    .filter((e) => { const d = new Date(e.startsAt); return d.getFullYear() === cursor.y && d.getMonth() === cursor.m; })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const move = (n: number) => setCursor((c) => {
    if (!c) return c;
    const d = new Date(c.y, c.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const fmt = (iso: string) => new Intl.DateTimeFormat(loc, { month: "short", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  return (
    <div data-testid="calendar">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className="btn-quiet btn-sm" onClick={() => move(-1)}>{t("prev")}</button>
        <h3 className="text-[18px] font-extrabold" aria-live="polite" data-testid="calendar-month">{monthLabel}</h3>
        <button type="button" className="btn-quiet btn-sm" onClick={() => move(1)}>{t("next")}</button>
      </div>
      <div className="panel overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-paper text-center text-xs font-semibold text-muted">
          {weekdays.map((w) => <div key={w} className="py-2">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="min-h-14 border-b border-r border-line/60 bg-paper/50 sm:min-h-20" />;
            const key = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const evs = byDay.get(key) ?? [];
            const isToday = key === today;
            return (
              <div key={i} data-day={key} className={`min-h-14 border-b border-r border-line/60 p-1.5 sm:min-h-20 ${isToday ? "bg-azafran-soft" : ""}`}>
                <span className={`text-xs font-semibold ${isToday ? "text-ink" : "text-muted"}`}>{d}</span>
                {evs.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1" aria-label={evs.map((e) => e.title).join(", ")}>
                    {evs.map((e) => (
                      <span key={e.id} data-dot={e.kind} className={`h-2 w-2 rounded-full ${e.kind === "call" ? "bg-azul" : "bg-azafran"}`} />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-azul" />{t("call")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-azafran" />{t("liveClass")}</span>
        <span>{t("localTime")}</span>
      </p>
      <h3 className="mt-6 text-[17px] font-extrabold">{t("thisMonth")}</h3>
      {monthEvents.length === 0 ? (
        <p className="mt-2 text-muted">{t("noThisMonth")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line" data-testid="calendar-list">
          {monthEvents.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${e.kind === "call" ? "bg-azul" : "bg-azafran"}`} aria-hidden />
              <time dateTime={e.startsAt} className="text-sm tabular-nums text-muted" data-event-time>{fmt(e.startsAt)}</time>
              <span className="font-semibold">{e.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
