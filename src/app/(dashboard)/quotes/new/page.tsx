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
  Layers,
  Shovel,
  Hammer,
  Zap,
  Droplets,
  DoorOpen,
  ArrowUpFromLine,
  BrickWall,
  AlertTriangle,
} from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import { CONSTRUCTION_MODULES, type ConstructionModule } from "@/lib/construction-modules";

const steps = [
  { label: "Klantgegevens", icon: User },
  { label: "Projectdetails", icon: FileText },
  { label: "Modules", icon: Layers },
  { label: "AI Generatie", icon: Sparkles },
];

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shovel: Shovel,
  foundation: BrickWall,
  layers: Layers,
  beam: Hammer,
  crane: ArrowUpFromLine,
  demolition: Hammer,
  wall: BrickWall,
  facade: BrickWall,
  roof: Layers,
  door: DoorOpen,
  zap: Zap,
  droplets: Droplets,
};

interface QuoteLine {
  category: string;
  description: string;
  type: "arbeid" | "materiaal";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface QuoteModule {
  name: string;
  intro: string;
  items: string[];
}

interface QuoteResult {
  quote_title: string;
  summary: string;
  technical_description?: string;
  modules?: QuoteModule[];
  lines: QuoteLine[];
  subtotal_materials: number;
  subtotal_labor: number;
  margin_amount: number;
  total_excl_btw: number;
  btw_amount: number;
  total_incl_btw: number;
  estimated_days: number;
  notes: string;
  validation_warnings?: string[];
  error?: string;
  message?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function recalcTotalsFromLines(lines: QuoteLine[], marginPct: number) {
  const subtotal_materials = lines
    .filter((l) => l.type === "materiaal")
    .reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  const subtotal_labor = lines
    .filter((l) => l.type === "arbeid")
    .reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  const base = subtotal_materials + subtotal_labor;
  const margin_amount = Math.round(base * (marginPct / 100) * 100) / 100;
  const total_excl_btw = Math.round((base + margin_amount) * 100) / 100;
  const btw_amount = Math.round(total_excl_btw * 0.21 * 100) / 100;
  const total_incl_btw = Math.round((total_excl_btw + btw_amount) * 100) / 100;
  return { subtotal_materials, subtotal_labor, margin_amount, total_excl_btw, btw_amount, total_incl_btw };
}

function QuoteDisplay({ quote }: { quote: QuoteResult }) {
  const categories = [...new Set(quote.lines.map((l) => l.category))];
  const totals = recalcTotalsFromLines(quote.lines, 15);

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

      {/* Validation warnings */}
      {quote.validation_warnings && quote.validation_warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm mb-1">
                Let op: niet alle werkzaamheden hebben een prijsregel
              </p>
              <ul className="space-y-0.5">
                {quote.validation_warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-700">• {w}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-2">
                Je kunt de offerte alsnog opslaan. Controleer of de ontbrekende posten verwerkt zijn in andere categorieën.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Technical description */}
      {quote.technical_description && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="font-semibold text-slate-800 mb-2">
            Omschrijving werkzaamheden
          </h4>
          <p className="text-sm text-slate-600 whitespace-pre-line">
            {quote.technical_description}
          </p>
        </div>
      )}

      {/* Modules with intros */}
      {quote.modules && quote.modules.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-800">
            Technische omschrijving per module
          </h4>
          {quote.modules.map((mod, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-200 rounded-lg p-4"
            >
              <h5 className="font-medium text-slate-700 mb-1">{mod.name}</h5>
              <p className="text-sm text-slate-600 mb-2">{mod.intro}</p>
              <ul className="text-sm text-slate-500 space-y-0.5">
                {mod.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-slate-400 mt-1 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

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
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
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
                        {formatCurrency(Math.round(line.quantity * line.unit_price * 100) / 100)}
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
          <span>{formatCurrency(totals.subtotal_materials)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-brand-500" /> Arbeid
          </span>
          <span>{formatCurrency(totals.subtotal_labor)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Winstmarge</span>
          <span>{formatCurrency(totals.margin_amount)}</span>
        </div>
        <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-medium text-slate-700">
          <span>Totaal excl. BTW</span>
          <span>{formatCurrency(totals.total_excl_btw)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>BTW (21%)</span>
          <span>{formatCurrency(totals.btw_amount)}</span>
        </div>
        <div className="border-t border-slate-300 pt-2 flex justify-between text-lg font-bold text-slate-800">
          <span className="flex items-center gap-1.5">
            <Euro className="w-5 h-5 text-green-600" /> Totaal incl. BTW
          </span>
          <span className="text-green-700">
            {formatCurrency(totals.total_incl_btw)}
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
  const [loadingStage, setLoadingStage] = useState("");
  const [loadingProject, setLoadingProject] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [existingProjectId, setExistingProjectId] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [suggestingModules, setSuggestingModules] = useState(false);
  const [modulesSuggested, setModulesSuggested] = useState(false);
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
            if (data.json_data?.selectedModules) {
              setSelectedModules(data.json_data.selectedModules);
            }
          } else {
            setForm((prev) => ({
              ...prev,
              client_name: data.client_name || "",
            }));
          }
          setCurrentStep(3);
        }
        setLoadingProject(false);
      });
  }, [searchParams, supabase]);

  // Auto-suggest modules when arriving at step 3
  useEffect(() => {
    if (currentStep !== 2 || modulesSuggested || selectedModules.length > 0) return;
    const desc = [form.project_title, form.project_description].filter(Boolean).join(". ");
    if (!desc.trim()) return;

    setSuggestingModules(true);
    fetch("/api/suggest-modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_title: form.project_title,
        project_description: form.project_description,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.suggested?.length > 0) {
          setSelectedModules(data.suggested);
        }
      })
      .catch(() => {})
      .finally(() => {
        setSuggestingModules(false);
        setModulesSuggested(true);
      });
  }, [currentStep, form.project_title, form.project_description, modulesSuggested, selectedModules.length]);

  function updateForm(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  function toggleModule(moduleId: string) {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  }

  async function handleGenerate() {
    setLoading(true);
    setLoadingStage("Verbinden met AI...");
    try {
      const response = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, selectedModules }),
      });

