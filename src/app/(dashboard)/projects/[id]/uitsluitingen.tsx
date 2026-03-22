"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Plus, X, Check, Loader2 } from "lucide-react";

export function Uitsluitingen({
  quoteId,
  userId,
  initialSuggestions,
  initialUitsluitingen,
}: {
  quoteId: string;
  userId: string;
  initialSuggestions: string[];
  initialUitsluitingen: string[];
}) {
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions);
  const [uitsluitingen, setUitsluitingen] = useState<string[]>(initialUitsluitingen);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const save = useCallback(
    async (newSuggestions: string[], newUitsluitingen: string[]) => {
      setSaving(true);
      const { data: quote } = await supabase
        .from("quotes")
        .select("json_data")
        .eq("id", quoteId)
        .eq("user_id", userId)
        .single();

      const jsonData = (quote?.json_data as Record<string, unknown>) ?? {};
      const result = (jsonData.result as Record<string, unknown>) ?? {};

      await supabase
        .from("quotes")
        .update({
          json_data: {
            ...jsonData,
            result: {
              ...result,
              uitsluitingen: newUitsluitingen,
              uitsluitingen_suggestions: newSuggestions,
            },
          },
        })
        .eq("id", quoteId)
        .eq("user_id", userId);

      setSaving(false);
    },
    [quoteId, userId, supabase]
  );

  function acceptSuggestion(text: string, index: number) {
    const newS = suggestions.filter((_, i) => i !== index);
    const newU = [...uitsluitingen, text];
    setSuggestions(newS);
    setUitsluitingen(newU);
    save(newS, newU);
  }

  function dismissSuggestion(index: number) {
    const newS = suggestions.filter((_, i) => i !== index);
    setSuggestions(newS);
    save(newS, uitsluitingen);
  }

  function removeUitsluiting(index: number) {
    const newU = uitsluitingen.filter((_, i) => i !== index);
    setUitsluitingen(newU);
    save(suggestions, newU);
  }

  function addCustom() {
    const text = newItem.trim();
    if (!text) return;
    const newU = [...uitsluitingen, text];
    setUitsluitingen(newU);
    setNewItem("");
    save(suggestions, newU);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Uitsluitingen
        </h2>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {/* AI suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <p className="text-xs text-brand-600 font-medium">
              AI-suggesties — klik ✓ om toe te voegen
            </p>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-slate-700 flex-1">{s}</span>
                <button
                  onClick={() => acceptSuggestion(s, i)}
                  className="shrink-0 p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition"
                  title="Accepteren"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => dismissSuggestion(i)}
                  className="shrink-0 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                  title="Verwijderen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted uitsluitingen */}
      {uitsluitingen.length > 0 && (
        <ol className="space-y-1.5 mb-4 list-none">
          {uitsluitingen.map((u, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-slate-700 flex-1">{u}</span>
              <button
                onClick={() => removeUitsluiting(i)}
                className="shrink-0 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition"
                title="Verwijderen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* Add custom */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Eigen uitsluiting toevoegen..."
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-700 placeholder:text-slate-400"
        />
        <button
          onClick={addCustom}
          disabled={!newItem.trim()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          Toevoegen
        </button>
      </div>

      {suggestions.length === 0 && uitsluitingen.length === 0 && (
        <p className="text-xs text-slate-400 mt-2">
          Geen AI-suggesties. Voeg uitsluitingen handmatig toe.
        </p>
      )}
    </div>
  );
}
