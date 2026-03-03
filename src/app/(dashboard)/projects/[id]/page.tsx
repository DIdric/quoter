import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from "lucide-react";
import { QuoteActions } from "./actions";
import { EditableQuoteLines } from "./editable-lines";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("margin_percentage").eq("id", user.id).single()
    : { data: null };

  const marginPercentage = profile?.margin_percentage ?? 15;

  const jsonData = quote.json_data as QuoteJsonData | null;
  const form = jsonData?.form;
  const result = jsonData?.result;
  const hasQuoteLines = result && result.lines && result.lines.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <Link
          href="/projects"
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-slate-800 truncate">
            {result?.quote_title || form?.project_title || quote.client_name}
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Aangemaakt op{" "}
            {new Date(quote.created_at).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`px-2 py-1 md:px-3 rounded-full text-xs font-medium shrink-0 ${
            quote.status === "final"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {quote.status === "final" ? "Definitief" : "Concept"}
        </span>
      </div>

      {/* Client & Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
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
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">{result.summary}</p>
            {result.estimated_days > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-brand-700">
                <Clock className="w-4 h-4" />
                Geschatte doorlooptijd: {result.estimated_days} werkdag
                {result.estimated_days !== 1 ? "en" : ""}
              </div>
            )}
          </div>

          {/* Editable Lines & Totals */}
          <EditableQuoteLines
            quoteId={quote.id}
            result={result}
            isDraft={quote.status === "draft"}
            marginPercentage={marginPercentage}
          />

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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 text-center text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">
            Nog geen offerte gegenereerd
          </p>
          <p className="text-sm mt-1 mb-4">
            Dit project is opgeslagen zonder AI-offerte.
          </p>
          <Link
            href={`/quotes/new?project=${quote.id}`}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-lg transition"
          >
            <Sparkles className="w-4 h-4" />
            Offerte genereren
          </Link>
        </div>
      )}
    </div>
  );
}
