import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { getCookieUser } from "@/lib/supabaseAuth";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function getPublicClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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
  try {
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
  } catch {
    return getCount(supabase, "profiles");
  }
}

function getFunnelCount(rows, labels) {
  const needles = labels.map((label) => label.toLowerCase());
  const row = rows.find((item) => {
    const label = String(item.label || item.step || item.name || "").toLowerCase();
    return needles.some((needle) => label.includes(needle));
  });

  return row?.count || row?.total || row?.value || row?.visits || row?.searches || 0;
}

export async function GET(request) {
  try {
    const adminEmail = requireEnv("ADMIN_EMAIL");

    let user = await getCookieUser();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!user && token) {
      const { data } = await getPublicClient().auth.getUser(token);
      user = data?.user || null;
    }

    if (!user || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const supabase = getSupabaseServiceClient();
    const warnings = [];
    const safe = async (label, fallback, fn) => {
      try {
        return await fn();
      } catch (error) {
        warnings.push({ label, message: error.message });
        return fallback;
      }
    };

    const [directVisits, directSearches, users, subscribers, topProducts, countries, cities, dailySearches, funnel] =
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

    const visits = directVisits || getFunnelCount(funnel, ["زيارات", "visits", "visit"]);
    const searches = directSearches || getFunnelCount(funnel, ["بحث", "searches", "search"]);

    return NextResponse.json({
      totals: {
        visits,
        searches,
        users,
        subscribers,
      },
      topProducts,
      countries,
      cities,
      dailySearches,
      funnel,
      warnings,
    });
  } catch (error) {
    console.error("Admin stats failed", error);
    return NextResponse.json({ error: "تعذر تحميل لوحة الأدمن" }, { status: 500 });
  }
}
