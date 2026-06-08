import { NextResponse } from "next/server";
import { getSupabaseCookieClient } from "@/lib/supabaseAuth";
import { jsonError } from "@/lib/security";

export async function POST(request) {
  const { email, next = "/" } = await request.json().catch(() => ({}));
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return jsonError("اكتبي بريد إلكتروني صحيح.", 400);
  }

  const url = new URL(request.url);
  const supabase = await getSupabaseCookieClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return jsonError("تعذر إرسال رابط الدخول.", 500);
  return NextResponse.json({ ok: true });
}
