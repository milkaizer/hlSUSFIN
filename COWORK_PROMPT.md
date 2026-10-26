# Cowork 시작 프롬프트

아래 "붙여 넣을 프롬프트"를 Cowork 에 그대로 붙여 넣으면 됩니다.

## 사람이 먼저 할 일
1. 이 zip 을 `C:\VitaLanguage` 에 풀거나, GitHub `milkaizer/hlSUSFIN` 의 `claude/proceed-as-is-rus4o2` 브랜치를 그 폴더에 받습니다. (브랜치가 더 최신일 수 있습니다. P8 보고서 `logs/build/p8-check.md` 가 브랜치에만 있을 수 있음)
2. Cowork 에서 그 폴더를 작업 폴더로 엽니다.
3. Supabase 를 이미 만들었다면 `.env.local` 을 폴더에 넣어 둡니다. 아직이면 Step B 에서 Cowork 가 멈추고 안내합니다.

---

## 붙여 넣을 프롬프트

```
작업 폴더의 NEXT_STEPS.md, PROGRESS.md, HANDOFF.md, logs/build/decisions.md, docs/SETUP.md 를 먼저 끝까지 읽고 이어서 진행해줘.
이 프로젝트(Vita Language, Next.js 15 + Supabase)는 P1~P7 구현과 P9 보안 수정이 끝났고, 남은 일은 NEXT_STEPS.md 2장의 Step A~E 야.

진행 방식
- NEXT_STEPS.md 2장 순서대로 진행. Step 하나가 끝날 때마다 해당 테스트를 직접 실행하고 결과표를 보여준 뒤 다음으로 넘어가.
- 구현과 검증은 서브에이전트를 나눠서 써. 검증 서브에이전트는 구현 결과를 믿지 말고 파일과 실행 결과로 확인.
- 계정 생성, 비밀키, 결제처럼 내가 해야 하는 일이 나오면 멈추고 정확히 무엇을 해야 하는지 단계별로 알려줘. 키를 채팅에 붙여 넣으라고 하지 마.
- 그 밖에 판단이 필요한 건 질문하지 말고 HANDOFF.md 와 NEXT_STEPS.md 기준으로 결정하고 logs/build/decisions.md 에 한 줄로 이유를 남겨.
- Step 끝마다 git commit (메시지 형식 "[VITA-Pn] 요약"), PROGRESS.md 갱신, push.
- UI 문구와 문서 모두 em-dash(U+2014) 금지. 번역체, 과도한 이모지 금지. 메타 정보는 쉼표로 연결.
- Step 끝마다 npx tsc --noEmit, npm run lint, npm run build 오류 0.

Step A (지금 가장 먼저): prep-house 벤치마킹
1. 내장 브라우저로 https://www.prep-house.co.kr/home 을 열어 데스크톱(1440px 정도)과 모바일(390px) 화면을 위에서 아래까지 스크린샷으로 남겨. 강의 목록이나 상세, 요금·패키지 화면도 1~2개 열어 봐.
2. 분석 결과를 logs/build/benchmark-prephouse.md 로 정리: 섹션 순서, 헤더 메뉴 구조, 히어로, 강의 카드에 들어가는 정보(구성, 기간, 가격)와 배치, 패키지 상품 보여주는 방식, 후기·합격 영역, 공지, 푸터, 정보 밀도, 타이포 위계, 색 쓰는 방식, 버튼·카드 모양, 모바일에서 바뀌는 점.
3. 그 형식과 디자인 언어를 우리 공개 페이지(홈, 과목, 요금제, 헤더·푸터)와 디자인 토큰에 반영해. 레이아웃, 카드 구조, 밀도, 컴포넌트 형태는 따라가되 로고, 사진, 일러스트, 문구, 브랜드 색을 그대로 가져오지는 마. 우리 콘텐츠(content/categories.ts, content/tiers.ts, messages/*.json)와 과목 4개, 단계 3개, 스페이서 플래그, 결제 비활성, 사업자 정보 없는 푸터는 유지.
4. 반영 전후 스크린샷을 390px, 1280px 로 logs/build/screens/ 에 저장하고 나란히 비교해서 보여줘.
5. bash scripts/test-p1.sh 전부 PASS. 섹션 순서가 바뀌면 tests/e2e/p1-*.spec.ts 의 기대값도 같이 고치고 decisions.md 에 기록.

Step B~E 는 NEXT_STEPS.md 그대로. Step B 는 docs/SETUP.md 1장의 사람 작업이 끝나야 시작할 수 있으니, 그 전이면 내가 할 일을 단계별로 정리해서 보여주고 멈춰.
```

---

## 참고: Cowork 에서 막힐 수 있는 것
- Windows 에서 `bash scripts/*.sh` 는 Git Bash 나 WSL 이 필요합니다. 없으면 Cowork 가 같은 명령을 PowerShell 로 풀어서 실행하면 됩니다.
- `npm run test:db` 는 로컬 PostgreSQL 16 이 필요합니다. 없으면 건너뛰고, DB 확인은 Step B 의 실제 Supabase E2E 로 대신합니다.
- Playwright 브라우저가 없으면 `npx playwright install chromium` 을 한 번 실행합니다.
