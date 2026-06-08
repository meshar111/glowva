import { NextResponse } from "next/server";
import { getCookieUser } from "@/lib/supabaseAuth";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export async function GET() {
  const user = await getCookieUser();
  if (!user) return NextResponse.json({ user: null, profile: null });

  const supabase = getSupabaseServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_subscribed, plan")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: profile || { is_subscribed: false, plan: "free" },
  });
}
