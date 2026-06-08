import { NextResponse } from "next/server";
import { getRequestLocation } from "@/lib/location";
import { enforceUsageLimit, LIMITS } from "@/lib/rateLimit";
import { getClientIp, jsonError } from "@/lib/security";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { country, city } = getRequestLocation(request.headers);
    const body = await request.json().catch(() => ({}));
    const supabase = getSupabaseServiceClient();
    const ip = getClientIp(request.headers);

    const limit = await enforceUsageLimit({
      supabase,
      request,
      eventType: "track",
      actorType: "ip",
      actorId: ip,
      limit: LIMITS.track,
    });
    if (!limit.allowed) return NextResponse.json({ ok: true, limited: true });

    const { error } = await supabase.from("visits").insert({
      country,
      city,
      path: String(body.path || "/").slice(0, 200),
      user_agent: request.headers.get("user-agent") || null,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track endpoint failed", { message: error.message });
    return jsonError("تعذر تسجيل الزيارة.", 500);
  }
}
