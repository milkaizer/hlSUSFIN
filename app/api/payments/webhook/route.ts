import { NextResponse } from "next/server";

// 결제 스페이서: 정식 런칭 전까지 501
export async function POST() {
  return NextResponse.json({ error: "payments_not_enabled" }, { status: 501 });
}
