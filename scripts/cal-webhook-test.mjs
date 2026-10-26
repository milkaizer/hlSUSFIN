#!/usr/bin/env node
// Cal.com 웹훅을 서명 맞춘 가짜 요청으로 보내 본다 (HANDOFF 14.2-4)
// 사용법:
//   CAL_WEBHOOK_SECRET=... node scripts/cal-webhook-test.mjs <created|cancelled|rescheduled|bad> <user_id> [category] [url]
//   url 기본값 http://localhost:3000/api/cal/webhook
import { createHmac, randomUUID } from "node:crypto";

const [kind = "created", userId, category = "es-conversation", url = "http://localhost:3000/api/cal/webhook"] = process.argv.slice(2);
const secret = process.env.CAL_WEBHOOK_SECRET;
if (!secret || !userId) {
  console.error("CAL_WEBHOOK_SECRET 환경변수와 user_id 인자가 필요합니다.");
  process.exit(1);
}
const uid = process.env.CAL_UID ?? `manual-${randomUUID()}`;
const start = new Date(Date.now() + 60 * 60 * 1000);
const trigger = { created: "BOOKING_CREATED", cancelled: "BOOKING_CANCELLED", rescheduled: "BOOKING_RESCHEDULED", bad: "BOOKING_CREATED" }[kind];
if (!trigger) {
  console.error("종류는 created, cancelled, rescheduled, bad 중 하나입니다.");
  process.exit(1);
}
const body = JSON.stringify({
  triggerEvent: trigger,
  payload: {
    uid,
    ...(kind === "rescheduled" && process.env.PREV_UID ? { rescheduleUid: process.env.PREV_UID } : {}),
    startTime: start.toISOString(),
    endTime: new Date(start.getTime() + 15 * 60 * 1000).toISOString(),
    attendees: [{ email: process.env.ATTENDEE_EMAIL ?? "student@example.com" }],
    metadata: {
      user_id: userId, category, videoCallUrl: "https://meet.google.com/abc-defg-hij",
      // My Class 예약 링크와 같은 서명 (lib/cal.ts)
      sig: createHmac("sha256", secret).update(`vita-booking:${userId}:${category}`).digest("hex").slice(0, 32),
    },
  },
});
const signature = kind === "bad" ? "0".repeat(64) : createHmac("sha256", secret).update(body).digest("hex");
const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-cal-signature-256": signature }, body });
console.log(res.status, await res.text());
console.log(`uid=${uid}`);
