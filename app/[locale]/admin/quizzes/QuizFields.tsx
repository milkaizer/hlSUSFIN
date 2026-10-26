import { categories } from "@/content/categories";
import { tiers } from "@/content/tiers";
import { Field } from "@/components/admin/ui";

export type QuizValues = {
  category: string; title: string; kind: "practice" | "mock"; min_tier: string;
  time_limit_min: number | null; max_attempts: number | null; published: boolean;
};

// 문제 세트 설정 필드 (새 세트, 세트 수정 공용)
export function QuizFields({ v }: { v?: QuizValues }) {
  return (
    <>
      <Field label="과목">
        <select name="category" defaultValue={v?.category} className="field">{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name.ko}</option>)}</select>
      </Field>
      <Field label="제목"><input name="title" defaultValue={v?.title} maxLength={200} className="field" required /></Field>
      <Field label="유형">
        <select name="kind" defaultValue={v?.kind ?? "practice"} className="field">
          <option value="practice">연습</option>
          <option value="mock">모의고사</option>
        </select>
      </Field>
      <Field label="최소 단계">
        <select name="min_tier" defaultValue={v?.min_tier ?? "basic"} className="field">{tiers.map((t) => <option key={t.slug} value={t.slug}>{t.name.ko}</option>)}</select>
      </Field>
      <Field label="제한 시간(분)" hint="비우면 제한 없음">
        <input type="number" name="time_limit_min" min={1} max={600} defaultValue={v?.time_limit_min ?? ""} className="field" />
      </Field>
      <Field label="응시 횟수" hint="비우면 제한 없음">
        <input type="number" name="max_attempts" min={1} max={100} defaultValue={v?.max_attempts ?? ""} className="field" />
      </Field>
      <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="published" defaultChecked={v?.published} className="h-4 w-4 accent-azul" /> 공개</label>
    </>
  );
}

export type QuestionValues = {
  id?: string; type: "mcq_single" | "mcq_multi" | "short_text" | "essay"; prompt: string; choices: string[];
  answer: unknown; explanation: string | null; points: number; sort: number;
};

// 저장된 정답(0부터)을 관리자 입력 형식(1부터, 한 줄에 하나)으로
export function answerInput(q: QuestionValues) {
  if (q.type === "mcq_single" && typeof q.answer === "number") return String(q.answer + 1);
  if (q.type === "mcq_multi" && Array.isArray(q.answer)) return q.answer.map((n) => Number(n) + 1).join(",");
  if (q.type === "short_text" && Array.isArray(q.answer)) return q.answer.join("\n");
  return "";
}

export function QuestionFields({ q, formId }: { q?: QuestionValues; formId?: string }) {
  const p = formId ? { form: formId } : {};
  return (
    <div className="grid gap-3 sm:grid-cols-[10rem_1fr_6rem_6rem]">
      <Field label="유형">
        <select {...p} name="type" defaultValue={q?.type ?? "mcq_single"} className="field">
          <option value="mcq_single">객관식 (하나)</option>
          <option value="mcq_multi">객관식 (복수)</option>
          <option value="short_text">단답</option>
          <option value="essay">서술</option>
        </select>
      </Field>
      <Field label="문제"><textarea {...p} name="prompt" defaultValue={q?.prompt} rows={2} maxLength={5000} className="field" required /></Field>
      <Field label="배점"><input {...p} type="number" name="points" min={0} max={1000} defaultValue={q?.points ?? 1} className="field" required /></Field>
      <Field label="순서"><input {...p} type="number" name="sort" defaultValue={q?.sort ?? 0} className="field" /></Field>
      <Field label="보기" hint="객관식만. 한 줄에 하나" className="sm:col-span-2">
        <textarea {...p} name="choices" defaultValue={q?.choices.join("\n")} rows={3} className="field" />
      </Field>
      <Field label="정답" hint="객관식: 1부터 번호, 복수는 1,3. 단답: 허용 답 한 줄에 하나. 서술: 비움" className="sm:col-span-2">
        <textarea {...p} name="answer" defaultValue={q ? answerInput(q) : ""} rows={3} className="field" />
      </Field>
      <Field label="해설 (선택)" className="sm:col-span-4"><textarea {...p} name="explanation" defaultValue={q?.explanation ?? ""} rows={2} maxLength={5000} className="field" /></Field>
    </div>
  );
}
