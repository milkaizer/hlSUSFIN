# PROGRESS

마지막 갱신: 2026-10-26

| Phase | 상태 | 수용 테스트 | 비고 |
|---|---|---|---|
| P1 공개 페이지 | 구현 완료, 디자인 재작업 대기 | 13.1 15/15 PASS (`bash scripts/test-p1.sh`) | 사용자 요청: prep-house 디자인 벤치마킹. 사이트 접근이 막혀 자료 대기 |
| P2 DB | 완료 | 부록 C 60/60 PASS (`npm run test:db`) | 로컬 PostgreSQL 16 + auth 스텁 |
| P3 로그인·세션 | 대기 | | |
| P4 강의·수강신청 | 대기 | | |
| P5 문제 | 대기 | | |
| P6 콜·라이브 | 대기 | | |
| P7 게시판 | 대기 | | |
| P8 전체 점검 | 대기 | | |
| P9 보안 리뷰 | 대기 | | |
| P10 배포 | 대기 | | |

## 테스트 실행
- P1: `bash scripts/test-p1.sh` (tsc, eslint, 미연결 빌드 2개, Playwright)
- P2: `PGHOST=/tmp PGPORT=54329 PGUSER=postgres npm run test:db` (postgres 권한 필요)

## 알려진 문제
- HANDOFF 15장 참고. 추가된 것 없음.

## 사람이 할 일 (대기 중)
- prep-house 벤치마킹 자료: 컨테이너 네트워크에서 `www.prep-house.co.kr` 허용, 또는 스크린샷 업로드
