"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/lib/stripe";

type SubscriptionTier = "free" | "pro" | "business";

export default function UpgradePage() {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.subscription_tier) {
            setCurrentTier(data.subscription_tier as SubscriptionTier);
          }
        });
    });
  }, []);

  async function handleUpgrade(planId: PlanId) {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoadingPlan(null);
    }
  }

  const plans: Array<{ id: PlanId; badge?: string; highlight?: boolean }> = [
    { id: "pro", badge: "Aanbevolen", highlight: true },
    { id: "business" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar instellingen
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Kies je abonnement
        </h1>
        <p className="text-slate-500 text-base">
          Upgrade om meer AI-offertes te genereren en gebruik te maken van alle functies.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {plans.map(({ id, badge, highlight }) => {
          const plan = PLANS[id];
          const isCurrent = currentTier === id;

          return (
            <div
              key={id}
              className={`relative bg-white rounded-2xl border-2 p-6 shadow-sm flex flex-col ${
                highlight
                  ? "border-brand-500"
                  : "border-slate-200"
              }`}
            >
              {/* Badge */}
              {badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-500 text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                    {badge}
                  </span>
                </div>
              )}

              {/* Plan name & price */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-5 h-5 ${highlight ? "text-brand-500" : "text-slate-400"}`} />
                  <h2 className="text-xl font-bold text-slate-800">{plan.name}</h2>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">
                    €{plan.price}
                  </span>
                  <span className="text-slate-500 text-sm">/maand</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="w-full text-center py-2.5 rounded-lg bg-slate-100 text-slate-500 font-medium text-sm border border-slate-200">
                  Huidig plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(id)}
                  disabled={loadingPlan !== null}
                  className={`w-full font-semibold py-2.5 rounded-lg transition text-sm disabled:opacity-60 ${
                    highlight
                      ? "bg-brand-500 hover:bg-brand-600 text-white"
                      : "bg-slate-800 hover:bg-slate-900 text-white"
                  }`}
                >
                  {loadingPlan === id ? "Moment..." : `Upgrade naar ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-slate-400 mt-8">
        Heb je al een betaald abonnement?{" "}
        <Link href="/settings" className="underline hover:text-slate-600 transition">
          Beheer je abonnement in instellingen
        </Link>
        .
      </p>
    </div>
  );
}
