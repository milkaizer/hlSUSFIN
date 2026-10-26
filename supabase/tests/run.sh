#!/usr/bin/env bash
# 로컬 Postgres로 마이그레이션과 RLS 수용 테스트 실행
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=vita_test
PSQL="psql -X -q -v ON_ERROR_STOP=1"
$PSQL -d postgres -c "drop database if exists $DB" >/dev/null
for r in anon authenticated service_role; do $PSQL -d postgres -c "drop role if exists $r" >/dev/null 2>&1 || true; done
$PSQL -d postgres -c "create database $DB" >/dev/null
$PSQL -d $DB -f supabase/tests/auth_stub.sql >/dev/null
$PSQL -d $DB -f supabase/migrations/0001_init.sql >/dev/null
$PSQL -d $DB -f supabase/seed.sql >/dev/null
$PSQL -d $DB -f supabase/tests/rls_test.sql
