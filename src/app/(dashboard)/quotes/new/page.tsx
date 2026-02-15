"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  User,
  FileText,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";

const steps = [
  { label: "Klantgegevens", icon: User },
  { label: "Projectdetails", icon: FileText },
  { label: "AI Generatie", icon: Sparkles },
];

export default function NewQuotePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
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
  const supabase = createClient();

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
      setResult({ error: "Er is iets misgegaan bij het genereren." });
    }
    setLoading(false);
  }

  async function handleSaveQuote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("quotes").insert({
      user_id: user.id,
      client_name: form.client_name,
      status: "draft",
      json_data: { form, result },
    });

    router.push("/projects");
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push("/projects")}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Nieuwe Offerte</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center transition ${
                i === currentStep
                  ? "bg-orange-500 text-white"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-800"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-800"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-800"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-800"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-800"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none text-slate-800"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none text-slate-800"
                placeholder="Bijv: Ik moet een badkamer van 3x4 meter volledig strippen en opnieuw betegelen. Inclusief nieuwe douche, toilet en wastafel. Vloerverwarming aanleggen."
              />
            </div>

            {!result && (
              <button
                onClick={handleGenerate}
                disabled={loading || !form.ai_input}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Offerte Genereren
                  </>
                )}
              </button>
            )}

            {result && (
              <div className="mt-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-800 mb-2">
                    Resultaat
                  </h3>
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
                <button
                  onClick={handleSaveQuote}
                  className="mt-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg transition"
                >
                  <Check className="w-4 h-4" />
                  Offerte Opslaan als Concept
                </button>
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
          {currentStep < steps.length - 1 && (
            <button
              onClick={() =>
                setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
              }
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition"
            >
              Volgende
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
