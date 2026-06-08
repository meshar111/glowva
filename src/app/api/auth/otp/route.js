import { NextResponse } from "next/server";
import { enforceOtpLimit } from "@/lib/rateLimit";
import { jsonError, safeInternalPath } from "@/lib/security";
import { getSupabaseCookieClient } from "@/lib/supabaseAuth";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request) {
  const { email, next = "/" } = await request.json().catch(() => ({}));
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return jsonError("اكتبي بريد إلكتروني صحيح.", 400);
  }

  const limit = await enforceOtpLimit({
    supabase: getSupabaseServiceClient(),
    request,
    email: normalizedEmail,
  });
  if (!limit.allowed) {
    return jsonError("طلبات تسجيل الدخول كثيرة. جرّبي لاحقاً.", 429);
  }

  const url = new URL(request.url);
  const redirectPath = safeInternalPath(next);
  const supabase = await getSupabaseCookieClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    },
  });

  if (error) return jsonError("تعذر إرسال رابط الدخول.", 500);
  return NextResponse.json({ ok: true });
}
