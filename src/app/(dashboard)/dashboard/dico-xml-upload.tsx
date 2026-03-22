"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileCode2, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";

export function DicoXmlUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; supplier?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/parse-pricelist", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Verwerking mislukt");
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Upsert into materials
    const { data: existing } = await supabase
      .from("materials")
      .select("id, name")
      .eq("user_id", user.id);

    const existingMap = new Map(
      (existing ?? []).map((m: { id: string; name: string }) => [m.name.toLowerCase(), m.id])
    );

    interface ParsedProduct { name: string; unit: string; price_excl_vat: number; }
    const toUpdate: { id: string; unit: string; cost_price: number }[] = [];
    const toInsert: { name: string; unit: string; cost_price: number; user_id: string }[] = [];

    for (const p of data.products as ParsedProduct[]) {
      const existingId = existingMap.get(p.name.toLowerCase());
      if (existingId) {
        toUpdate.push({ id: existingId, unit: p.unit, cost_price: p.price_excl_vat });
      } else {
        toInsert.push({ name: p.name, unit: p.unit, cost_price: p.price_excl_vat, user_id: user.id });
      }
    }

    for (const item of toUpdate) {
      await supabase.from("materials").update({ unit: item.unit, cost_price: item.cost_price })
        .eq("id", item.id).eq("user_id", user.id);
    }
    if (toInsert.length > 0) {
      await supabase.from("materials").insert(toInsert);
    }

    setResult({ imported: data.imported, skipped: data.skipped, supplier: data.supplier_name || undefined });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCode2 className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-slate-800">DICO Prijslijst</h2>
          </div>
          <p className="text-sm text-slate-500">
            Upload een XML-bestand van je groothandel (Bouwmaat, Warmteservice, TU, Rexel) om je materiaalkosten bij te werken.
          </p>
        </div>
        <label className={`flex items-center gap-2 shrink-0 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 rounded-lg transition cursor-pointer text-sm ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
          {uploading ? "Bezig…" : "XML uploaden"}
          <input ref={inputRef} type="file" accept=".xml" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {result && (
        <div className="mt-3 flex items-start gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">
            <strong>{result.imported} artikelen</strong> geïmporteerd
            {result.supplier ? ` van ${result.supplier}` : ""}.
            {result.skipped > 0 && ` ${result.skipped} overgeslagen.`}
          </span>
          <button onClick={() => setResult(null)}>
            <X className="w-4 h-4 text-green-600 hover:text-green-800" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4 text-red-600 hover:text-red-800" />
          </button>
        </div>
      )}
    </div>
  );
}
