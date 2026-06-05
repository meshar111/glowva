import { NextResponse } from "next/server";
import { getRequestLocation } from "@/lib/location";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { country, city } = getRequestLocation(request.headers);
    const body = await request.json().catch(() => ({}));

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("visits").insert({
      country,
      city,
      path: body.path || "/",
      user_agent: request.headers.get("user-agent") || null,
    });

    if (error) {
      console.error("Supabase visit insert failed", error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track endpoint failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
