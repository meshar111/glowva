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

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    limit,
    remaining: Math.max(Number(row?.remaining || 0), 0),
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
