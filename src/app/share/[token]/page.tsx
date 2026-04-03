import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Download,
  Calendar,
  FileText,
  Package,
  Wrench,
} from "lucide-react";

interface QuoteLine {
  category: string;
  description: string;
  type: "arbeid" | "materiaal";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface QuoteModuleDescription {
  name: string;
  intro: string;
  items: string[];
}

interface QuoteResult {
  quote_title: string;
  summary: string;
  closing?: string;
  technical_description?: string;
  modules?: QuoteModuleDescription[];
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
    client_address?: string;
    client_postal_code?: string;
    client_city?: string;
    project_title?: string;
    project_description?: string;
    project_location?: string;
  };
  result?: QuoteResult;
  display_mode?: "open" | "module" | "hoogover";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDateNL(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SharedQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("share_token", token)
    .single();

  if (!quote) {
    notFound();
  }

  // Fetch business profile of the quote owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, business_email, business_phone, business_address, business_postal_code, business_city, kvk_number, btw_number, iban, quote_validity_days")
    .eq("id", quote.user_id)
    .single();

  const jsonData = quote.json_data as QuoteJsonData | null;
  const form = jsonData?.form;
  const result = jsonData?.result;
  const displayMode = jsonData?.display_mode ?? "open";

  if (!result) {
    notFound();
  }

  const categories = [...new Set(result.lines.map((l) => l.category))];

  // Per category: bereken subtotaal
  const categoryTotals = categories.map((cat) => ({
    name: cat,
    total: result.lines
      .filter((l) => l.category === cat)
      .reduce((sum, l) => sum + l.total, 0),
  }));

  const quoteDate = new Date(quote.created_at);
  const validityDays = profile?.quote_validity_days || 30;
  const expiryDate = new Date(quoteDate);
  expiryDate.setDate(expiryDate.getDate() + validityDays);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">
              {profile?.business_name || "Offerte"}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Gedeelde offerte
            </span>
          </div>
          <a
            href={`/api/generate-pdf/${quote.id}?token=${token}`}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-3 py-1.5 rounded-lg transition text-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Title & Quote metadata */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">
            {result.quote_title || form?.project_title || quote.client_name}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-slate-500">
            {quote.quote_number && (
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-medium text-slate-600">{quote.quote_number}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Offertedatum: {formatDateNL(quoteDate)}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Geldig tot: {formatDateNL(expiryDate)}
            </div>
            {result.estimated_days > 0 && (
              <div className="flex items-center gap-1.5 text-brand-700">
                <Clock className="w-3.5 h-3.5" />
                Doorlooptijd: {result.estimated_days} werkdag{result.estimated_days !== 1 ? "en" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Client & Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
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
              {form?.client_address && (
                <div className="flex items-start gap-2 text-slate-600 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <span>
                    {form.client_address}
                    {(form.client_postal_code || form.client_city) && (
                      <><br />{[form.client_postal_code, form.client_city].filter(Boolean).join(" ")}</>
                    )}
                  </span>
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

        {/* Intro text */}
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-700">
            {form?.client_name ? `Beste ${form.client_name},` : "Geachte heer/mevrouw,"}
          </p>
          <p className="text-sm text-slate-600 mt-2">
            Hierbij ontvangt u onze vrijblijvende offerte ten behoeve van{" "}
            {(result.quote_title || "de werkzaamheden").toLowerCase()}
            {form?.project_location ? ` te ${form.project_location}` : ""}.
          </p>
          {result.summary && (
            <p className="text-sm text-slate-600 mt-2">{result.summary}</p>
          )}
        </div>

        {/* Technical Description per Module — alleen bij open smaak */}
        {displayMode === "open" && result.modules && result.modules.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Technische omschrijving werkzaamheden
            </h2>
            <div className="space-y-5">
              {result.modules.map((mod, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-slate-700 mb-1">{mod.name}</h3>
                  <p className="text-sm text-slate-600 mb-2">{mod.intro}</p>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1">
                    {mod.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quote Lines — weergave op basis van display_mode */}

        {/* OPEN: volledige regelspecificatie */}
        {displayMode === "open" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Omschrijving</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-600">Type</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">Aantal</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">Prijs</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category}>
                      <td colSpan={5} className="px-4 py-2 bg-slate-50 font-semibold text-slate-700 text-xs uppercase tracking-wide">
                        {category}
                      </td>
                    </tr>
                  )).flatMap((catRow, catIdx) => [
                    catRow,
                    ...result.lines
                      .filter((l) => l.category === categories[catIdx])
                      .map((line, idx) => (
                        <tr key={`${categories[catIdx]}-${idx}`} className="border-b border-slate-100">
                          <td className="px-4 py-2.5 text-slate-700">{line.description}</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">
                            {line.type === "materiaal" ? "Materiaal" : "Arbeid"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{line.quantity} {line.unit}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(line.unit_price)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">{formatCurrency(line.total)}</td>
                        </tr>
                      )),
                  ])}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE: subtotaal per categorie */}
        {displayMode === "module" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Onderdeel</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTotals.map((cat, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-slate-700 font-medium">{cat.name}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(cat.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HOOGOVER: geen regelspecificatie, alleen totaalblok */}
        {displayMode === "hoogover" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-6">
            <p className="text-sm text-slate-500 mb-3">
              Deze offerte is op hoofdlijnen opgesteld. De totaalprijs omvat alle benodigde materialen en arbeid.
            </p>
          </div>
        )}

        {/* Totals */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-6">
          <div className="max-w-xs ml-auto space-y-2 text-sm">
            {displayMode !== "hoogover" && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-500" /> Materialen
                  </span>
                  <span>{formatCurrency(result.subtotal_materials)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-brand-500" /> Arbeid
                  </span>
                  <span>{formatCurrency(result.subtotal_labor)}</span>
                </div>
              </>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-medium text-slate-700">
              <span>Totaal excl. BTW</span>
              <span>{formatCurrency(result.total_excl_btw)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>BTW (21%)</span>
              <span>{formatCurrency(result.btw_amount)}</span>
            </div>
            <div className="border-t-2 border-slate-300 pt-2 flex justify-between text-lg font-bold text-green-700">
              <span>Totaal incl. BTW</span>
              <span>{formatCurrency(result.total_incl_btw)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {result.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-6">
            <strong>Opmerkingen:</strong> {result.notes}
          </div>
        )}

        {/* Closing text */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-6">
          <p className="text-sm text-slate-600">
            Deze offerte is geldig tot <span className="font-medium text-slate-700">{formatDateNL(expiryDate)}</span>.
          </p>
          {result.closing ? (
            <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{result.closing}</p>
          ) : (
            <>
              <p className="text-sm text-slate-600 mt-2">Met vriendelijke groet,</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{profile?.business_name}</p>
            </>
          )}
        </div>

        {/* Footer */}
        {profile && (
          <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-200 space-y-1">
            <p className="font-medium">{profile.business_name}</p>
            {(profile.business_address || profile.business_city) && (
              <p>
                {[profile.business_address, profile.business_postal_code, profile.business_city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <p className="flex flex-wrap justify-center gap-x-3">
              {profile.kvk_number && <span>KvK: {profile.kvk_number}</span>}
              {profile.btw_number && <span>BTW: {profile.btw_number}</span>}
              {profile.iban && <span>IBAN: {profile.iban}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
