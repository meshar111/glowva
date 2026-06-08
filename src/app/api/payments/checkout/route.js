import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { jsonError } from "@/lib/security";
import { getCookieUser } from "@/lib/supabaseAuth";

export const runtime = "nodejs";

function getAuthClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request) {
  try {
    let user = await getCookieUser();
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!user && token) {
      const { data } = await getAuthClient().auth.getUser(token);
      user = data?.user || null;
    }
    if (!user?.email) return jsonError("سجلي الدخول أولاً.", 401);

    const { plan = "monthly" } = await request.json().catch(() => ({}));
    const priceId =
      plan === "yearly" ? requireEnv("STRIPE_YEARLY_PRICE_ID") : requireEnv("STRIPE_MONTHLY_PRICE_ID");

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://glowva-peach.vercel.app";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          email: user.email,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout failed", { message: error.message });
    return jsonError("تعذر إنشاء رابط الدفع.", 500);
  }
}
