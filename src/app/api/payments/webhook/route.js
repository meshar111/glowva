import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs";

async function upsertSubscription({ userId, email, plan, status, customerId, subscriptionId }) {
  const supabase = getSupabaseServiceClient();
  const isActive = ["active", "trialing"].includes(status);
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email,
    plan: isActive ? plan : "free",
    is_subscribed: isActive,
    subscription_status: status || "inactive",
    subscription_provider: "stripe",
    subscription_customer_id: customerId,
    subscription_id: subscriptionId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function POST(request) {
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    return NextResponse.json({ error: `Webhook signature failed: ${error.message}` }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { error: eventError } = await supabase.from("payment_events").insert({
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
      payload: event,
    });

    if (eventError && !/duplicate key/i.test(eventError.message)) throw eventError;
    if (eventError) return NextResponse.json({ received: true, duplicate: true });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await upsertSubscription({
        userId: session.client_reference_id || session.metadata?.user_id,
        email: session.customer_details?.email || session.customer_email,
        plan: session.metadata?.plan || "monthly",
        status: "active",
        customerId: String(session.customer || ""),
        subscriptionId: String(session.subscription || ""),
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        await upsertSubscription({
          userId,
          email: subscription.metadata?.email || null,
          plan: subscription.metadata?.plan || "monthly",
          status: subscription.status,
          customerId: String(subscription.customer || ""),
          subscriptionId: subscription.id,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Payment webhook failed", { message: error.message, event: event.type });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
