#!/usr/bin/env bash
# 13.1 P1 수용 테스트 일괄 실행. Supabase 미연결 빌드 2개(.next-p1 플래그 off, .next-flags 플래그 on)
set -euo pipefail
cd "$(dirname "$0")/.."

# .env.local 이 있어도 미연결 상태로 빌드되도록 빈 값으로 고정 (Next 는 이미 있는 값을 덮어쓰지 않는다)
export NEXT_PUBLIC_SUPABASE_URL="" NEXT_PUBLIC_SUPABASE_ANON_KEY="" SUPABASE_SERVICE_ROLE_KEY=""

echo "== tsc";  npx tsc --noEmit
echo "== lint"; npx eslint .
echo "== build .next-p1 (flags off)"
NEXT_DIST_DIR=.next-p1 NEXT_PUBLIC_SHOW_RESULTS=false NEXT_PUBLIC_SHOW_REVIEWS=false npx next build > logs/build/p1-build.log 2>&1 || { tail -40 logs/build/p1-build.log; exit 1; }
echo "== build .next-flags (flags on)"
NEXT_DIST_DIR=.next-flags NEXT_PUBLIC_SHOW_RESULTS=true NEXT_PUBLIC_SHOW_REVIEWS=true npx next build > logs/build/p1-build-flags.log 2>&1 || { tail -40 logs/build/p1-build-flags.log; exit 1; }
echo "== playwright"
E2E_SUITE=public npx playwright test "$@"
