import { NextResponse } from "next/server";
import { getStripe, PLANS, type PlanId } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Map a Stripe Price ID back to our subscription tier.
 */
function tierFromPriceId(priceId: string): "free" | "pro" | "business" {
  for (const [planId, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return planId as PlanId;
  }
  return "free";
}

/**
 * Update the user's subscription tier in the profiles table.
 */
async function updateTier(
  customerId: string,
  tier: "free" | "pro" | "business"
) {
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_tier: tier })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("[stripe-webhook] Failed to update tier:", error.message);
  } else {
    console.log(`[stripe-webhook] Updated customer ${customerId} to tier: ${tier}`);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    // New subscription or plan change
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      if (subscription.status === "active" || subscription.status === "trialing") {
        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId) {
          await updateTier(customerId, tierFromPriceId(priceId));
        }
      } else if (
        subscription.status === "canceled" ||
        subscription.status === "unpaid" ||
        subscription.status === "past_due"
      ) {
        await updateTier(customerId, "free");
      }
      break;
    }

    // Subscription cancelled or expired
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await updateTier(customerId, "free");
      break;
    }

    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true });
}
