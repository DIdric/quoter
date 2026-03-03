import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText, Package, Clock, Euro } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: totalQuotes } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true });

  const { count: draftQuotes } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("status", "draft");

  const { count: totalMaterials } = await supabase
    .from("materials")
    .select("*", { count: "exact", head: true });

  const stats = [
    {
      label: "Totaal Offertes",
      value: totalQuotes ?? 0,
      icon: FileText,
      color: "bg-[#3B82F6]",
    },
    {
      label: "Concept Offertes",
      value: draftQuotes ?? 0,
      icon: Clock,
      color: "bg-[#EF4444]",
    },
    {
      label: "Materialen",
      value: totalMaterials ?? 0,
      icon: Package,
      color: "bg-[#F59E0B]",
    },
    {
      label: "Definitieve Offertes",
      value: (totalQuotes ?? 0) - (draftQuotes ?? 0),
      icon: Euro,
      color: "bg-[#0EC541]",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Quotes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            Recente Offertes
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {quotes && quotes.length > 0 ? (
            quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/projects/${quote.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition block"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {quote.client_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(quote.created_at).toLocaleDateString("nl-NL")}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    quote.status === "final"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {quote.status === "final" ? "Definitief" : "Concept"}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-slate-500">
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
