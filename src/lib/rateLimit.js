import { getClientIp } from "./security";

const LIMITS = {
  anonymousAnalyze: 5,
  freeAnalyze: 20,
  subscribedAnalyze: 500,
  otp: 5,
  checkout: 20,
  track: 120,
};

function windowStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function enforceUsageLimit({ supabase, request, eventType, actorType, actorId, limit }) {
  const ip = getClientIp(request.headers);
  const { data, error } = await supabase.rpc("enforce_usage_limit", {
    p_event_type: eventType,
    p_actor_type: actorType,
    p_actor_id: actorId,
    p_ip: ip,
    p_window_start: windowStart(),
    p_limit: limit,
  });

  if (error) {
    if (/enforce_usage_limit|schema cache|function/i.test(error.message || "")) {
      return enforceUsageLimitFallback({ supabase, eventType, actorType, actorId, ip, limit });
    }
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    limit,
    remaining: Math.max(Number(row?.remaining || 0), 0),
  };
}

async function enforceUsageLimitFallback({ supabase, eventType, actorType, actorId, ip, limit }) {
  const since = windowStart();
  const fallbackActorType = ["ip", "user"].includes(actorType) ? actorType : "ip";
  const fallbackActorId = ["ip", "user"].includes(actorType) ? actorId : `${actorType}:${actorId}`;

  const { count, error: countError } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", eventType)
    .eq("actor_type", fallbackActorType)
    .eq("actor_id", fallbackActorId)
    .gte("created_at", since);

  if (countError) throw countError;
  if ((count || 0) >= limit) {
    return { allowed: false, limit, remaining: 0 };
  }

  const { error: insertError } = await supabase.from("usage_events").insert({
    event_type: eventType,
    actor_type: fallbackActorType,
    actor_id: fallbackActorId,
    ip,
  });
  if (insertError) throw insertError;

  return {
    allowed: true,
    limit,
    remaining: Math.max(limit - (count || 0) - 1, 0),
  };
}

export async function enforceAnalyzeLimit({ supabase, request, userId, isSubscribed }) {
  const ip = getClientIp(request.headers);
  const actorType = userId ? "user" : "ip";
  const actorId = userId || ip;
  const limit = isSubscribed ? LIMITS.subscribedAnalyze : userId ? LIMITS.freeAnalyze : LIMITS.anonymousAnalyze;
  const usage = await enforceUsageLimit({
    supabase,
    request,
    eventType: "analyze",
    actorType,
    actorId,
    limit,
  });

  if (!usage.allowed) {
    return {
      ...usage,
      message: userId
        ? "وصلتِ للحد اليومي. فعّلي الاشتراك أو جرّبي غداً."
        : "وصلتِ للحد المجاني. سجّلي الدخول للمتابعة.",
    };
  }

  return usage;
}

export async function enforceOtpLimit({ supabase, request, email }) {
  const ip = getClientIp(request.headers);
  const emailKey = String(email || "").toLowerCase();
  const ipUsage = await enforceUsageLimit({
    supabase,
    request,
    eventType: "otp",
    actorType: "ip",
    actorId: ip,
    limit: LIMITS.otp,
  });
  if (!ipUsage.allowed) return ipUsage;

  return enforceUsageLimit({
    supabase,
    request,
    eventType: "otp",
    actorType: "email",
    actorId: emailKey,
    limit: LIMITS.otp,
  });
}

export { LIMITS };
