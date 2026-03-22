"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DisplayMode } from "@/lib/types";
import { Loader2, LayoutList, Layers, Minimize2, Check } from "lucide-react";

const MODES: {
  value: DisplayMode;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "open",
    label: "Open begroting",
    description: "Alle regels zichtbaar",
    icon: LayoutList,
  },
  {
    value: "module",
    label: "Per module",
    description: "Totaalprijs per onderdeel",
    icon: Layers,
  },
  {
    value: "hoogover",
    label: "Hoog-over",
    description: "Alleen eindtotaal",
    icon: Minimize2,
  },
];

// ─── Mini preview illustrations ───────────────────────────────────────────────

function Bar({ w, light }: { w: string; light?: boolean }) {
  return (
    <div
      className={`h-1.5 rounded-full ${light ? "bg-slate-200" : "bg-slate-300"}`}
      style={{ width: w }}
    />
  );
}

function PreviewOpen() {
  const rows = [
    { label: "Sloopwerk bestaande...", type: "Arbeid", qty: "4 uur", price: "€ 180,-" },
    { label: "Cementdekvloer", type: "Materiaal", qty: "1 zak", price: "€ 22,-" },
    { label: "Tegelwerk vloer", type: "Arbeid", qty: "6 uur", price: "€ 270,-" },
    { label: "Wandtegels plaatsen", type: "Arbeid", qty: "4 uur", price: "€ 180,-" },
  ];
  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 pb-1 border-b border-slate-200">
        {["Omschrijving", "Type", "Qty", "Prijs"].map((h) => (
          <span key={h} className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
          <span className="text-[9px] text-slate-600 truncate">{r.label}</span>
          <span className="text-[9px] text-slate-400">{r.type}</span>
          <span className="text-[9px] text-slate-400">{r.qty}</span>
          <span className="text-[9px] text-slate-600 font-medium">{r.price}</span>
        </div>
      ))}
      <div className="flex justify-end pt-1 border-t border-slate-200">
        <span className="text-[9px] font-bold text-slate-700">Totaal € 652,-</span>
      </div>
    </div>
  );
}

function PreviewModule() {
  const rows = [
    { label: "Sloop & voorbereiding", price: "€ 225,-" },
    { label: "Tegelwerk", price: "€ 472,-" },
    { label: "Sanitair installatie", price: "€ 890,-" },
  ];
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_auto] gap-2 pb-1 border-b border-slate-200">
        {["Module", "Totaal"].map((h) => (
          <span key={h} className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <span className="text-[9px] text-slate-600">{r.label}</span>
          <span className="text-[9px] text-slate-600 font-medium">{r.price}</span>
        </div>
      ))}
      <div className="flex justify-between pt-1 border-t border-slate-200">
        <span className="text-[9px] text-slate-400">Subtotaal excl. BTW</span>
        <span className="text-[9px] font-bold text-slate-700">€ 1.587,-</span>
      </div>
    </div>
  );
}

function PreviewHoogover() {
  return (
    <div className="space-y-2">
      {[
        { title: "Sloop & voorbereiding", lines: ["Verwijderen bestaande tegels...", "Afvoer bouwafval..."] },
        { title: "Tegelwerk", lines: ["Nieuwe vloertegels plaatsen...", "Wandtegels aanbrengen..."] },
      ].map((m, i) => (
        <div key={i} className="space-y-0.5">
          <span className="text-[9px] font-semibold text-slate-700">{m.title}</span>
          {m.lines.map((l, j) => (
            <div key={j} className="flex items-center gap-1">
              <span className="text-[8px] text-slate-400">•</span>
              <Bar w="80%" light />
            </div>
          ))}
        </div>
      ))}
      <div className="flex justify-end pt-1.5 border-t border-slate-200">
        <div className="text-right">
          <span className="text-[9px] text-slate-400 block">Geen prijsspecificatie</span>
          <span className="text-[9px] font-bold text-slate-700">Totaalprijs € 1.890,-</span>
        </div>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

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
            Bepaal hoeveel detail de klant ziet
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        {saved && !saving && (
          <span className="text-xs text-green-600 font-medium">Opgeslagen</span>
        )}
      </div>

      {/* Mode buttons */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => handleChange(m.value)}
              disabled={saving}
              className={`relative flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition disabled:opacity-50 ${
                isActive
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {isActive && (
                <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
              )}
              <Icon
                className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`}
              />
              <span
                className={`text-xs font-semibold leading-tight ${
                  isActive ? "text-blue-700" : "text-slate-700"
                }`}
              >
                {m.label}
              </span>
              <p className="text-[10px] text-slate-400 leading-snug">
                {m.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Live preview */}
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Voorbeeld — wat de klant ziet
        </p>
        <div className="transition-all duration-200">
          {mode === "open" && <PreviewOpen />}
          {mode === "module" && <PreviewModule />}
          {mode === "hoogover" && <PreviewHoogover />}
        </div>
      </div>
    </div>
  );
}
