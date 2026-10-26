"use client";
import { createBrowserClient } from "@supabase/ssr";

// 브라우저 클라이언트. 로그인 요청에만 쓴다 (PKCE code verifier 를 쿠키에 저장)
export function createBrowserSupabase(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
