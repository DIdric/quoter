import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText, Clock, Euro, TrendingUp, Plus, Zap, CheckCircle } from "lucide-react";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/usage-limits";

interface QuoteJsonData {
  form?: {
    project_title?: string;
  };
  result?: {
    quote_title?: string;
    total_incl_btw?: number;
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all quotes for stats (we need json_data for revenue)
  const { data: allQuotes } = await supabase
    .from("quotes")
    .select("id, client_name, status, created_at, json_data")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const { count: totalMaterials } = await supabase
    .from("materials")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  // Get subscription tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user!.id)
    .single();

  const tier: SubscriptionTier = profile?.subscription_tier ?? "free";
  const tierLimits = TIER_LIMITS[tier];

  // Count AI quotes generated this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: quotesThisMonth } = await supabase
    .from("token_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("endpoint", "generate-quote")
    .gte("created_at", monthStart);

  const quotes = allQuotes ?? [];
  const recentQuotes = quotes.slice(0, 5);
  const totalQuotes = quotes.length;
  const draftQuotes = quotes.filter((q) => q.status === "draft").length;
  const finalQuotes = quotes.filter((q) => q.status === "final" || q.status === "completed").length;

  // Calculate total revenue from final/completed quotes
  const totalRevenue = quotes
    .filter((q) => q.status === "final" || q.status === "completed")
    .reduce((sum, q) => {
      const data = q.json_data as QuoteJsonData | null;
      return sum + (data?.result?.total_incl_btw ?? 0);
    }, 0);

  const stats = [
    {
      label: "Totaal Offertes",
      value: totalQuotes.toString(),
      icon: FileText,
      color: "bg-[#3B82F6]",
    },
    {
      label: "Concept",
      value: draftQuotes.toString(),
      icon: Clock,
      color: "bg-[#EF4444]",
    },
    {
      label: "Definitief",
      value: finalQuotes.toString(),
      icon: Euro,
      color: "bg-[#0EC541]",
    },
    {
      label: "Totale Omzet",
      value: `€${totalRevenue.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: TrendingUp,
      color: "bg-[#8B5CF6]",
    },
  ];

  return (
    <div>
      {params.checkout === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-6">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-medium text-green-800">Welkom bij Pro! 🎉</p>
            <p className="text-sm text-green-700">Je account is geüpgraded. Geniet van onbeperkte offertes.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          Dashboard
        </h1>
        <Link
          href="/quotes/new"
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition text-sm md:text-base"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nieuwe Offerte</span>
          <span className="sm:hidden">Nieuw</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-3 md:gap-4">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-lg flex items-center justify-center shrink-0`}
              >
                <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold text-slate-800 truncate">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-slate-500 truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Quota */}
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-slate-800">AI Gebruik</h2>
            <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">
              {tierLimits.label}
            </span>
          </div>
          {tierLimits.quotesPerMonth > 0 && (
            <span className="text-sm text-slate-500">
              {quotesThisMonth ?? 0} / {tierLimits.quotesPerMonth} offertes deze maand
            </span>
          )}
          {tierLimits.quotesPerMonth === -1 && (
            <span className="text-sm text-slate-500">Onbeperkt</span>
          )}
        </div>
        {tierLimits.quotesPerMonth > 0 && (
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                (quotesThisMonth ?? 0) >= tierLimits.quotesPerMonth
                  ? "bg-red-500"
                  : (quotesThisMonth ?? 0) >= tierLimits.quotesPerMonth * 0.8
                  ? "bg-yellow-500"
                  : "bg-brand-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  ((quotesThisMonth ?? 0) / tierLimits.quotesPerMonth) * 100
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Recent Quotes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-4 py-4 md:p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Recente Offertes
          </h2>
          {totalQuotes > 5 && (
            <Link
              href="/projects"
              className="text-sm text-brand-500 hover:text-brand-600 font-medium transition"
            >
              Alle bekijken
            </Link>
          )}
        </div>
        <div className="divide-y divide-slate-200">
          {recentQuotes.length > 0 ? (
            recentQuotes.map((quote) => {
              const data = quote.json_data as QuoteJsonData | null;
              const title =
                data?.result?.quote_title || data?.form?.project_title;
              const total = data?.result?.total_incl_btw;

              const hasResult = !!(quote.json_data as QuoteJsonData | null)?.result;
              const targetHref = quote.status === "final" || quote.status === "completed"
                ? `/quotes/new?project=${quote.id}&step=2`
                : hasResult
                ? `/quotes/new?project=${quote.id}&step=1`
                : `/quotes/new?project=${quote.id}&step=0`;

              return (
                <Link
                  key={quote.id}
                  href={targetHref}
                  className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between hover:bg-slate-50 transition block"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">
                      {quote.client_name}
                    </p>
                    {title && (
                      <p className="text-sm text-slate-500 truncate">{title}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(quote.created_at).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    {total != null && (
                      <span className="text-sm font-medium text-slate-700 hidden sm:block">
                        €
                        {total.toLocaleString("nl-NL", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        quote.status === "completed"
                          ? "bg-blue-100 text-blue-700"
                          : quote.status === "final"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {quote.status === "completed" ? "Afgerond" : quote.status === "final" ? "Definitief" : "Concept"}
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="px-4 py-8 md:px-6 md:py-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Nog geen offertes aangemaakt</p>
              <p className="text-sm mt-1">
                Klik op &quot;Nieuwe Offerte&quot; om te beginnen
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
