import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCategorySlug } from "@/content/categories";
import { isUuid, safeHttpsUrl } from "@/lib/validate";

// Cal.com 웹훅. 서명 검증 후 call_bookings 기록 (10.3)
// 예약 링크에 metadata[user_id], metadata[category] 를 붙여 보낸다 (lib/cal.ts)

type CalPayload = {
  triggerEvent?: string;
  payload?: {
    uid?: string; rescheduleUid?: string; fromReschedule?: string;
    startTime?: string; endTime?: string;
    attendees?: { email?: string }[];
    metadata?: { user_id?: string; category?: string; videoCallUrl?: string };
    responses?: { email?: { value?: string } | string };
    videoCallData?: { url?: string };
  };
};

function verify(raw: string, signature: string | null, secret: string) {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(expected, given);
}

function isoOrNull(s: unknown) {
  if (typeof s !== "string") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request: NextRequest) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 512_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  if (!verify(raw, request.headers.get("x-cal-signature-256"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: CalPayload;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const event = body.triggerEvent;
  const p = body.payload ?? {};
  const uid = typeof p.uid === "string" && p.uid.length <= 200 ? p.uid : null;
  if (!uid) return NextResponse.json({ ok: true, ignored: true });

  const db = createAdminClient();
  const now = new Date().toISOString();

  if (event === "BOOKING_CANCELLED") {
    const { error } = await db.from("call_bookings").update({ status: "cancelled", updated_at: now }).eq("cal_uid", uid);
    if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }
  if (event !== "BOOKING_CREATED" && event !== "BOOKING_RESCHEDULED") return NextResponse.json({ ok: true, ignored: true });

  const startsAt = isoOrNull(p.startTime);
  const endsAt = isoOrNull(p.endTime);
  if (!startsAt || !endsAt) return NextResponse.json({ error: "bad_payload" }, { status: 400 });

  const respEmail = typeof p.responses?.email === "string" ? p.responses.email : p.responses?.email?.value;
  const rawEmail = p.attendees?.[0]?.email ?? respEmail ?? null;
  const email = typeof rawEmail === "string" && rawEmail.length <= 320 ? rawEmail.trim().toLowerCase() : null;

  // 사용자 식별: metadata.user_id 우선, 없으면 참석자 이메일
  let userId = isUuid(p.metadata?.user_id) ? p.metadata!.user_id! : null;
  if (userId) {
    const { data } = await db.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!data) userId = null;
  }
  if (!userId && email) {
    const { data } = await db.from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
    userId = data?.id ?? null;
  }
  const category = isCategorySlug(p.metadata?.category) ? p.metadata!.category! : null;

  // 일정 변경: 이전 예약은 취소 처리하고 새 예약을 기록
  const previous = p.rescheduleUid ?? p.fromReschedule;
  if (event === "BOOKING_RESCHEDULED" && typeof previous === "string" && previous !== uid) {
    await db.from("call_bookings").update({ status: "cancelled", updated_at: now }).eq("cal_uid", previous);
  }

  // 크레딧 초과 예약은 over_limit 으로 표시해 관리자가 확인한다
  // 같은 uid 재전송은 기존 상태 유지 (함정 10)
  let status: "accepted" | "over_limit" = "accepted";
  const { data: existing } = await db.from("call_bookings").select("status").eq("cal_uid", uid).maybeSingle();
  if (existing && existing.status !== "cancelled") {
    status = existing.status as "accepted" | "over_limit";
  } else if (userId && category) {
    const { data: credits } = await db.rpc("call_credits_for", { p_user: userId, p_category: category, p_at: startsAt });
    if (typeof credits !== "number" || credits <= 0) status = "over_limit";
  } else {
    // 회원이나 과목을 알 수 없는 예약은 관리자가 확인하도록 초과로 둔다
    status = "over_limit";
  }

  const meet = safeHttpsUrl(p.videoCallData?.url ?? p.metadata?.videoCallUrl ?? null);
  const { error } = await db.from("call_bookings").upsert({
    cal_uid: uid, user_id: userId, category, attendee_email: email,
    starts_at: startsAt, ends_at: endsAt, status, meet_url: meet, updated_at: now,
  }, { onConflict: "cal_uid" });
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
