"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitAttempt } from "@/app/[locale]/myclass/actions";

export type Q = { id: string; type: "mcq_single" | "mcq_multi" | "short_text" | "essay"; prompt: string; choices: string[]; points: number };

// 응시 화면. 정답·해설은 이 컴포넌트에 전달되지 않는다 (quiz_questions 결과만 받음)
export function QuizRunner({ attemptId, questions, deadline, serverNow }: { attemptId: string; questions: Q[]; deadline: string | null; serverNow: number }) {
  const t = useTranslations("quiz");
  const router = useRouter();
  const pathname = usePathname();
  const [resp, setResp] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [auto, setAuto] = useState(false);
  // 서버 시각과의 차이 보정 (10.1)
  const offset = useRef(0);
  const [left, setLeft] = useState<number | null>(deadline ? new Date(deadline).getTime() - serverNow : null);
  const respRef = useRef(resp);
  const busyRef = useRef(false);

  useEffect(() => { respRef.current = resp; }, [resp]);
  useEffect(() => { offset.current = serverNow - Date.now(); }, [serverNow]);

  const submit = useCallback(async (isAuto: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    if (isAuto) setAuto(true);
    const res = await submitAttempt(attemptId, respRef.current).catch(() => ({ ok: false as const }));
    if (res.ok) {
      router.replace(isAuto ? `${pathname}?auto=1` : pathname);
      router.refresh();
    } else {
      busyRef.current = false;
      setBusy(false);
      setFailed(true);
    }
  }, [attemptId, pathname, router]);

  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    const tick = () => {
      const ms = end - (Date.now() + offset.current);
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(id);
        submit(true);
      }
    };
    const id = setInterval(tick, 500);
    tick();
    return () => clearInterval(id);
  }, [deadline, submit]);

  const set = (id: string, v: unknown) => setResp((r) => ({ ...r, [id]: v }));
  const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  return (
    <div>
      {left !== null && (
        <div className="sticky top-16 z-20 lg:top-14 -mx-5 mb-6 flex items-baseline gap-2 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur sm:mx-0 sm:rounded-tile sm:border sm:px-4" role="timer" aria-live="off">
          <span className="text-sm text-muted">{t("timeLeft")}</span>
          <span className={`text-[20px] font-extrabold tabular-nums ${left < 60000 ? "text-warn" : ""}`} data-testid="time-left">{mmss(left)}</span>
        </div>
      )}
      {auto && <p role="status" className="mb-6 rounded-tile border border-azafran bg-azafran-soft p-4 font-semibold">{t("autoSubmitted")}</p>}
      <ol className="space-y-5">
        {questions.map((q, i) => (
          <li key={q.id} className="panel p-5" data-qtype={q.type}>
            <p className="whitespace-pre-line text-[17px] font-semibold">
              <span className="mr-2 text-muted">{i + 1}.</span>{q.prompt}
              <span className="ml-2 text-sm font-normal text-muted">{t("points", { n: q.points })}</span>
            </p>
            {q.type === "mcq_single" && (
              <fieldset className="mt-4 space-y-2" disabled={busy}>
                <legend className="sr-only">{t("pick")}</legend>
                {q.choices.map((c, ci) => (
                  <label key={ci} className="flex cursor-pointer items-start gap-3 rounded-tile border border-line px-3 py-2.5 has-[:checked]:border-azul has-[:checked]:bg-azul-soft">
                    <input type="radio" name={q.id} className="mt-1 accent-azul" checked={resp[q.id] === ci} onChange={() => set(q.id, ci)} />
                    <span>{c}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {q.type === "mcq_multi" && (
              <fieldset className="mt-4 space-y-2" disabled={busy}>
                <legend className="mb-2 text-sm text-muted">{t("pickMany")}</legend>
                {q.choices.map((c, ci) => {
                  const cur = (resp[q.id] as number[] | undefined) ?? [];
                  const on = cur.includes(ci);
                  return (
                    <label key={ci} className="flex cursor-pointer items-start gap-3 rounded-tile border border-line px-3 py-2.5 has-[:checked]:border-azul has-[:checked]:bg-azul-soft">
                      <input type="checkbox" className="mt-1 accent-azul" checked={on} onChange={() => set(q.id, on ? cur.filter((x) => x !== ci) : [...cur, ci])} />
                      <span>{c}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}
            {q.type === "short_text" && (
              <input className="field mt-4" placeholder={t("answerPlaceholder")} aria-label={`${i + 1}`} disabled={busy}
                value={(resp[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} maxLength={500} />
            )}
            {q.type === "essay" && (
              <textarea className="field mt-4" rows={6} placeholder={t("essayPlaceholder")} aria-label={`${i + 1}`} disabled={busy}
                value={(resp[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} maxLength={20000} />
            )}
          </li>
        ))}
      </ol>
      {failed && <p role="alert" className="mt-6 font-semibold text-warn">{t("submitError")}</p>}
      <button type="button" className="btn-primary mt-8 w-full sm:w-auto" disabled={busy} data-testid="submit-quiz"
        onClick={() => { if (window.confirm(t("confirm"))) submit(false); }}>
        {busy ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}
