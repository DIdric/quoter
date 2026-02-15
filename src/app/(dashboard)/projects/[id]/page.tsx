import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Package,
  Wrench,
  Euro,
  User,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from "lucide-react";
import { QuoteActions } from "./actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface QuoteLine {
  category: string;
  description: string;
  type: "arbeid" | "materiaal";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface QuoteResult {
  quote_title: string;
  summary: string;
  lines: QuoteLine[];
  subtotal_materials: number;
  subtotal_labor: number;
  margin_amount: number;
  total_excl_btw: number;
  btw_amount: number;
  total_incl_btw: number;
  estimated_days: number;
  notes: string;
}

interface QuoteJsonData {
  form?: {
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    project_title?: string;
    project_description?: string;
    project_location?: string;
    ai_input?: string;
  };
  result?: QuoteResult;
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (!quote) {
    notFound();
  }

  const jsonData = quote.json_data as QuoteJsonData | null;
  const form = jsonData?.form;
  const result = jsonData?.result;
  const hasQuoteLines = result && result.lines && result.lines.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/projects"
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">
            {result?.quote_title || form?.project_title || quote.client_name}
          </h1>
          <p className="text-sm text-slate-500">
            Aangemaakt op{" "}
            {new Date(quote.created_at).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
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
      </div>

      {/* Client & Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Klantgegevens
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-800">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{quote.client_name}</span>
            </div>
            {form?.client_email && (
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                {form.client_email}
              </div>
            )}
            {form?.client_phone && (
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Phone className="w-4 h-4 text-slate-400" />
                {form.client_phone}
              </div>
            )}
          </div>
        </div>

        {form && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Projectdetails
            </h2>
            <div className="space-y-2">
              {form.project_title && (
                <p className="font-medium text-slate-800">
                  {form.project_title}
                </p>
              )}
              {form.project_location && (
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {form.project_location}
                </div>
              )}
              {form.project_description && (
                <p className="text-sm text-slate-600 mt-1">
                  {form.project_description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quote Content */}
      {hasQuoteLines ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">{result.summary}</p>
            {result.estimated_days > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-orange-700">
                <Clock className="w-4 h-4" />
                Geschatte doorlooptijd: {result.estimated_days} werkdag
                {result.estimated_days !== 1 ? "en" : ""}
              </div>
            )}
          </div>

          {/* Lines grouped by category */}
          {[...new Set(result.lines.map((l) => l.category))].map(
            (category) => {
              const categoryLines = result.lines.filter(
                (l) => l.category === category
              );
              return (
                <div key={category}>
                  <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    {categoryLines[0]?.type === "materiaal" ? (
                      <Package className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Wrench className="w-4 h-4 text-orange-500" />
                    )}
                    {category}
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-600 font-medium">
                            Omschrijving
                          </th>
                          <th className="text-center px-3 py-2 text-slate-600 font-medium w-16">
                            Type
                          </th>
                          <th className="text-right px-3 py-2 text-slate-600 font-medium w-20">
                            Aantal
                          </th>
                          <th className="text-right px-3 py-2 text-slate-600 font-medium w-24">
                            Prijs
                          </th>
                          <th className="text-right px-3 py-2 text-slate-600 font-medium w-24">
                            Totaal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categoryLines.map((line, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-800">
                              {line.description}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  line.type === "materiaal"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {line.type === "materiaal" ? "Mat" : "Arbeid"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {line.quantity} {line.unit}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {formatCurrency(line.unit_price)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-slate-800">
                              {formatCurrency(line.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }
          )}

          {/* Totals */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-500" /> Materialen
              </span>
              <span>{formatCurrency(result.subtotal_materials)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-orange-500" /> Arbeid
              </span>
              <span>{formatCurrency(result.subtotal_labor)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Winstmarge</span>
              <span>{formatCurrency(result.margin_amount)}</span>
            </div>
            <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-medium text-slate-700">
              <span>Totaal excl. BTW</span>
              <span>{formatCurrency(result.total_excl_btw)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>BTW (21%)</span>
              <span>{formatCurrency(result.btw_amount)}</span>
            </div>
            <div className="border-t border-slate-300 pt-2 flex justify-between text-lg font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Euro className="w-5 h-5 text-green-600" /> Totaal incl. BTW
              </span>
              <span className="text-green-700">
                {formatCurrency(result.total_incl_btw)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {result.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Opmerkingen:</strong> {result.notes}
            </div>
          )}

          {/* Actions */}
          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            clientName={form?.client_name}
            clientEmail={form?.client_email}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">
            Nog geen offerte gegenereerd
          </p>
          <p className="text-sm mt-1 mb-4">
            Dit project is opgeslagen zonder AI-offerte.
          </p>
          <Link
            href={`/quotes/new?project=${quote.id}`}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg transition"
          >
            <Sparkles className="w-4 h-4" />
            Offerte genereren
          </Link>
        </div>
      )}
    </div>
  );
}
