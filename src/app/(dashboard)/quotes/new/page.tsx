"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  User,
  FileText,
  Sparkles,
  Loader2,
  Check,
  Package,
  Wrench,
  Clock,
  Euro,
} from "lucide-react";

const steps = [
  { label: "Klantgegevens", icon: User },
  { label: "Projectdetails", icon: FileText },
  { label: "AI Generatie", icon: Sparkles },
];

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
  error?: string;
  message?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function QuoteDisplay({ quote }: { quote: QuoteResult }) {
  const categories = [...new Set(quote.lines.map((l) => l.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-slate-800">
          {quote.quote_title}
        </h3>
        <p className="text-sm text-slate-600 mt-1">{quote.summary}</p>
        {quote.estimated_days > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-brand-700">
            <Clock className="w-4 h-4" />
            Geschatte doorlooptijd: {quote.estimated_days} werkdag
            {quote.estimated_days !== 1 ? "en" : ""}
          </div>
        )}
      </div>

      {/* Lines grouped by category */}
      {categories.map((category) => {
        const categoryLines = quote.lines.filter(
          (l) => l.category === category
        );
        return (
          <div key={category}>
            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              {categoryLines[0]?.type === "materiaal" ? (
                <Package className="w-4 h-4 text-blue-500" />
              ) : (
                <Wrench className="w-4 h-4 text-brand-500" />
              )}
              {category}
            </h4>
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
                              : "bg-brand-100 text-brand-700"
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
      })}

      {/* Totals */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-500" /> Materialen
          </span>
          <span>{formatCurrency(quote.subtotal_materials)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-brand-500" /> Arbeid
          </span>
          <span>{formatCurrency(quote.subtotal_labor)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Winstmarge</span>
          <span>{formatCurrency(quote.margin_amount)}</span>
        </div>
        <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-medium text-slate-700">
          <span>Totaal excl. BTW</span>
          <span>{formatCurrency(quote.total_excl_btw)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>BTW (21%)</span>
          <span>{formatCurrency(quote.btw_amount)}</span>
        </div>
        <div className="border-t border-slate-300 pt-2 flex justify-between text-lg font-bold text-slate-800">
          <span className="flex items-center gap-1.5">
            <Euro className="w-5 h-5 text-green-600" /> Totaal incl. BTW
          </span>
          <span className="text-green-700">
            {formatCurrency(quote.total_incl_btw)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>Opmerkingen:</strong> {quote.notes}
        </div>
      )}
    </div>
  );
}

export default function NewQuotePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <span className="ml-2 text-slate-600">Laden...</span>
        </div>
      }
    >
      <NewQuotePage />
    </Suspense>
  );
}

function NewQuotePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [existingProjectId, setExistingProjectId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    project_title: "",
    project_description: "",
    project_location: "",
    ai_input: "",
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const projectId = searchParams.get("project");
    if (!projectId) return;

    setLoadingProject(true);
    supabase
      .from("quotes")
      .select("*")
      .eq("id", projectId)
      .single()
      .then(({ data }) => {
        if (data) {
          setExistingProjectId(data.id);
          const savedForm = data.json_data?.form;
          if (savedForm) {
            setForm({
              client_name: savedForm.client_name || "",
              client_email: savedForm.client_email || "",
              client_phone: savedForm.client_phone || "",
              project_title: savedForm.project_title || "",
              project_description: savedForm.project_description || "",
              project_location: savedForm.project_location || "",
              ai_input: savedForm.ai_input || "",
            });
          } else {
            setForm((prev) => ({
              ...prev,
              client_name: data.client_name || "",
            }));
          }
          setCurrentStep(2);
        }
        setLoadingProject(false);
      });
  }, [searchParams, supabase]);

  function updateForm(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const response = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        error: "Er is iets misgegaan bij het genereren.",
      } as unknown as QuoteResult);
    }
    setLoading(false);
  }

  async function handleSaveQuote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (existingProjectId) {
      await supabase
        .from("quotes")
        .update({
          client_name: form.client_name,
          json_data: { form, result },
        })
        .eq("id", existingProjectId);
      router.push(`/projects/${existingProjectId}`);
    } else {
      await supabase.from("quotes").insert({
        user_id: user.id,
        client_name: form.client_name,
        status: "draft",
        json_data: { form, result },
      });
      router.push("/projects");
    }
  }

  async function handleSaveDraft() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (existingProjectId) {
      await supabase
        .from("quotes")
        .update({
          client_name: form.client_name,
          json_data: { form, result: null },
        })
        .eq("id", existingProjectId);
      router.push(`/projects/${existingProjectId}`);
    } else {
      await supabase.from("quotes").insert({
        user_id: user.id,
        client_name: form.client_name,
        status: "draft",
        json_data: { form, result: null },
      });
      router.push("/projects");
    }
  }

  function handleRegenerate() {
    setResult(null);
  }

  const hasError = result && ("error" in result && result.error);
  const hasQuote = result && result.lines && !hasError;

  if (loadingProject) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        <span className="ml-2 text-slate-600">Project laden...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() =>
            router.push(
              existingProjectId
                ? `/projects/${existingProjectId}`
                : "/projects"
            )
          }
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          {existingProjectId ? "Offerte Genereren" : "Nieuwe Offerte"}
        </h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center transition ${
                i === currentStep
                  ? "bg-brand-500 text-white"
                  : i < currentStep
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                <step.icon className="w-4 h-4" />
              )}
              {step.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Step 1: Client Details */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Klantgegevens
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Naam klant *
              </label>
              <input
                type="text"
                value={form.client_name}
                onChange={(e) => updateForm("client_name", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="Jan de Vries"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={form.client_email}
                  onChange={(e) => updateForm("client_email", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                  placeholder="jan@voorbeeld.nl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefoon
                </label>
                <input
                  type="tel"
                  value={form.client_phone}
                  onChange={(e) => updateForm("client_phone", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                  placeholder="06-12345678"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Project Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Projectdetails
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Projecttitel *
              </label>
              <input
                type="text"
                value={form.project_title}
                onChange={(e) => updateForm("project_title", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="Badkamerrenovatie"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Locatie
              </label>
              <input
                type="text"
                value={form.project_location}
                onChange={(e) =>
                  updateForm("project_location", e.target.value)
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="Amsterdam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Projectomschrijving
              </label>
              <textarea
                value={form.project_description}
                onChange={(e) =>
                  updateForm("project_description", e.target.value)
                }
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none text-slate-800"
                placeholder="Beschrijf het project..."
              />
            </div>
          </div>
        )}

        {/* Step 3: AI Generation */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              AI Offerte Generatie
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                AI-input (beschrijf wat je wilt laten berekenen)
              </label>
              <textarea
                value={form.ai_input}
                onChange={(e) => updateForm("ai_input", e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none text-slate-800"
                placeholder="Bijv: Ik moet een badkamer van 3x4 meter volledig strippen en opnieuw betegelen. Inclusief nieuwe douche, toilet en wastafel. Vloerverwarming aanleggen."
              />
            </div>

            {!result && (
              <button
                onClick={handleGenerate}
                disabled={loading || !form.ai_input}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Offerte wordt gegenereerd...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Offerte Genereren
                  </>
                )}
              </button>
            )}

            {/* Error state */}
            {hasError && (
              <div className="mt-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-1">
                    {result.error}
                  </h3>
                  {result.message && (
                    <p className="text-sm text-red-600">{result.message}</p>
                  )}
                </div>
                <button
                  onClick={handleRegenerate}
                  className="mt-3 flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm transition"
                >
                  <Sparkles className="w-4 h-4" />
                  Opnieuw proberen
                </button>
              </div>
            )}

            {/* Success state - Structured quote display */}
            {hasQuote && (
              <div className="mt-4">
                <QuoteDisplay quote={result} />
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveQuote}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg transition"
                  >
                    <Check className="w-4 h-4" />
                    Offerte Opslaan als Concept
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium px-4 py-2.5 rounded-lg transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    Opnieuw genereren
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" />
            Vorige
          </button>
          <div className="flex items-center gap-3">
            {currentStep >= 1 && form.client_name && !hasQuote && (
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium px-4 py-2 rounded-lg transition"
              >
                <FileText className="w-4 h-4" />
                Opslaan als concept
              </button>
            )}
            {currentStep < steps.length - 1 && (
              <button
                onClick={() =>
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
                }
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                Volgende
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
