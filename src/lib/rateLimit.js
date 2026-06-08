import { getClientIp } from "./security";

const LIMITS = {
  anonymous: 5,
  free: 20,
  subscribed: 500,
};

function windowStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function enforceAnalyzeLimit({ supabase, request, userId, isSubscribed }) {
  const ip = getClientIp(request.headers);
  const actorType = userId ? "user" : "ip";
  const actorId = userId || ip;
  const limit = isSubscribed ? LIMITS.subscribed : userId ? LIMITS.free : LIMITS.anonymous;
  const since = windowStart();

  const { count, error: countError } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "analyze")
    .eq("actor_type", actorType)
    .eq("actor_id", actorId)
    .gte("created_at", since);

  if (countError) throw countError;
  if ((count || 0) >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      message: userId
        ? "وصلتي للحد اليومي. فعّلي الاشتراك أو جربي غداً."
        : "وصلتي للحد المجاني. سجلي الدخول للمتابعة.",
    };
  }

  const { error: insertError } = await supabase.from("usage_events").insert({
    event_type: "analyze",
    actor_type: actorType,
    actor_id: actorId,
    ip,
  });
  if (insertError) throw insertError;

  return {
    allowed: true,
    limit,
    remaining: Math.max(limit - (count || 0) - 1, 0),
  };
}
