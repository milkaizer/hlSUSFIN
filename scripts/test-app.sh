#!/usr/bin/env bash
# 13.3~13.7 E2E. 실제 Supabase 프로젝트에 연결해서 돈다 (HANDOFF 12.1 마지막 수단)
# 필요: .env.local 또는 환경변수에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# 테스트 사용자와 데이터는 vita-e2e-<실행ID>-*, "E2E <실행ID>" 이름으로 만들고 끝나면 지운다
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi
for k in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if [ -z "${!k:-}" ]; then echo "환경변수 $k 가 없습니다. .env.local 을 확인하세요."; exit 1; fi
done
# 로컬 E2E 용 값. 이미 있으면 그대로 쓴다
export CAL_WEBHOOK_SECRET="${CAL_WEBHOOK_SECRET:-vita-e2e-local-secret}"
export NEXT_PUBLIC_CAL_LINK_ES_CONVERSATION="${NEXT_PUBLIC_CAL_LINK_ES_CONVERSATION:-https://cal.com/vita-e2e/es-conversation-15}"
export E2E_RUN_ID="${E2E_RUN_ID:-r$(date +%s)}"

echo "== tsc";  npx tsc --noEmit
echo "== lint"; npx eslint .
echo "== build .next (연결, 플래그 off)"
NEXT_DIST_DIR=.next NEXT_PUBLIC_SHOW_RESULTS=false NEXT_PUBLIC_SHOW_REVIEWS=false npx next build > logs/build/app-build.log 2>&1 || { tail -40 logs/build/app-build.log; exit 1; }
echo "== build .next-app-flags (연결, 플래그 on)"
NEXT_DIST_DIR=.next-app-flags NEXT_PUBLIC_SHOW_RESULTS=true NEXT_PUBLIC_SHOW_REVIEWS=true npx next build > logs/build/app-build-flags.log 2>&1 || { tail -40 logs/build/app-build-flags.log; exit 1; }
echo "== playwright (실행 ID $E2E_RUN_ID)"
APP_FLAGS_URL=http://localhost:3001 E2E_SUITE=app npx playwright test "$@"
