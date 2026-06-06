import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

async function getCount(supabase, table, options = {}) {
  const query = supabase.from(table).select("*", { count: "exact", head: true });
  if (options.eq) {
    for (const [column, value] of Object.entries(options.eq)) {
      query.eq(column, value);
    }
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function getRows(supabase, table, select = "*", limit = 20) {
  const { data, error } = await supabase.from(table).select(select).limit(limit);
  if (error) throw error;
  return data || [];
}

async function getUserCount(supabase) {
  let page = 1;
  let total = 0;

  while (page < 100) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const users = data?.users || [];
    total += users.length;
    if (users.length < 1000) break;
    page += 1;
  }

  return total;
}

export async function GET(request) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json({ error: "ADMIN_EMAIL is not configured" }, { status: 500 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user || userData.user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const warnings = [];
    const safe = async (label, fallback, fn) => {
      try {
        return await fn();
      } catch (error) {
        warnings.push({ label, message: error.message });
        return fallback;
      }
    };

    const [visits, searches, users, subscribers, topProducts, countries, cities, dailySearches, funnel] =
      await Promise.all([
        safe("visits", 0, () => getCount(supabase, "visits")),
        safe("searches", 0, () => getCount(supabase, "searches")),
        safe("users", 0, () => getUserCount(supabase)),
        safe("subscribers", 0, () => getCount(supabase, "profiles", { eq: { is_subscribed: true } })),
        safe("v_top_products", [], () => getRows(supabase, "v_top_products", "*", 12)),
        safe("v_by_country", [], () => getRows(supabase, "v_by_country", "*", 12)),
        safe("v_by_city", [], () => getRows(supabase, "v_by_city", "*", 12)),
        safe("v_daily_searches", [], () => getRows(supabase, "v_daily_searches", "*", 30)),
        safe("v_funnel", [], () => getRows(supabase, "v_funnel", "*", 12)),
      ]);

    return NextResponse.json({
      totals: { visits, searches, users, subscribers },
      topProducts,
      countries,
      cities,
      dailySearches,
      funnel,
      warnings,
    });
  } catch (error) {
    console.error("Admin stats failed", error);
    return NextResponse.json({ error: "Admin dashboard failed" }, { status: 500 });
  }
}
