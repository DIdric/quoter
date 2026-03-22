"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Package,
  Wrench,
  Euro,
  Pencil,
  Save,
  X,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import { VoiceInput } from "@/components/voice-input";

interface QuoteLine {
  category: string;
  description: string;
  type: "arbeid" | "materiaal";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface QuoteResult {
  quote_title: string;
  summary: string;
  lines: QuoteLine[];
  subtotal_materials: number;
  subtotal_labor: number;
  margin_amount: number;
  total_excl_btw: number;
  btw_amount: number;
  total_incl_btw: number;
  estimated_days: number;
  notes: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function recalcTotals(
  lines: QuoteLine[],
  marginPct: number
): Pick<
  QuoteResult,
  | "subtotal_materials"
  | "subtotal_labor"
  | "margin_amount"
  | "total_excl_btw"
  | "btw_amount"
  | "total_incl_btw"
> {
  const subtotal_materials = lines
    .filter((l) => l.type === "materiaal")
    .reduce((sum, l) => sum + l.total, 0);
  const subtotal_labor = lines
    .filter((l) => l.type === "arbeid")
    .reduce((sum, l) => sum + l.total, 0);
  const base = subtotal_materials + subtotal_labor;
  const margin_amount = Math.round(base * (marginPct / 100) * 100) / 100;
  const total_excl_btw = Math.round((base + margin_amount) * 100) / 100;
  const btw_amount = Math.round(total_excl_btw * 0.21 * 100) / 100;
  const total_incl_btw = Math.round((total_excl_btw + btw_amount) * 100) / 100;
  return {
    subtotal_materials,
    subtotal_labor,
    margin_amount,
    total_excl_btw,
    btw_amount,
    total_incl_btw,
  };
}

export function EditableQuoteLines({
  quoteId,
  result,
  isDraft,
  marginPercentage,
  userId,
}: {
  quoteId: string;
  result: QuoteResult;
  isDraft: boolean;
  marginPercentage: number;
  userId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<QuoteLine[]>(result.lines);
  const [totals, setTotals] = useState(recalcTotals(result.lines, marginPercentage));
  const router = useRouter();
  const supabase = createClient();

  const categories = [...new Set(lines.map((l) => l.category))];

  const updateLine = useCallback(
    (index: number, field: keyof QuoteLine, value: string | number) => {
      setLines((prev) => {
        const next = prev.map((l, i) => {
          if (i !== index) return l;
          const updated = { ...l, [field]: value };
          if (field === "quantity" || field === "unit_price") {
            const qty = field === "quantity" ? Number(value) : l.quantity;
            const price = field === "unit_price" ? Number(value) : l.unit_price;
            updated.total = Math.round(qty * price * 100) / 100;
          }
          return updated;
        });
        setTotals(recalcTotals(next, marginPercentage));
        return next;
      });
    },
    [marginPercentage]
  );

  const removeLine = useCallback(
    (index: number) => {
      setLines((prev) => {
        const next = prev.filter((_, i) => i !== index);
        setTotals(recalcTotals(next, marginPercentage));
        return next;
      });
    },
    [marginPercentage]
  );

  const addLine = useCallback(
    (category: string, type: "arbeid" | "materiaal") => {
      setLines((prev) => {
        const next = [
          ...prev,
          {
            category,
            description: "",
            type,
            quantity: 1,
            unit: type === "arbeid" ? "uur" : "stuk",
            unit_price: 0,
            total: 0,
          },
        ];
        setTotals(recalcTotals(next, marginPercentage));
        return next;
      });
    },
    [marginPercentage]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedResult: QuoteResult = {
        ...result,
        lines,
        ...totals,
      };

      const { data: quote } = await supabase
        .from("quotes")
        .select("json_data")
        .eq("id", quoteId)
        .eq("user_id", userId)
        .single();

      if (!quote) throw new Error("Quote not found");

      const jsonData = (quote.json_data as Record<string, unknown>) || {};

      await supabase
        .from("quotes")
        .update({
          json_data: { ...jsonData, result: updatedResult },
        })
        .eq("id", quoteId)
        .eq("user_id", userId);

      // ── Feedback loop: sla significante hoeveelheidscorrecties op ──────────
      const corrections = result.lines.flatMap((original) => {
        const edited = lines.find(
          (l) => l.description === original.description && l.category === original.category
        );
        if (!edited || original.quantity === 0) return [];
        const ratio = edited.quantity / original.quantity;
        // Alleen opslaan als de afwijking meer dan 20% is
        if (ratio >= 0.8 && ratio <= 1.25) return [];
        return [{
          user_id: userId,
          category: original.category,
          description: original.description,
          unit: original.unit,
          ai_quantity: original.quantity,
          corrected_quantity: edited.quantity,
        }];
      });

      if (corrections.length > 0) {
        await supabase.from("quote_corrections").insert(corrections);
      }

      setEditing(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to save quote lines:", err);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setLines(result.lines);
    setTotals(recalcTotals(result.lines, marginPercentage));
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Lines grouped by category */}
      {categories.map((category) => {
        const categoryLines = lines
          .map((l, i) => ({ ...l, _index: i }))
          .filter((l) => l.category === category);
        const categoryType = categoryLines[0]?.type ?? "materiaal";

        return (
          <div key={category}>
            {/* Sticky category header with per-category edit button */}
            <div className="sticky top-12 lg:top-2 z-10 bg-slate-50/95 backdrop-blur-sm rounded-lg mb-2 flex items-center justify-between py-1.5 px-1">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                {categoryType === "materiaal" ? (
                  <Package className="w-4 h-4 text-blue-500" />
                ) : (
                  <Wrench className="w-4 h-4 text-brand-500" />
                )}
                {category}
              </h3>
              <div className="flex items-center gap-1.5">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 hover:bg-brand-50 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Bewerken
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Annuleren
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-xs bg-brand-500 hover:bg-brand-600 text-white font-medium px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Opslaan
                    </button>
                  </div>
                )}
              </div>
            </div>
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
                    {editing && (
                      <th className="w-10 px-2 py-2" />
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryLines.map((line) => (
                    <tr key={line._index} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-800">
                        {editing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) =>
                                updateLine(line._index, "description", e.target.value)
                              }
                              className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
                            <VoiceInput
                              className="shrink-0"
                              onResult={(text) =>
                                updateLine(
                                  line._index,
                                  "description",
                                  line.description ? line.description + " " + text : text
                                )
                              }
                            />
                          </div>
                        ) : (
                          line.description
                        )}
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
                        {editing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(
                                  line._index,
                                  "quantity",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
                            <span className="text-xs text-slate-400">
                              {line.unit}
                            </span>
                          </div>
                        ) : (
                          <>
                            {line.quantity} {line.unit}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {editing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-slate-400">€</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) =>
                                updateLine(
                                  line._index,
                                  "unit_price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
                          </div>
                        ) : (
                          formatCurrency(line.unit_price)
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">
                        {formatCurrency(line.total)}
                      </td>
                      {editing && (
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => removeLine(line._index)}
                            className="text-slate-400 hover:text-red-500 transition p-1"
                            title="Verwijder regel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {editing && (
                <div className="px-3 py-2 border-t border-slate-100">
                  <button
                    onClick={() => addLine(category, categoryType)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Regel toevoegen
                  </button>
                </div>
              )}
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
          <span>Winstmarge ({marginPercentage}%)</span>
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
    </div>
  );
}
