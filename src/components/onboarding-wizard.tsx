"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  MapPin,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Loader2,
} from "lucide-react";
import type { Profile } from "@/lib/types";

interface OnboardingWizardProps {
  initialProfile: Partial<Profile>;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  {
    id: 0,
    title: "Jouw bedrijf",
    description: "Hoe heet jouw bedrijf?",
    icon: Building2,
  },
  {
    id: 1,
    title: "Adres & Contact",
    description: "Waar zijn jullie gevestigd?",
    icon: MapPin,
  },
  {
    id: 2,
    title: "Registratie",
    description: "KVK, BTW en betaalgegevens",
    icon: FileText,
  },
  {
    id: 3,
    title: "Werkvoorkeuren",
    description: "Stel je standaard tarieven in",
    icon: SlidersHorizontal,
  },
];

export function OnboardingWizard({
  initialProfile,
  onClose,
  onComplete,
}: OnboardingWizardProps) {
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    business_name: initialProfile.business_name ?? "",
    business_address: initialProfile.business_address ?? "",
    business_postal_code: initialProfile.business_postal_code ?? "",
    business_city: initialProfile.business_city ?? "",
    business_phone: initialProfile.business_phone ?? "",
    business_email: initialProfile.business_email ?? "",
    kvk_number: initialProfile.kvk_number ?? "",
    btw_number: initialProfile.btw_number ?? "",
    iban: initialProfile.iban ?? "",
    hourly_rate: initialProfile.hourly_rate ?? 45,
    margin_percentage: initialProfile.margin_percentage ?? 15,
  });

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  function validateStep(step: number): string | null {
    if (step === 0 && !form.business_name.trim()) {
      return "Vul je bedrijfsnaam in.";
    }
    if (step === 1) {
      if (!form.business_address.trim()) return "Vul het adres in.";
      if (!form.business_postal_code.trim()) return "Vul de postcode in.";
      if (!form.business_city.trim()) return "Vul de plaatsnaam in.";
      if (!form.business_phone.trim()) return "Vul het telefoonnummer in.";
      if (!form.business_email.trim()) return "Vul het e-mailadres in.";
    }
    if (step === 2 && !form.kvk_number.trim()) {
      return "Vul je KVK-nummer in.";
    }
    return null;
  }

  async function saveProgress() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: saveErr } = await supabase
      .from("profiles")
      .update({
        business_name: form.business_name || null,
        business_address: form.business_address || null,
        business_postal_code: form.business_postal_code || null,
        business_city: form.business_city || null,
        business_phone: form.business_phone || null,
        business_email: form.business_email || null,
        kvk_number: form.kvk_number || null,
        btw_number: form.btw_number || null,
        iban: form.iban || null,
        hourly_rate: Number(form.hourly_rate),
        margin_percentage: Number(form.margin_percentage),
      })
      .eq("id", user.id);

    if (saveErr) throw new Error(saveErr.message);
  }

  async function handleNext() {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveProgress();
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        onComplete();
      }
    } catch {
      setError("Er ging iets mis bij het opslaan. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    setError(null);
    setCurrentStep((s) => s - 1);
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === STEPS.length - 1;
  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Stap {currentStep + 1} van {STEPS.length}
              </p>
              <h2 className="text-lg font-bold text-white">
                {STEPS[currentStep].title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition mt-0.5"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200">
          <div
            className="h-1.5 bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex px-6 pt-4 gap-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  i < currentStep
                    ? "bg-brand-500 text-white"
                    : i === currentStep
                    ? "bg-brand-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium truncate hidden sm:block ${
                  i <= currentStep ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {step.title}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 mx-1 hidden sm:block ${
                    i < currentStep ? "bg-brand-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form content */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-500">{STEPS[currentStep].description}</p>

          {/* Step 0: Bedrijfsnaam */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Bedrijfsnaam <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={form.business_name}
                  onChange={(e) => update("business_name", e.target.value)}
                  placeholder="bijv. Bouwbedrijf De Vries"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                <p className="text-xs text-brand-700">
                  Je bedrijfsnaam verschijnt bovenaan al je offertes. Je kunt dit later altijd aanpassen in Instellingen.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Adres & Contact */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Straat en huisnummer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={form.business_address}
                  onChange={(e) => update("business_address", e.target.value)}
                  placeholder="bijv. Hoofdstraat 12"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.business_postal_code}
                    onChange={(e) => update("business_postal_code", e.target.value)}
                    placeholder="1234 AB"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Plaatsnaam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.business_city}
                    onChange={(e) => update("business_city", e.target.value)}
                    placeholder="bijv. Amsterdam"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Telefoonnummer <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.business_phone}
                  onChange={(e) => update("business_phone", e.target.value)}
                  placeholder="bijv. 06-12345678"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  E-mailadres <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.business_email}
                  onChange={(e) => update("business_email", e.target.value)}
                  placeholder="bijv. info@bedrijf.nl"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 2: Registratie */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  KVK-nummer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={form.kvk_number}
                  onChange={(e) => update("kvk_number", e.target.value)}
                  placeholder="bijv. 12345678"
                  maxLength={8}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  BTW-nummer <span className="text-slate-400 font-normal">(optioneel)</span>
                </label>
                <input
                  type="text"
                  value={form.btw_number}
                  onChange={(e) => update("btw_number", e.target.value)}
                  placeholder="bijv. NL123456789B01"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  IBAN <span className="text-slate-400 font-normal">(optioneel)</span>
                </label>
                <input
                  type="text"
                  value={form.iban}
                  onChange={(e) => update("iban", e.target.value)}
                  placeholder="bijv. NL91ABNA0417164300"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 3: Werkvoorkeuren */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Standaard uurtarief (excl. BTW)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
                  <input
                    type="number"
                    autoFocus
                    min={0}
                    value={form.hourly_rate}
                    onChange={(e) => update("hourly_rate", parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Dit wordt als standaard gebruikt bij het genereren van offertes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Standaard marge: <span className="text-brand-600 font-bold">{form.margin_percentage}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={form.margin_percentage}
                  onChange={(e) => update("margin_percentage", parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="text-xs text-green-700">
                  Gefeliciteerd! Na deze stap is je profiel compleet en kun je direct professionele offertes genereren.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <div>
            {currentStep > 0 ? (
              <button
                onClick={handleBack}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Terug
              </button>
            ) : (
              <button
                onClick={onClose}
                className="text-sm text-slate-400 hover:text-slate-600 transition px-2 py-1"
              >
                Later invullen
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opslaan...
              </>
            ) : isLastStep ? (
              <>
                <Check className="w-4 h-4" />
                Voltooien
              </>
            ) : (
              <>
                Volgende
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
