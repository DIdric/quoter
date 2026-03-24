"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";

interface QuoteModule {
  name: string;
  intro: string;
  items: string[];
}

interface QuoteLine {
  category: string;
  description: string;
  type: "arbeid" | "materiaal";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export function EditableModuleDescriptions({
  quoteId,
  modules,
  userId,
}: {
  quoteId: string;
  modules: QuoteModule[];
  userId: string;
}) {
  const [localModules, setLocalModules] = useState<QuoteModule[]>(modules);
  const [savingField, setSavingField] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const readQuoteData = useCallback(async () => {
    const { data: quote } = await supabase
      .from("quotes")
      .select("json_data")
      .eq("id", quoteId)
      .eq("user_id", userId)
      .single();
    return quote;
  }, [quoteId, userId, supabase]);

  const saveModules = useCallback(
    async (updated: QuoteModule[]) => {
      const quote = await readQuoteData();
      if (!quote) return;

      const jsonData = (quote.json_data as Record<string, unknown>) || {};
      const result = (jsonData.result as Record<string, unknown>) || {};

      await supabase
        .from("quotes")
        .update({
          json_data: { ...jsonData, result: { ...result, modules: updated } },
        })
        .eq("id", quoteId)
        .eq("user_id", userId);
    },
    [quoteId, userId, supabase, readQuoteData]
  );

  const updateIntro = (modIndex: number, value: string) => {
    setLocalModules((prev) =>
      prev.map((m, i) => (i === modIndex ? { ...m, intro: value } : m))
    );
  };

  const updateItem = (modIndex: number, itemIndex: number, value: string) => {
    setLocalModules((prev) =>
      prev.map((m, i) => {
        if (i !== modIndex) return m;
        const items = m.items.map((item, j) =>
          j === itemIndex ? value : item
        );
        return { ...m, items };
      })
    );
  };

  const removeItem = useCallback(
    async (modIndex: number, itemIndex: number) => {
      const moduleName = localModules[modIndex].name;
      const removedText = localModules[modIndex].items[itemIndex];

      const updatedModules = localModules.map((m, i) => {
        if (i !== modIndex) return m;
        return { ...m, items: m.items.filter((_, j) => j !== itemIndex) };
      });
      setLocalModules(updatedModules);

      const quote = await readQuoteData();
      if (!quote) return;

      const jsonData = (quote.json_data as Record<string, unknown>) || {};
      const result = (jsonData.result as Record<string, unknown>) || {};
      const currentLines = (result.lines as QuoteLine[]) || [];

      // Remove matching price line (exact description match, same category)
      const updatedLines = removedText
        ? currentLines.filter(
            (l) => !(l.category === moduleName && l.description === removedText)
          )
        : currentLines;

      await supabase
        .from("quotes")
        .update({
          json_data: {
            ...jsonData,
            result: { ...result, modules: updatedModules, lines: updatedLines },
          },
        })
        .eq("id", quoteId)
        .eq("user_id", userId);

      router.refresh();
    },
    [localModules, quoteId, userId, supabase, readQuoteData, router]
  );

  const addItem = useCallback(
    async (modIndex: number) => {
      const moduleName = localModules[modIndex].name;

      const updatedModules = localModules.map((m, i) => {
        if (i !== modIndex) return m;
        return { ...m, items: [...m.items, ""] };
      });
      setLocalModules(updatedModules);

      const quote = await readQuoteData();
      if (!quote) return;

      const jsonData = (quote.json_data as Record<string, unknown>) || {};
      const result = (jsonData.result as Record<string, unknown>) || {};
      const currentLines = (result.lines as QuoteLine[]) || [];

      // Add matching empty price line in the same category
      const newLine: QuoteLine = {
        category: moduleName,
        description: "",
        type: "arbeid",
        quantity: 1,
        unit: "uur",
        unit_price: 0,
        total: 0,
      };

      await supabase
        .from("quotes")
        .update({
          json_data: {
            ...jsonData,
            result: {
              ...result,
              modules: updatedModules,
              lines: [...currentLines, newLine],
            },
          },
        })
        .eq("id", quoteId)
        .eq("user_id", userId);

      router.refresh();
    },
    [localModules, quoteId, userId, supabase, readQuoteData, router]
  );

  const handleIntroBlur = useCallback(
    async (modIndex: number) => {
      setSavingField(`intro-${modIndex}`);
      await saveModules(localModules);
      setSavingField(null);
    },
    [localModules, saveModules]
  );

  const handleItemBlur = useCallback(
    async (modIndex: number) => {
      setSavingField(`items-${modIndex}`);
      await saveModules(localModules);
      setSavingField(null);
    },
    [localModules, saveModules]
  );

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-800">
        Technische omschrijving per module
      </h4>
      {localModules.map((mod, modIndex) => (
        <div
          key={modIndex}
          className="bg-slate-50 border border-slate-200 rounded-lg p-4"
        >
          <h5 className="font-medium text-slate-700 mb-2">{mod.name}</h5>

          {/* Editable intro */}
          <div className="relative mb-3">
            <textarea
              value={mod.intro}
              onChange={(e) => updateIntro(modIndex, e.target.value)}
              onBlur={() => handleIntroBlur(modIndex)}
              rows={3}
              className="w-full px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
            />
            {savingField === `intro-${modIndex}` && (
              <span className="absolute bottom-2 right-2 text-xs text-slate-400">
                opslaan...
              </span>
            )}
          </div>

          {/* Editable bullet items */}
          <ul className="space-y-1.5">
            {mod.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex items-center gap-2">
                <span className="text-slate-400 shrink-0">•</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) =>
                    updateItem(modIndex, itemIndex, e.target.value)
                  }
                  onBlur={() => handleItemBlur(modIndex)}
                  className="flex-1 px-2 py-1 text-sm text-slate-600 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={() => removeItem(modIndex, itemIndex)}
                  className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                  title="Verwijder regel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
            {savingField === `items-${modIndex}` && (
              <li className="text-xs text-slate-400 pl-5">opslaan...</li>
            )}
            <li>
              <button
                type="button"
                onClick={() => addItem(modIndex)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 transition-colors mt-1 pl-5"
              >
                <Plus className="w-3.5 h-3.5" />
                Regel toevoegen
              </button>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}
