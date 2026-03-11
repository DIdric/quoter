"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FileText, Plus, Search, Loader2 } from "lucide-react";

interface QuoteRow {
  id: string;
  client_name: string;
  status: string;
  quote_number: string | null;
  created_at: string;
  json_data: {
    form?: {
      project_title?: string;
      project_location?: string;
    };
    result?: {
      quote_title?: string;
      total_incl_btw?: number;
    };
  } | null;
}

export default function ProjectsPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("quotes")
      .select("id, client_name, status, quote_number, created_at, json_data")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setQuotes((data as QuoteRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return quotes;
    const q = search.toLowerCase();
    return quotes.filter((quote) => {
      const title =
        quote.json_data?.result?.quote_title ||
        quote.json_data?.form?.project_title ||
        "";
      const location = quote.json_data?.form?.project_location || "";
      const quoteNum = quote.quote_number || "";
      return (
        quote.client_name.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        location.toLowerCase().includes(q) ||
        quoteNum.toLowerCase().includes(q)
      );
    });
  }, [quotes, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          Projecten
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

      {/* Search */}
      {quotes.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op klantnaam, project of locatie..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition text-slate-800 text-sm"
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {filtered.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {filtered.map((quote) => {
              const title =
                quote.json_data?.result?.quote_title ||
                quote.json_data?.form?.project_title;
              const total = quote.json_data?.result?.total_incl_btw;

              return (
                <Link
                  key={quote.id}
                  href={`/projects/${quote.id}`}
                  className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between hover:bg-slate-50 transition block"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">
                      {quote.client_name}
                    </p>
                    {title && (
                      <p className="text-sm text-slate-500 truncate">
                        {title}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {quote.quote_number && (
                        <span className="text-slate-500 font-medium mr-2">{quote.quote_number}</span>
                      )}
                      {new Date(quote.created_at).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    {total != null && (
                      <span className="text-sm font-medium text-slate-700 hidden sm:block">
                        €{total.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                      </span>
                    )}
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
                </Link>
              );
            })}
          </div>
        ) : quotes.length > 0 ? (
          <div className="px-4 py-8 md:px-6 md:py-12 text-center text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Geen resultaten voor &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="px-4 py-8 md:px-6 md:py-12 text-center text-slate-500">
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
