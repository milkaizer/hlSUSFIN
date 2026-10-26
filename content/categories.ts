export const CATEGORY_SLUGS = ["es-conversation", "es-school", "ko-conversation", "topik"] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

type L = { ko: string; en: string };
type LL = { ko: string[]; en: string[] };

export type CategoryInfo = {
  slug: CategorySlug;
  lang: "es" | "ko";
  name: L;
  short: L;
  audience: L;
  curriculum: LL;
  includes: LL;
};

const includesCommon: LL = {
  ko: ["과목별 영상 강의", "연습 문제와 모의고사", "15분 1:1 회화 콜 (스탠다드 이상)", "라이브 수업 (스탠다드 이상)", "과목별 Q&A 게시판"],
  en: ["Video lessons for this course", "Practice sets and mock exams", "15-minute 1:1 speaking calls (Standard and up)", "Live classes (Standard and up)", "Course Q&A board"],
};

export const categories: CategoryInfo[] = [
  {
    slug: "es-conversation",
    lang: "es",
    name: { ko: "스페인어 회화", en: "Spanish conversation" },
    short: { ko: "여행, 업무, 유학에서 바로 쓰는 말하기", en: "Speaking you can use for travel, work and study" },
    audience: { ko: "실제 대화를 목표로 스페인어를 배우는 대학생과 성인", en: "University students and adults who want to hold real conversations in Spanish" },
    curriculum: {
      ko: ["발음과 기본 문장 구조", "자기소개와 일상 대화", "과거·미래 시제로 경험과 계획 말하기", "의견 말하기와 짧은 토론"],
      en: ["Pronunciation and basic sentence structure", "Introductions and everyday conversation", "Talking about past experiences and plans", "Giving opinions and short discussions"],
    },
    includes: includesCommon,
  },
  {
    slug: "es-school",
    lang: "es",
    name: { ko: "스페인어 내신", en: "Spanish for school exams" },
    short: { ko: "외고·국제고 스페인어 내신 대비", en: "School exam prep for Korean high schools" },
    audience: { ko: "스페인어 내신을 준비하는 외고·국제고 학생", en: "Korean high school students preparing for Spanish school exams" },
    curriculum: {
      ko: ["교과서 단원별 문법 정리", "서술형 작문 연습", "듣기·독해 유형 훈련", "학교별 시험 유형 모의고사"],
      en: ["Grammar by textbook unit", "Written answer practice", "Listening and reading drills", "Mock exams in school exam format"],
    },
    includes: includesCommon,
  },
  {
    slug: "ko-conversation",
    lang: "ko",
    name: { ko: "한국어 회화", en: "Korean conversation" },
    short: { ko: "외국인 학습자를 위한 한국어 말하기", en: "Speaking Korean in everyday situations" },
    audience: { ko: "한국어를 배우는 외국인 학습자", en: "Learners of Korean, including Sejong Institute students" },
    curriculum: {
      ko: ["한글과 발음", "자주 쓰는 일상 표현", "존댓말과 반말 구분", "식당, 쇼핑, 학교 등 상황별 대화"],
      en: ["Hangul and pronunciation", "Common everyday expressions", "Formal and informal speech", "Situations: restaurants, shopping, school"],
    },
    includes: includesCommon,
  },
  {
    slug: "topik",
    lang: "ko",
    name: { ko: "TOPIK", en: "TOPIK" },
    short: { ko: "TOPIK I·II 영역별 대비와 실전 모의고사", en: "TOPIK I and II prep by section, with timed mock tests" },
    audience: { ko: "TOPIK I 또는 II 응시 예정자", en: "Learners preparing for TOPIK I or II" },
    curriculum: {
      ko: ["등급별 필수 어휘·문법", "듣기 유형별 풀이", "읽기 유형별 풀이", "쓰기 51~54번 답안 작성", "시간 제한 실전 모의고사"],
      en: ["Core vocabulary and grammar by level", "Listening by question type", "Reading by question type", "Writing questions 51 to 54", "Timed mock tests"],
    },
    includes: includesCommon,
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function isCategorySlug(s: unknown): s is CategorySlug {
  return typeof s === "string" && (CATEGORY_SLUGS as readonly string[]).includes(s);
}

export function categoryName(slug: string, locale: string) {
  const c = getCategory(slug);
  if (!c) return slug;
  return locale === "en" ? c.name.en : c.name.ko;
}
