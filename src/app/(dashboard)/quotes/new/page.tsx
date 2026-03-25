"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
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
  Send,
  Trash2,
  Plus,
  Download,
  Share2,
  Link as LinkIcon,
  CheckCircle,
} from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import { CONSTRUCTION_MODULES, type ConstructionModule } from "@/lib/construction-modules";

// New 3-step flow
const STEPS = [
  { label: "Omschrijven" },
  { label: "Aanpassen" },
  { label: "Versturen" },
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
  closing?: string;
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

// Step indicator: 3 numbered circles with connecting lines
function StepIndicator({
  currentStep,
  loading,
}: {
  currentStep: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-center mb-6 md:mb-8">
      {STEPS.map((step, i) => {
        // While loading, step 0 stays "active" visually
        const isActive = loading ? i === 0 : i === currentStep;
        const isCompleted = loading ? false : i < currentStep;
        const isFuture = !isActive && !isCompleted;

        return (
          <div key={step.label} className="flex items-center">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-brand-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? "text-brand-600"
                    : isCompleted
                    ? "text-green-600"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line between steps */}
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-12 sm:w-20 mx-2 mb-5 transition-colors ${
                  i < currentStep && !loading ? "bg-green-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── QuotePreviewPanel ────────────────────────────────────────────────────────
function QuotePreviewPanel({
  result,
  profile,
  displayMode,
  marginPct,
  form,
}: {
  result: QuoteResult;
  profile: {
    business_name: string | null;
    logo_url: string | null;
    business_address: string | null;
    business_postal_code: string | null;
    business_city: string | null;
    business_phone: string | null;
    business_email: string | null;
    kvk_number: string | null;
    btw_number: string | null;
  } | null;
  displayMode: "open" | "module" | "hoogover";
  marginPct: number;
  form: {
    client_name: string;
    client_email: string;
    project_title: string;
    project_location: string;
  };
}) {
  const t = recalcTotalsFromLines(result.lines, marginPct);
  const today = new Date().toLocaleDateString("nl-NL");
  const categories = [...new Set(result.lines.map((l) => l.category))];

  return (
    <div className="text-xs text-slate-700 space-y-4 font-sans">
      {/* a. Company header */}
      <div className="relative">
        <span className="absolute top-0 right-0 text-[10px] text-slate-400 italic">Jouw bedrijfsinfo</span>
        <div className="flex justify-between items-start pr-24">
          <div>
            <p className="font-semibold text-sm text-slate-800">
              {profile?.business_name || "Jouw Bedrijfsnaam"}
            </p>
            {profile?.business_address && (
              <p className="text-slate-500">
                {profile.business_address}
                {(profile.business_postal_code || profile.business_city) && (
                  <>, {profile.business_postal_code} {profile.business_city}</>
                )}
              </p>
            )}
            {profile?.business_phone && (
              <p className="text-slate-500">{profile.business_phone}</p>
            )}
            {profile?.business_email && (
              <p className="text-slate-500">{profile.business_email}</p>
            )}
          </div>
          <div>
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="logo" className="h-10 object-contain" />
            ) : (
              <div className="w-16 h-10 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400 font-medium">
                LOGO
              </div>
            )}
          </div>
        </div>
        <hr className="my-2 border-slate-200" />
        <div className="flex gap-4 text-[10px] text-slate-400">
          {profile?.kvk_number && <span>KVK: {profile.kvk_number}</span>}
          {profile?.btw_number && <span>BTW: {profile.btw_number}</span>}
        </div>
      </div>

      {/* b. Quote meta */}
      <div className="space-y-1">
        <div className="flex justify-between items-start">
          <p className="text-sm font-semibold text-slate-800">Offerte</p>
          <p className="text-slate-500">{today}</p>
        </div>
        <p><span className="text-slate-500">Betreft:</span> {form.project_title || result.quote_title}</p>
        <p><span className="text-slate-500">Klant:</span> {form.client_name || "—"}</p>
        {form.project_location && (
          <p><span className="text-slate-500">Locatie:</span> {form.project_location}</p>
        )}
      </div>

      {/* Projectintroductie */}
      {result.summary && (
        <div>
          <p className="text-slate-700 italic">{result.summary}</p>
        </div>
      )}

      {/* c. Technical description */}
      {result.modules && result.modules.length > 0 && (
        <div>
          <p className="font-semibold text-slate-700 mb-1 text-[11px] uppercase tracking-wide">
            Technische omschrijving werkzaamheden
          </p>
          <div className="space-y-2">
            {result.modules.map((mod, i) => (
              <div key={i}>
                <p className="font-semibold text-slate-800">{mod.name}</p>
                <p className="italic text-slate-500">{mod.intro}</p>
                {displayMode !== "hoogover" && (
                  <ul className="mt-0.5 space-y-0.5 pl-3">
                    {mod.items.map((item, j) => (
                      <li key={j} className="text-slate-600">• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* d. Price section */}
      {displayMode === "open" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[320px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-1 px-2 font-medium text-slate-600">Omschrijving</th>
                <th className="text-right py-1 px-2 font-medium text-slate-600 w-12">Aantal</th>
                <th className="text-left py-1 px-2 font-medium text-slate-600 w-12">Eenheid</th>
                <th className="text-right py-1 px-2 font-medium text-slate-600 w-16">Prijs</th>
                <th className="text-right py-1 px-2 font-medium text-slate-600 w-16">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1 px-2 text-slate-700">{line.description}</td>
                  <td className="py-1 px-2 text-right text-slate-600">{line.quantity}</td>
                  <td className="py-1 px-2 text-slate-600">{line.unit}</td>
                  <td className="py-1 px-2 text-right text-slate-600">{formatCurrency(line.unit_price)}</td>
                  <td className="py-1 px-2 text-right font-medium text-slate-800">
                    {formatCurrency(Math.round(line.quantity * line.unit_price * 100) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {displayMode === "module" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-1 px-2 font-medium text-slate-600">Module</th>
                <th className="text-right py-1 px-2 font-medium text-slate-600 w-20">Prijs</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const catLines = result.lines.filter((l) => l.category === cat);
                const base = catLines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
                const catTotal = Math.round(base * (1 + marginPct / 100) * 100) / 100;
                return (
                  <tr key={cat} className="border-b border-slate-100">
                    <td className="py-1 px-2 text-slate-700">{cat}</td>
                    <td className="py-1 px-2 text-right font-medium text-slate-800">{formatCurrency(catTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* e. Totals */}
      <div className="border-t border-slate-200 pt-2 space-y-1">
        {displayMode !== "hoogover" && (
          <>
            <div className="flex justify-between text-slate-500">
              <span>Materialen</span>
              <span>{formatCurrency(t.subtotal_materials)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Arbeid</span>
              <span>{formatCurrency(t.subtotal_labor)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-slate-600 font-medium">
          <span>Totaal excl. BTW</span>
          <span>{formatCurrency(t.total_excl_btw)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>BTW 21%</span>
          <span>{formatCurrency(t.btw_amount)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm text-slate-800 border-t border-slate-200 pt-1 mt-1">
          <span>Totaal incl. BTW</span>
          <span>{formatCurrency(t.total_incl_btw)}</span>
        </div>
      </div>

      {/* closing */}
      {result.closing && (
        <p className="text-slate-700 mt-3">{result.closing}</p>
      )}

      {/* f. Notes */}
      {result.notes && (
        <p className="italic text-slate-500 text-[11px]">{result.notes}</p>
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

const LANGUAGES = [
  { code: "nl", flag: "🇳🇱", label: "NL" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "de", flag: "🇩🇪", label: "DE" },
  { code: "pl", flag: "🇵🇱", label: "PL" },
];

function NewQuotePage() {
  // currentStep: 0 = Omschrijven, 1 = Aanpassen, 2 = Versturen
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [loadingProject, setLoadingProject] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [existingProjectId, setExistingProjectId] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [suggestingModules, setSuggestingModules] = useState(false);
  const [modulesSuggested, setModulesSuggested] = useState(false);
  const [language, setLanguage] = useState("nl");
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

  const [marginPct, setMarginPct] = useState(15);
  const [displayMode, setDisplayMode] = useState<"open" | "module" | "hoogover">("open");
  const [activeTab, setActiveTab] = useState<"Bewerken" | "Preview">("Bewerken");
  const [isSaving, setIsSaving] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [profile, setProfile] = useState<{
    business_name: string | null;
    logo_url: string | null;
    business_address: string | null;
    business_postal_code: string | null;
    business_city: string | null;
    business_phone: string | null;
    business_email: string | null;
    kvk_number: string | null;
    btw_number: string | null;
  } | null>(null);

  // Load default language, margin, and profile from profiles table
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select(
          "default_language, margin_percentage, business_name, logo_url, business_address, business_postal_code, business_city, business_phone, business_email, kvk_number, btw_number, default_display_mode"
        )
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.default_language) setLanguage(data.default_language);
          if (data?.margin_percentage != null) setMarginPct(data.margin_percentage);
          if (data?.default_display_mode) setDisplayMode(data.default_display_mode as "open" | "module" | "hoogover");
          setProfile({
            business_name: data?.business_name ?? null,
            logo_url: data?.logo_url ?? null,
            business_address: data?.business_address ?? null,
            business_postal_code: data?.business_postal_code ?? null,
            business_city: data?.business_city ?? null,
            business_phone: data?.business_phone ?? null,
            business_email: data?.business_email ?? null,
            kvk_number: data?.kvk_number ?? null,
            btw_number: data?.btw_number ?? null,
          });
        });
    });
  }, [supabase]);

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
          setSavedQuoteId(data.id);
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
            if (data.json_data?.result) {
              setResult(data.json_data.result as QuoteResult);
            }
            if (data.json_data?.display_mode) {
              setDisplayMode(data.json_data.display_mode as "open" | "module" | "hoogover");
            }
            if (data.json_data?.language) {
              setLanguage(data.json_data.language as string);
            }
          } else {
            setForm((prev) => ({
              ...prev,
              client_name: data.client_name || "",
            }));
          }
          // Jump to the right step based on URL param or status
          const stepParam = searchParams.get("step");
          if (stepParam !== null) {
            setCurrentStep(parseInt(stepParam, 10));
          } else {
            setCurrentStep(data.status === "final" ? 2 : 1);
          }
        }
        setLoadingProject(false);
      });
  }, [searchParams, supabase]);

  // Auto-suggest modules when description has enough content (runs in background on step 0)
  useEffect(() => {
    if (modulesSuggested || selectedModules.length > 0) return;
    const desc = [form.project_title, form.project_description].filter(Boolean).join(". ");
    if (desc.trim().length < 20) return;

    const timer = setTimeout(() => {
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
    }, 800);

    return () => clearTimeout(timer);
  }, [form.project_title, form.project_description, modulesSuggested, selectedModules.length]);

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
        body: JSON.stringify({ ...form, selectedModules, language }),
      });

      // Handle quota limit (non-streaming JSON response)
      if (response.status === 429) {
        const err = await response.json();
        setResult({
          error: err.message || "Limiet bereikt",
        } as unknown as QuoteResult);
        setLoading(false);
        setLoadingStage("");
        setCurrentStep(1);
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
    setCurrentStep(1);
  }

  async function handleSaveQuote() {
    const res = await fetch("/api/save-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: form.client_name,
        status: "draft",
        json_data: { form, result, selectedModules, language, display_mode: displayMode },
        existing_project_id: existingProjectId,
      }),
    });
    router.push("/projects");
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
    router.push("/projects");
  }

  function handleRegenerate() {
    setResult(null);
    setCurrentStep(0);
  }

  async function handleAdvanceToSend() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/save-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: form.client_name,
          status: "final",
          json_data: { form, result, selectedModules, language, display_mode: displayMode },
          existing_project_id: existingProjectId,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setSavedQuoteId(data.id);
        setExistingProjectId(data.id);
      }
      setCurrentStep(2);
    } catch {
      // Still advance even if save fails
      setCurrentStep(2);
    }
    setIsSaving(false);
  }

  async function handleDownloadPdf() {
    if (!savedQuoteId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/generate-pdf/${savedQuoteId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "offerte.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    setDownloading(false);
  }

  async function handleShare() {
    if (!savedQuoteId) return;
    setSharing(true);
    try {
      let token = shareToken;
      if (!token) {
        token = crypto.randomUUID();
        await supabase.from("quotes").update({ share_token: token }).eq("id", savedQuoteId);
        setShareToken(token);
      }
      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    }
    setSharing(false);
  }

  const hasError = result && ("error" in result && result.error);
  const hasQuote = result && result.lines && !hasError;

  // Totals for Versturen summary
  const totals = hasQuote ? recalcTotalsFromLines(result.lines, marginPct) : null;

  if (loadingProject) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        <span className="ml-2 text-slate-600">Project laden...</span>
      </div>
    );
  }

  return (
    <div className={currentStep === 0 ? "max-w-3xl mx-auto" : "max-w-6xl mx-auto"}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <button
          onClick={() => router.push("/projects")}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg md:text-2xl font-bold text-slate-800">
          {existingProjectId ? "Offerte Genereren" : "Nieuwe Offerte"}
        </h1>
      </div>

      {/* 3-Step Indicator */}
      <StepIndicator currentStep={currentStep} loading={loading} />

      {/* Loading overlay — replaces card content while AI runs */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12 flex flex-col items-center justify-center gap-5 min-h-[300px]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800 text-base">
              {loadingStage || "Offerte wordt gegenereerd..."}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Dit duurt meestal 15–30 seconden
            </p>
          </div>
        </div>
      )}

      {/* Step Content (hidden while loading) */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">

          {/* ── STAP 1: Omschrijven ─────────────────────────────── */}
          {currentStep === 0 && (
            <div className="space-y-8">

              {/* Section 1: Klantgegevens */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-800">
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

              {/* Divider */}
              <hr className="border-slate-100" />

              {/* Section 2: Projectdetails */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-800">
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
                    onChange={(e) => updateForm("project_location", e.target.value)}
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
                      onChange={(e) => updateForm("project_description", e.target.value)}
                      rows={3}
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    AI-input <span className="text-slate-400 font-normal">(beschrijf wat je wilt laten berekenen)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={form.ai_input}
                      onChange={(e) => updateForm("ai_input", e.target.value)}
                      rows={5}
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Taal van de offerte
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                          language === lang.code
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-slate-100" />

              {/* Section 3: Modules */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-800">
                    Modules
                  </h2>
                  {suggestingModules && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      AI analyseert...
                    </span>
                  )}
                  {!suggestingModules && modulesSuggested && selectedModules.length > 0 && (
                    <span className="text-xs text-brand-600">
                      {selectedModules.length} modules voorgesteld door AI
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  Selecteer de modules die van toepassing zijn. De AI gebruikt deze voor de offerte.
                </p>
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

              {/* Generate button */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!form.ai_input}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50 text-sm md:text-base"
                >
                  <Sparkles className="w-4 h-4" />
                  Genereer offerte →
                </button>
                {form.client_name && (
                  <button
                    onClick={handleSaveDraft}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium px-4 py-3 rounded-lg transition text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Opslaan als concept
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STAP 2: Aanpassen ───────────────────────────────── */}
          {currentStep === 1 && (
            <div>

              {/* Mobile tabs */}
              <div className="flex sm:hidden border-b border-slate-200 mb-4">
                {(["Bewerken", "Preview"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                      activeTab === tab
                        ? "border-brand-500 text-brand-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Desktop: side by side. Mobile: one tab at a time */}
              <div className="flex flex-col sm:flex-row gap-0 min-h-[600px]">

                {/* LEFT: Edit panel */}
                <div className={`sm:w-1/2 sm:border-r border-slate-200 sm:pr-6 space-y-4 ${activeTab !== "Bewerken" ? "hidden sm:block" : ""}`}>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Gegenereerde offerte
                  </h2>

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

              {/* Success state */}
              {hasQuote && (
                <div className="space-y-6">

                  {/* Header card */}
                  <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-slate-800">{result.quote_title}</h3>
                    <label className="block text-xs font-medium text-green-700 mt-2 mb-1">Projectintroductie</label>
                    <textarea
                      value={result.summary}
                      onChange={(e) => setResult(prev => prev ? { ...prev, summary: e.target.value } : prev)}
                      rows={3}
                      className="w-full border border-green-200 rounded-lg p-2 text-sm text-slate-700 bg-green-50 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"
                    />
                    {result.estimated_days > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm text-brand-700">
                        <Clock className="w-4 h-4" />
                        Geschatte doorlooptijd: {result.estimated_days} werkdag{result.estimated_days !== 1 ? "en" : ""}
                      </div>
                    )}
                  </div>

                  {/* Validation warnings */}
                  {result.validation_warnings && result.validation_warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-800 text-sm mb-1">
                            Let op: niet alle werkzaamheden hebben een prijsregel
                          </p>
                          <ul className="space-y-0.5">
                            {result.validation_warnings.map((w, i) => (
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

                  {/* ── Editable Module Descriptions ── */}
                  {result.modules && result.modules.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-800 text-sm">Technische omschrijving</h3>
                      </div>
                      <div className="p-4 space-y-5">
                        {result.modules.map((mod, modIdx) => (
                          <div key={modIdx}>
                            <h4 className="font-medium text-slate-700 mb-2 text-sm">{mod.name}</h4>
                            <div className="space-y-1.5">
                              {mod.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => {
                                      const updatedModules = result.modules!.map((m, mi) =>
                                        mi !== modIdx ? m : {
                                          ...m,
                                          items: m.items.map((it, ii) => ii === itemIdx ? e.target.value : it),
                                        }
                                      );
                                      setResult((prev) => prev ? { ...prev, modules: updatedModules } : prev);
                                    }}
                                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedModules = result.modules!.map((m, mi) =>
                                        mi !== modIdx ? m : {
                                          ...m,
                                          items: m.items.filter((_, ii) => ii !== itemIdx),
                                        }
                                      );
                                      setResult((prev) => prev ? { ...prev, modules: updatedModules } : prev);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 transition shrink-0"
                                    title="Verwijder regel"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedModules = result.modules!.map((m, mi) =>
                                    mi !== modIdx ? m : { ...m, items: [...m.items, ""] }
                                  );
                                  setResult((prev) => prev ? { ...prev, modules: updatedModules } : prev);
                                }}
                                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mt-1 transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Regel toevoegen
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Editable Price Lines ── */}
                  {(() => {
                    const categories = [...new Set(result.lines.map((l) => l.category))];
                    return (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                          <h3 className="font-semibold text-slate-800 text-sm">Prijsoverzicht</h3>
                        </div>
                        <div className="p-4 space-y-6">
                          {categories.map((category) => {
                            const catLines = result.lines
                              .map((l, globalIdx) => ({ ...l, globalIdx }))
                              .filter((l) => l.category === category);
                            return (
                              <div key={category}>
                                <h4 className="font-medium text-slate-700 mb-2 text-sm flex items-center gap-2">
                                  {catLines[0]?.type === "materiaal"
                                    ? <Package className="w-4 h-4 text-blue-500" />
                                    : <Wrench className="w-4 h-4 text-brand-500" />}
                                  {category}
                                </h4>
                                <div className="space-y-2">
                                  {/* Column headers — hidden on mobile */}
                                  <div className="hidden sm:grid sm:grid-cols-[1fr_auto_80px_70px_90px_90px_32px] gap-2 px-1">
                                    <span className="text-xs text-slate-400 font-medium">Omschrijving</span>
                                    <span className="text-xs text-slate-400 font-medium">Type</span>
                                    <span className="text-xs text-slate-400 font-medium text-right">Aantal</span>
                                    <span className="text-xs text-slate-400 font-medium">Eenheid</span>
                                    <span className="text-xs text-slate-400 font-medium text-right">Stukprijs</span>
                                    <span className="text-xs text-slate-400 font-medium text-right">Totaal</span>
                                    <span />
                                  </div>
                                  {catLines.map(({ globalIdx, ...line }) => {
                                    const needsAttention = line.unit_price === 0;
                                    return (
                                      <div
                                        key={globalIdx}
                                        className={`rounded-lg bg-white overflow-x-auto ${needsAttention ? "border border-slate-200 border-l-4 border-l-orange-400" : "border border-slate-200"}`}
                                      >
                                        {/* Desktop: grid row */}
                                        <div className="hidden sm:grid sm:grid-cols-[1fr_auto_80px_70px_90px_90px_32px] gap-2 items-center p-2">
                                          <input
                                            type="text"
                                            value={line.description}
                                            onChange={(e) => {
                                              const updatedLines = result.lines.map((l, i) =>
                                                i !== globalIdx ? l : { ...l, description: e.target.value }
                                              );
                                              setResult((prev) => prev ? { ...prev, lines: updatedLines } : prev);
                                            }}
                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                                          />
                                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                                            line.type === "materiaal"
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-brand-100 text-brand-700"
                                          }`}>
                                            {line.type === "materiaal" ? "Materiaal" : "Arbeid"}
                                          </span>
                                          <input
                                            type="number"
                                            value={line.quantity}
                                            min={0}
                                            step="any"
                                            onChange={(e) => {
                                              const qty = parseFloat(e.target.value) || 0;
                                              const updatedLines = result.lines.map((l, i) =>
                                                i !== globalIdx ? l : { ...l, quantity: qty, total: Math.round(qty * l.unit_price * 100) / 100 }
                                              );
                                              setResult((prev) => prev ? { ...prev, lines: updatedLines, ...recalcTotalsFromLines(updatedLines, marginPct) } : prev);
                                            }}
                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none text-right text-slate-800"
                                          />
                                          <input
                                            type="text"
                                            value={line.unit}
                                            onChange={(e) => {
                                              const updatedLines = result.lines.map((l, i) =>
                                                i !== globalIdx ? l : { ...l, unit: e.target.value }
                                              );
                                              setResult((prev) => prev ? { ...prev, lines: updatedLines } : prev);
                                            }}
                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                                          />
                                          <input
                                            type="number"
                                            value={line.unit_price}
                                            min={0}
                                            step="any"
                                            onChange={(e) => {
                                              const price = parseFloat(e.target.value) || 0;
                                              const updatedLines = result.lines.map((l, i) =>
                                                i !== globalIdx ? l : { ...l, unit_price: price, total: Math.round(l.quantity * price * 100) / 100 }
                                              );
                                              setResult((prev) => prev ? { ...prev, lines: updatedLines, ...recalcTotalsFromLines(updatedLines, marginPct) } : prev);
                                            }}
                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none text-right text-slate-800"
                                          />
                                          <span className="text-sm font-medium text-slate-800 text-right pr-1 whitespace-nowrap">
                                            {formatCurrency(Math.round(line.quantity * line.unit_price * 100) / 100)}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedLines = result.lines.filter((_, i) => i !== globalIdx);
                                              setResult((prev) => prev ? { ...prev, lines: updatedLines, ...recalcTotalsFromLines(updatedLines, marginPct) } : prev);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition"
                                            title="Verwijder regel"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>

                                        {/* Mobile: stacked layout */}
                                        <div className="sm:hidden p-3 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              value={line.description}
                                              onChange={(e) => {
                                                const updatedLines = result.lines.map((l, i) =>
                                                  i !== globalIdx ? l : { ...l, description: e.target.value }
                                                );
                                                setResult((prev) => prev ? { ...prev, lines: updatedLines } : prev);
                                              }}
                                              className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-500 outline-none text-slate-800"
                                              placeholder="Omschrijving"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedLines = result.lines.filter((_, i) => i !== globalIdx);
                                                setResult((prev) => prev ? { ...prev, lines: updatedLines, ...recalcTotalsFromLines(updatedLines, marginPct) } : prev);
                                              }}
                                              className="p-1.5 text-slate-400 hover:text-red-500 transition shrink-0"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2">
                                            <div>
                                              <label className="text-xs text-slate-400">Aantal</label>
                                              <input
                                                type="number"
                                                value={line.quantity}
                                                min={0}
                                                step="any"
                                                onChange={(e) => {
                                                  const qty = parseFloat(e.target.value) || 0;
                                                  const updatedLines = result.lines.map((l, i) =>
                                                    i !== globalIdx ? l : { ...l, quantity: qty, total: Math.round(qty * l.unit_price * 100) / 100 }
                                                  );
                                                  setResult((prev) => prev ? { ...prev, lines: updatedLines, ...recalcTotalsFromLines(updatedLines, marginPct) } : prev);
                                                }}
                                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-500 outline-none text-right text-slate-800"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-xs text-slate-400">Eenheid</label>
                                              <input
                                                type="text"
                                                value={line.unit}
                                                onChange={(e) => {
                                                  const updatedLines = result.lines.map((l, i) =>
                                                    i !== globalIdx ? l : { ...l, unit: e.target.value }
                                                  );
                                                  setResult((prev) => prev ? { ...prev, lines: updatedLines } : prev);
                                                }}
                                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-500 outline-none text-slate-800"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-xs text-slate-400">Stukprijs</label>
                                              <input
                                                type="number"
                                                value={line.unit_price}
                                                min={0}
                                                step="any"
                                                onChange={(e) => {
                                                  const price = parseFloat(e.target.value) || 0;
                                                  const updatedLines = result.lines.map((l, i) =>
                                                    i !== globalIdx ? l : { ...l, unit_price: price, total: Math.round(l.quantity * price * 100) / 100 }
                                                  );
                                                  setResult((prev) => prev ? { ...prev, lines: updatedLines, ...recalcTotalsFromLines(updatedLines, marginPct) } : prev);
                                                }}
                                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-500 outline-none text-right text-slate-800"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex justify-between items-center text-sm">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                              line.type === "materiaal" ? "bg-blue-100 text-blue-700" : "bg-brand-100 text-brand-700"
                                            }`}>
                                              {line.type === "materiaal" ? "Materiaal" : "Arbeid"}
                                            </span>
                                            <span className="font-medium text-slate-800">
                                              {formatCurrency(Math.round(line.quantity * line.unit_price * 100) / 100)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const defaultType = catLines[0]?.type ?? "arbeid";
                                      const newLine: QuoteLine = {
                                        category,
                                        description: "",
                                        type: defaultType,
                                        quantity: 1,
                                        unit: defaultType === "arbeid" ? "uur" : "st",
                                        unit_price: 0,
                                        total: 0,
                                      };
                                      const updatedLines = [...result.lines, newLine];
                                      setResult((prev) => prev ? { ...prev, lines: updatedLines, ...recalcTotalsFromLines(updatedLines, marginPct) } : prev);
                                    }}
                                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition mt-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Regel toevoegen
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Totals block */}
                  {(() => {
                    const t = recalcTotalsFromLines(result.lines, marginPct);
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-blue-500" /> Materialen
                          </span>
                          <span>{formatCurrency(t.subtotal_materials)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Wrench className="w-4 h-4 text-brand-500" /> Arbeid
                          </span>
                          <span>{formatCurrency(t.subtotal_labor)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Winstmarge ({marginPct}%)</span>
                          <span>{formatCurrency(t.margin_amount)}</span>
                        </div>
                        <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-medium text-slate-700">
                          <span>Totaal excl. BTW</span>
                          <span>{formatCurrency(t.total_excl_btw)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>BTW (21%)</span>
                          <span>{formatCurrency(t.btw_amount)}</span>
                        </div>
                        <div className="border-t border-slate-300 pt-2 flex justify-between text-lg font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Euro className="w-5 h-5 text-green-600" /> Totaal incl. BTW
                          </span>
                          <span className="text-green-700">{formatCurrency(t.total_incl_btw)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Closing */}
                  <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Afsluiting</p>
                    <textarea
                      value={result.closing || ""}
                      onChange={(e) => setResult(prev => prev ? { ...prev, closing: e.target.value } : prev)}
                      rows={3}
                      placeholder="Slottekst na de prijs..."
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>

                  {/* Notes */}
                  {result.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      <strong>Opmerkingen:</strong> {result.notes}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={handleAdvanceToSend}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm md:text-base disabled:opacity-70"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Opslaan...
                        </>
                      ) : (
                        <>
                          Verder naar versturen
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
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

              {/* Empty state — navigated here without a result */}
              {!hasQuote && !hasError && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">Nog geen offerte gegenereerd.</p>
                  <button
                    onClick={() => setCurrentStep(0)}
                    className="mt-3 text-brand-500 hover:text-brand-600 text-sm font-medium"
                  >
                    ← Terug naar omschrijven
                  </button>
                </div>
              )}
                </div>{/* end left edit panel */}

                {/* RIGHT: Preview panel */}
                <div className={`sm:w-1/2 sm:pl-6 min-w-0 overflow-hidden ${activeTab !== "Preview" ? "hidden sm:block" : ""}`}>
                  {/* Style picker — sticky */}
                  <div className="sticky top-0 z-10 bg-white pb-3 border-b border-slate-200 mb-4">
                    <p className="text-xs text-slate-500 mb-2">Weergavestijl</p>
                    <div className="flex gap-2">
                      {[
                        { key: "open", label: "Gedetailleerd" },
                        { key: "module", label: "Per module" },
                        { key: "hoogover", label: "Hoogover" },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setDisplayMode(key as "open" | "module" | "hoogover")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            displayMode === key
                              ? "bg-brand-500 text-white border-brand-500"
                              : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live preview */}
                  {hasQuote && (
                    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                      <QuotePreviewPanel
                        result={result}
                        profile={profile}
                        displayMode={displayMode}
                        marginPct={marginPct}
                        form={{
                          client_name: form.client_name,
                          client_email: form.client_email,
                          project_title: form.project_title,
                          project_location: form.project_location,
                        }}
                      />
                    </div>
                  )}
                  {!hasQuote && (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Nog geen offerte om te previewen.
                    </div>
                  )}
                </div>{/* end right preview panel */}

              </div>{/* end flex row */}
            </div>
          )}

          {/* ── STAP 3: Versturen ───────────────────────────────── */}
          {currentStep === 2 && (
            <div className="flex flex-col sm:flex-row gap-0 min-h-[600px]">

              {/* LEFT: Versturen & bewaren */}
              <div className="sm:w-1/2 sm:border-r border-slate-200 sm:pr-6 space-y-6">
                <h2 className="text-xl font-bold text-slate-800">Versturen &amp; bewaren</h2>

                {/* A. Summary card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Klant</span>
                    <span className="font-medium text-slate-800">{form.client_name || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Project</span>
                    <span className="font-medium text-slate-800">{form.project_title || "—"}</span>
                  </div>
                  {totals && (
                    <div className="border-t border-slate-200 pt-3 flex justify-between">
                      <span className="text-slate-500 text-sm flex items-center gap-1.5">
                        <Euro className="w-4 h-4 text-green-600" /> Totaal incl. BTW
                      </span>
                      <span className="text-lg font-bold text-green-700">
                        {formatCurrency(totals.total_incl_btw)}
                      </span>
                    </div>
                  )}
                </div>

                {/* B. PDF Download */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">PDF downloaden</h3>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={!savedQuoteId || downloading}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:border-brand-300 text-slate-700 font-medium px-4 py-2.5 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download PDF
                  </button>
                  {!savedQuoteId && (
                    <p className="text-xs text-slate-400 mt-1">Offerte wordt opgeslagen bij het doorgaan naar stap 3.</p>
                  )}
                </div>

                {/* C. Share link */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Deelbare link</h3>
                  <button
                    onClick={handleShare}
                    disabled={!savedQuoteId || sharing}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:border-brand-300 text-slate-700 font-medium px-4 py-2.5 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sharing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : copied ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {copied ? "Link gekopieerd!" : "Kopieer deelbare link"}
                  </button>
                  {shareToken && (
                    <div className="mt-2 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`}
                        className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-600 outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* D. Email */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Versturen per e-mail</h3>
                  <div className="space-y-2">
                    <input
                      type="email"
                      defaultValue={form.client_email}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="E-mailadres klant"
                    />
                    <a
                      href={`mailto:${form.client_email}?subject=Offerte ${result?.quote_title || form.project_title}&body=Beste ${form.client_name},%0A%0AHierbij stuur ik u de offerte voor ${result?.quote_title || form.project_title}.%0A%0AMet vriendelijke groet`}
                      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-lg transition text-sm w-full justify-center"
                    >
                      <Send className="w-4 h-4" />
                      Verstuur per e-mail
                    </a>
                  </div>
                </div>

                {/* E. Back + save draft */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleSaveDraft}
                    className="flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium px-4 py-2.5 rounded-lg transition text-sm border border-slate-200"
                  >
                    <FileText className="w-4 h-4" />
                    Opslaan als concept
                  </button>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition justify-center py-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Terug naar aanpassen
                  </button>
                </div>
              </div>

              {/* RIGHT: Final preview */}
              <div className="sm:w-1/2 sm:pl-6 mt-6 sm:mt-0">
                {hasQuote && (
                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                    <QuotePreviewPanel
                      result={result}
                      profile={profile}
                      displayMode={displayMode}
                      marginPct={marginPct}
                      form={{
                        client_name: form.client_name,
                        client_email: form.client_email,
                        project_title: form.project_title,
                        project_location: form.project_location,
                      }}
                    />
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
