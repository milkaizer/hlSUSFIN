import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// service role 클라이언트. 웹훅 전용. 클라이언트 코드에서 import 금지
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) throw new Error("Supabase service role is not configured");
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