      // Handle quota limit (non-streaming JSON response)
      if (response.status === 429) {
        const err = await response.json();
        setResult({
          error: err.message || "Limiet bereikt",
        } as unknown as QuoteResult);
        setLoading(false);
        setLoadingStage("");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setLoadingStage(event.stage);
            } else if (event.type === "result") {
              setResult(event.data);
            } else if (event.type === "error") {
              setResult({
                error: event.error,
                message: event.message,
              } as unknown as QuoteResult);
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch {
      setResult({
        error: "Er is iets misgegaan bij het genereren.",
      } as unknown as QuoteResult);
    }
    setLoading(false);
    setLoadingStage("");
  }

  async function handleSaveQuote() {
    const res = await fetch("/api/save-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: form.client_name,
        status: "draft",
        json_data: { form, result, selectedModules },
        existing_project_id: existingProjectId,
      }),
    });
    const data = await res.json();
    router.push(existingProjectId ? `/projects/${existingProjectId}` : `/projects/${data.id}`);
  }

  async function handleSaveDraft() {
    const res = await fetch("/api/save-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: form.client_name,
        status: "draft",
        json_data: { form, result: null, selectedModules },
        existing_project_id: existingProjectId,
      }),
    });
    const data = await res.json();
    router.push(existingProjectId ? `/projects/${existingProjectId}` : `/projects/${data.id}`);
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
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <button
          onClick={() =>
            router.push(
              existingProjectId
                ? `/projects/${existingProjectId}`
                : "/projects"
            )
          }
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg md:text-2xl font-bold text-slate-800">
          {existingProjectId ? "Offerte Genereren" : "Nieuwe Offerte"}
        </h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1.5 md:gap-2 mb-6 md:mb-8">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center gap-1.5 md:gap-2 px-2 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium w-full justify-center transition ${
                i === currentStep
                  ? "bg-brand-500 text-white"
                  : i < currentStep
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < currentStep ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <step.icon className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => updateForm("client_name", e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                  placeholder="Jan de Vries"
                />
                <VoiceInput
                  onResult={(text) =>
                    updateForm("client_name", form.client_name ? form.client_name + " " + text : text)
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.project_title}
                  onChange={(e) => updateForm("project_title", e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                  placeholder="Badkamerrenovatie"
                />
                <VoiceInput
                  onResult={(text) =>
                    updateForm("project_title", form.project_title ? form.project_title + " " + text : text)
                  }
                />
              </div>
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
              <div className="relative">
                <textarea
                  value={form.project_description}
                  onChange={(e) =>
                    updateForm("project_description", e.target.value)
                  }
                  rows={4}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none text-slate-800"
                  placeholder="Beschrijf het project..."
                />
                <VoiceInput
                  className="absolute top-2 right-2"
                  onResult={(text) =>
                    updateForm(
                      "project_description",
                      form.project_description ? form.project_description + " " + text : text
                    )
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Module Selection */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              Bouwmodules
            </h2>
            {suggestingModules ? (
              <div className="flex items-center gap-2 text-sm text-brand-600 mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI analyseert je project en selecteert modules...
              </div>
            ) : modulesSuggested && selectedModules.length > 0 ? (
              <p className="text-sm text-brand-600 mb-4">
                AI heeft {selectedModules.length} modules voorgesteld op basis van je projectomschrijving. Je kunt deze aanpassen.
              </p>
            ) : (
              <p className="text-sm text-slate-500 mb-4">
                Selecteer de modules die van toepassing zijn op dit project. De AI
                zal deze gebruiken om een gedetailleerde offerte te genereren.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONSTRUCTION_MODULES.map((mod: ConstructionModule) => {
                const isSelected = selectedModules.includes(mod.id);
                const IconComp = MODULE_ICONS[mod.icon] || Package;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`text-left p-3 rounded-lg border-2 transition ${
                      isSelected
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isSelected
                            ? "bg-brand-100 text-brand-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium text-sm ${
                              isSelected ? "text-brand-700" : "text-slate-700"
                            }`}
                          >
                            {mod.name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-brand-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedModules.length > 0 && (
              <p className="text-sm text-brand-600 font-medium">
                {selectedModules.length} module{selectedModules.length !== 1 ? "s" : ""} geselecteerd
              </p>
            )}
          </div>
        )}

        {/* Step 4: AI Generation */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              AI Offerte Generatie
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                AI-input (beschrijf wat je wilt laten berekenen)
              </label>
              <div className="relative">
                <textarea
                  value={form.ai_input}
                  onChange={(e) => updateForm("ai_input", e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none text-slate-800"
                  placeholder="Bijv: Ik moet een badkamer van 3x4 meter volledig strippen en opnieuw betegelen. Inclusief nieuwe douche, toilet en wastafel. Vloerverwarming aanleggen."
                />
                <VoiceInput
                  className="absolute top-2 right-2"
                  onResult={(text) =>
                    updateForm(
                      "ai_input",
                      form.ai_input ? form.ai_input + " " + text : text
                    )
                  }
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tip: Gebruik de microfoon om je opdracht in te spreken
              </p>
            </div>

            {!result && !loading && (
              <button
                onClick={handleGenerate}
                disabled={!form.ai_input}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                Offerte Genereren
              </button>
            )}

            {loading && (
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500 shrink-0" />
                  <div>
                    <p className="font-medium text-brand-700 text-sm">
                      {loadingStage || "Offerte wordt gegenereerd..."}
                    </p>
                    <p className="text-xs text-brand-500 mt-0.5">
                      Dit duurt meestal 15-30 seconden
                    </p>
                  </div>
                </div>
              </div>
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
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                  <button
                    onClick={handleSaveQuote}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2.5 md:px-5 rounded-lg transition text-sm md:text-base"
                  >
                    <Check className="w-4 h-4" />
                    Offerte Opslaan als Concept
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium px-4 py-2.5 rounded-lg transition text-sm md:text-base"
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
        <div className="flex flex-col-reverse sm:flex-row justify-between mt-6 pt-4 md:mt-8 md:pt-6 border-t border-slate-200 gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition disabled:opacity-30 text-sm md:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            Vorige
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            {currentStep >= 1 && form.client_name && !hasQuote && (
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium px-3 py-2.5 md:px-4 rounded-lg transition text-sm md:text-base flex-1 sm:flex-none justify-center"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Opslaan als</span> concept
              </button>
            )}
            {currentStep < steps.length - 1 && (
              <button
                onClick={() =>
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
                }
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-lg transition text-sm md:text-base flex-1 sm:flex-none justify-center"
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
