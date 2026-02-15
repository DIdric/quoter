import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Projecten</h1>
        <Link
          href="/quotes/new"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Nieuwe Offerte
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {quotes && quotes.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {quote.client_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(quote.created_at).toLocaleDateString("nl-NL")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      quote.status === "final"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {quote.status === "final" ? "Definitief" : "Concept"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Nog geen projecten</p>
            <p className="text-sm mt-1">
              Maak je eerste offerte aan om te beginnen
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
