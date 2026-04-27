"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1
  business_postal_code: string;
  business_city: string;
  business_phone: string;
  // Step 2
  hourly_rate: number;
  margin_percentage: number;
  quote_validity_days: number;
  estimation_style: "voorzichtig" | "realistisch" | "scherp";
  // Step 3
  whatsapp_opt_in: boolean;
  whatsapp_number: string;
  email_opt_in: boolean;
}

const VALIDITY_OPTIONS = [14, 30, 60, 90];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    business_postal_code: "",
    business_city: "",
    business_phone: "",
    hourly_rate: 45,
    margin_percentage: 15,
    quote_validity_days: 30,
    estimation_style: "realistisch",
    whatsapp_opt_in: false,
    whatsapp_number: "",
    email_opt_in: false,
  });

  async function saveStep(fields: Partial<FormData>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
    if (error) { setError(error.message); return false; }
    return true;
  }

  async function handleNext() {
    setError(null);
    setSaving(true);

    if (step === 1) {
      const ok = await saveStep({
        business_postal_code: form.business_postal_code || null,
        business_city: form.business_city || null,
        business_phone: form.business_phone || null,
      } as Partial<FormData>);
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = await saveStep({
        hourly_rate: form.hourly_rate,
        margin_percentage: form.margin_percentage,
        quote_validity_days: form.quote_validity_days,
        estimation_style: form.estimation_style,
      });
      if (ok) setStep(3);
    }

    setSaving(false);
  }

  async function handleFinish() {
    if (!form.whatsapp_opt_in && !form.email_opt_in) {
      setError("Kies minimaal één communicatiekanaal om door te gaan.");
      return;
    }
    if (form.whatsapp_opt_in && !form.whatsapp_number.trim()) {
      setError("Vul je WhatsApp nummer in.");
      return;
    }

    setError(null);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("profiles").update({
      whatsapp_opt_in: form.whatsapp_opt_in,
      whatsapp_number: form.whatsapp_opt_in ? form.whatsapp_number.trim() : null,
      email_opt_in: form.email_opt_in,
      onboarding_completed: true,
    }).eq("id", user.id);

    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Logo */}
      <div className="text-center mb-8">
        <Image src="/Logo Quoter.svg" alt="Quoter" width={160} height={46} priority />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                s < step
                  ? "bg-brand-500 text-white"
                  : s === step
                  ? "bg-brand-500 text-white ring-4 ring-brand-100"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
            {s < 3 && (
              <div className={`h-0.5 flex-1 ${s < step ? "bg-brand-500" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        {step === 1 && (
          <>
            <h1 className="text-xl font-bold text-slate-800 mb-1">Je bedrijf</h1>
            <p className="text-sm text-slate-500 mb-6">
              Dit helpt ons je offertes personaliseren. Je kunt dit later aanpassen.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Postcode <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.business_postal_code}
                    onChange={(e) => setForm({ ...form, business_postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                    placeholder="1032 LS"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plaats
                  </label>
                  <input
                    type="text"
                    value={form.business_city}
                    onChange={(e) => setForm({ ...form, business_city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                    placeholder="Amsterdam"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefoonnummer
                </label>
                <input
                  type="tel"
                  value={form.business_phone}
                  onChange={(e) => setForm({ ...form, business_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                  placeholder="06 12345678"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-xl font-bold text-slate-800 mb-1">Hoe jij werkt</h1>
            <p className="text-sm text-slate-500 mb-6">
              We gebruiken dit als standaard voor je offertes. Altijd aanpasbaar per offerte.
            </p>

            <div className="space-y-5">
              {/* Uurtarief */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Uurtarief</label>
                  <span className="text-sm font-semibold text-brand-600">€ {form.hourly_rate}</span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={150}
                  step={5}
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>€25</span><span>€150</span>
                </div>
              </div>

              {/* Marge */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Marge</label>
                  <span className="text-sm font-semibold text-brand-600">{form.margin_percentage}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={40}
                  step={1}
                  value={form.margin_percentage}
                  onChange={(e) => setForm({ ...form, margin_percentage: Number(e.target.value) })}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>5%</span><span>40%</span>
                </div>
              </div>

              {/* Geldigheid */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Offerte geldigheid
                </label>
                <div className="flex gap-2">
                  {VALIDITY_OPTIONS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setForm({ ...form, quote_validity_days: days })}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                        form.quote_validity_days === days
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Schattingsstijl */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Schattingsstijl
                </label>
                <div className="flex gap-2">
                  {(["voorzichtig", "realistisch", "scherp"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setForm({ ...form, estimation_style: style })}
                      className={`flex-1 py-2 px-1 rounded-lg border text-sm font-medium transition capitalize ${
                        form.estimation_style === style
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                      }`}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Bepaalt hoe ruim de AI arbeidsuren inschat. Realistisch is marktconform.
                </p>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-xl font-bold text-slate-800 mb-1">Hoe we contact houden</h1>
            <p className="text-sm text-slate-500 mb-6">
              We sturen je tips en updates via jouw voorkeurskanaal. Maximaal 1 bericht per week.
            </p>

            <div className="space-y-4">
              {/* WhatsApp */}
              <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition hover:border-brand-200 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="checkbox"
                  checked={form.whatsapp_opt_in}
                  onChange={(e) => setForm({ ...form, whatsapp_opt_in: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-brand-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    Stuur mij tips en updates via WhatsApp
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Maximaal 1 bericht per week. Je kunt je altijd afmelden.
                  </div>
                </div>
              </label>

              {form.whatsapp_opt_in && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Jouw WhatsApp nummer <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.whatsapp_number}
                    onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                    placeholder="06 12345678"
                    autoFocus
                  />
                </div>
              )}

              {/* Email */}
              <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition hover:border-brand-200 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="checkbox"
                  checked={form.email_opt_in}
                  onChange={(e) => setForm({ ...form, email_opt_in: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-brand-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    Stuur mij het laatste nieuws over Quoter per e-mail
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Geen spam. Alleen wat relevant is voor jouw werk.
                  </div>
                </div>
              </label>

              <p className="text-xs text-slate-400 text-center pt-1">
                Je kiest je eigen kanaal. Minimaal één is verplicht.
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Vorige
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving || (step === 1 && !form.business_postal_code.trim())}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Volgende
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Aan de slag
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Stap {step} van 3
      </p>
    </div>
  );
}
