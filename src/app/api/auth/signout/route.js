import { NextResponse } from "next/server";
import { getSupabaseCookieClient } from "@/lib/supabaseAuth";

export async function POST() {
  const supabase = await getSupabaseCookieClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
