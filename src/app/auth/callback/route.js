import { NextResponse } from "next/server";
import { getSupabaseCookieClient } from "@/lib/supabaseAuth";
import { safeInternalPath } from "@/lib/security";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next") || "/");

  if (code) {
    const supabase = await getSupabaseCookieClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
