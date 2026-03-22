"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DisplayMode } from "@/lib/types";
import { Loader2, LayoutList, Layers, Minimize2 } from "lucide-react";

const MODES: {
  value: DisplayMode;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "open",
    label: "Open begroting",
    description: "Alle regels zichtbaar: uren, materialen, stuksprijzen",
    icon: LayoutList,
  },
  {
    value: "module",
    label: "Per module",
    description: "Omschrijving + totaalprijs per module, geen uitsplitsing",
    icon: Layers,
  },
  {
    value: "hoogover",
    label: "Hoog-over",
    description: "Alleen omschrijving per module + één eindtotaal",
    icon: Minimize2,
  },
];

export function DisplayModePicker({
  quoteId,
  currentMode,
  userId,
}: {
  quoteId: string;
  currentMode: DisplayMode;
  userId: string;
}) {
  const [mode, setMode] = useState<DisplayMode>(currentMode);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  async function handleChange(newMode: DisplayMode) {
    if (newMode === mode || saving) return;
    setSaving(true);
    setSaved(false);

    const { data: quote } = await supabase
      .from("quotes")
      .select("json_data")
      .eq("id", quoteId)
      .eq("user_id", userId)
      .single();

    const updatedJsonData = {
      ...(quote?.json_data ?? {}),
      display_mode: newMode,
    };

    await supabase
      .from("quotes")
      .update({ json_data: updatedJsonData })
      .eq("id", quoteId)
      .eq("user_id", userId);

    setMode(newMode);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            Offerte-smaak (klant-PDF)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bepaal hoeveel detail de klant ziet in de PDF
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        {saved && !saving && (
          <span className="text-xs text-green-600 font-medium">Opgeslagen</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => handleChange(m.value)}
              disabled={saving}
              className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 text-left transition disabled:opacity-50 ${
                isActive
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-brand-600" : "text-slate-400"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    isActive ? "text-brand-700" : "text-slate-700"
                  }`}
                >
                  {m.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                {m.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
