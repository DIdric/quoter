import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export type PlanId = "pro" | "business";

export interface PlanConfig {
  name: string;
  priceId: string; // Stripe Price ID — set in env vars
  price: number; // display price in EUR/month
  features: string[];
}

/**
 * Plan configuration. Price IDs come from environment variables
 * so they can differ between Stripe test/live mode.
 */
export const PLANS: Record<PlanId, PlanConfig> = {
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    price: 19,
    features: [
      "50 AI-offertes per maand",
      "PDF export",
      "Eigen materialen",
      "E-mail support",
    ],
  },
  business: {
    name: "Business",
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? "",
    price: 49,
    features: [
      "Onbeperkt AI-offertes",
      "Alles van Pro",
      "Prioriteit support",
      "Meerdere gebruikers (binnenkort)",
    ],
  },
};
