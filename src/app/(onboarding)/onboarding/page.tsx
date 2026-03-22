"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  ImagePlus,
  Euro,
  Sparkles,
  ArrowRight,
  Loader2,
  X,
  Check,
} from "lucide-react";

const STEPS = [
  { label: "Bedrijfsnaam", icon: Building2 },
  { label: "Logo", icon: ImagePlus },
  { label: "Tarieven", icon: Euro },
  { label: "Eerste offerte", icon: Sparkles },
];

const DEMO_TITLE = "Badkamerrenovatie";
const DEMO_DESCRIPTION =
  "Badkamerrenovatie 8m² inclusief tegelwerk, sanitair en afwerking. Oud sanitair verwijderen, nieuwe tegels plaatsen (vloer + wand), douche, toilet en wastafel installeren.";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState(45);
  const [margin, setMargin] = useState(15);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      supabase
        .from("profiles")
        .select("business_name, hourly_rate, margin_percentage, onboarding_completed")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.onboarding_completed) {
            router.replace("/dashboard");
            return;
          }
          if (data?.business_name) setBusinessName(data.business_name);
          if (data?.hourly_rate) setHourlyRate(data.hourly_rate);
          if (data?.margin_percentage) setMargin(data.margin_percentage);
          setLoadingProfile(false);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function nextStep() {
    setStep((s) => Math.min(s + 1, 4));
  }

  async function finishAndGenerate() {
    if (!userId) return;
    setSaving(true);
    try {
      let logoUrl: string | undefined;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${userId}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(path, logoFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("logos")
            .getPublicUrl(path);
          logoUrl = urlData.publicUrl;
        }
      }

      await supabase
        .from("profiles")
        .update({
          business_name: businessName.trim() || undefined,
          hourly_rate: hourlyRate,
          margin_percentage: margin,
          onboarding_completed: true,
          ...(logoUrl ? { logo_url: logoUrl } : {}),
        })
        .eq("id", userId);

      const params = new URLSearchParams({
        title: DEMO_TITLE,
        description: DEMO_DESCRIPTION,
        onboarding: "true",
      });
      router.push(`/quotes/new?${params.toString()}`);
    } finally {
      setSaving(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-2">
        <Image src="/Logo Quoter.svg" alt="Quoter" width={32} height={32} className="rounded-lg" />
        <span className="font-bold text-slate-800 text-lg">Quoter</span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Stap {step} van {STEPS.length}</span>
          <span className="text-sm font-medium text-slate-700">{STEPS[step - 1].label}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i < step ? "bg-blue-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Step 1: Bedrijfsnaam */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-4">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Welkom! Wat is je bedrijfsnaam?</h1>
              <p className="text-slate-500 text-sm mt-1">
                Dit verschijnt op al je offertes.
              </p>
            </div>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && businessName.trim()) nextStep(); }}
              placeholder="Jouw Bedrijf BV"
              autoFocus
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={nextStep}
              disabled={!businessName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition"
            >
              Verder <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Logo */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-4">
                <ImagePlus className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Upload je logo</h1>
              <p className="text-slate-500 text-sm mt-1">
                Je logo verschijnt bovenaan elke offerte. Optioneel — je kunt dit ook later toevoegen.
              </p>
            </div>

            {logoPreview ? (
              <div className="relative flex items-center justify-center border-2 border-slate-200 rounded-xl p-6 bg-slate-50">
                <Image
                  src={logoPreview}
                  alt="Logo preview"
                  width={160}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
                <button
                  onClick={removeLogo}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white border border-slate-200 hover:bg-slate-100 transition"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition">
                <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-600">Klik om een afbeelding te kiezen</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG of SVG</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            )}

            <div className="flex gap-3">
              <button
                onClick={nextStep}
                className="flex-1 text-center text-sm text-slate-500 hover:text-slate-700 py-2 transition"
              >
                Sla over
              </button>
              <button
                onClick={nextStep}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition"
              >
                Verder <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Tarieven */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-4">
                <Euro className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Stel je tarieven in</h1>
              <p className="text-slate-500 text-sm mt-1">
                De AI gebruikt deze waarden bij het berekenen van je offertes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Uurtarief (excl. BTW)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg pl-8 pr-16 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/uur</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Standaard: €45/uur</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Winstmarge op materialen
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg pl-4 pr-10 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Standaard: 15%</p>
              </div>
            </div>

            <button
              onClick={nextStep}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition"
            >
              Verder <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 4: Eerste offerte */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Klaar om te starten!</h1>
              <p className="text-slate-500 text-sm mt-1">
                We genereren een voorbeeldofferte voor een badkamerrenovatie. Je kunt de omschrijving direct aanpassen naar je eigen project.
              </p>
            </div>

            {/* Demo preview */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Demo-project</p>
              <p className="font-semibold text-slate-800">{DEMO_TITLE}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{DEMO_DESCRIPTION}</p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Je kunt de omschrijving aanpassen of meteen de AI laten genereren.
              </p>
            </div>

            <button
              onClick={finishAndGenerate}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-6 py-3 rounded-lg transition"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Even geduld...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Genereer mijn eerste offerte</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Skip link */}
      {step < 4 && (
        <button
          onClick={async () => {
            if (!userId) return;
            await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
            router.push("/dashboard");
          }}
          className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition"
        >
          Sla onboarding over
        </button>
      )}
    </div>
  );
}
