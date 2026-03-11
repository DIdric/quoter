"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Save,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface QuoteLine {
  category: string;
  description: string;
  type: "arbeid" | "materiaal";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  actual_cost?: number;
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

function DiffBadge({ quoted, actual }: { quoted: number; actual: number }) {
  if (actual === 0) return null;
  const diff = actual - quoted;
  const pct = quoted > 0 ? Math.round((diff / quoted) * 100) : 0;

  if (Math.abs(pct) < 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="w-3 h-3" />
        ±0%
      </span>
    );
  }

  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
        <TrendingUp className="w-3 h-3" />
        +{pct}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
      <TrendingDown className="w-3 h-3" />
      {pct}%
    </span>
  );
}

export function ActualCostsPanel({
  quoteId,
  result,
  status,
}: {
  quoteId: string;
  result: QuoteResult;
  status: string;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(status === "completed");
  const [saving, setSaving] = useState(false);
  const [actualCosts, setActualCosts] = useState<(number | null)[]>(
    result.lines.map((l) => l.actual_cost ?? null)
  );
  const router = useRouter();
  const supabase = createClient();

  const hasAnyActualCosts = actualCosts.some((c) => c !== null && c > 0);
  const categories = [...new Set(result.lines.map((l) => l.category))];

  const totalQuoted = result.lines.reduce((sum, l) => sum + l.total, 0);
  const totalActual = actualCosts.reduce<number>((sum, c) => sum + (c ?? 0), 0);

  async function handleSave() {
    setSaving(true);
    try {
      const updatedLines = result.lines.map((line, i) => ({
        ...line,
        actual_cost: actualCosts[i] ?? undefined,
      }));

      const { data: quote } = await supabase
        .from("quotes")
        .select("json_data")
        .eq("id", quoteId)
        .single();

      const jsonData = (quote?.json_data as Record<string, unknown>) || {};
      const existingResult = (jsonData.result as Record<string, unknown>) || {};

      await supabase
        .from("quotes")
        .update({
          status: "completed",
          json_data: {
            ...jsonData,
            result: { ...existingResult, lines: updatedLines },
          },
        })
        .eq("id", quoteId);

      setEditing(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to save actual costs:", err);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-slate-700">
            Werkelijke kosten
          </h3>
          {hasAnyActualCosts && (
            <DiffBadge quoted={totalQuoted} actual={totalActual} />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-4 space-y-4">
          {!hasAnyActualCosts && !editing && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-3">
                Project afgerond? Vul de werkelijke kosten in om te vergelijken met je offerte.
              </p>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition text-sm"
              >
                <ClipboardCheck className="w-4 h-4" />
                Werkelijke kosten invoeren
              </button>
            </div>
          )}

          {(hasAnyActualCosts || editing) && (
            <>
              {/* Edit controls */}
              <div className="flex justify-end">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                  >
                    Kosten aanpassen
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActualCosts(result.lines.map((l) => l.actual_cost ?? null));
                        setEditing(false);
                      }}
                      disabled={saving}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Annuleren
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Opslaan
                    </button>
                  </div>
                )}
              </div>

              {/* Comparison table per category */}
              {categories.map((category) => {
                const categoryLines = result.lines
                  .map((l, i) => ({ ...l, _index: i }))
                  .filter((l) => l.category === category);

                return (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-slate-600 mb-1">
                      {category}
                    </h4>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-slate-600 font-medium">
                              Omschrijving
                            </th>
                            <th className="text-right px-3 py-2 text-slate-600 font-medium w-24">
                              Offerte
                            </th>
                            <th className="text-right px-3 py-2 text-blue-600 font-medium w-28">
                              Werkelijk
                            </th>
                            <th className="text-right px-3 py-2 text-slate-600 font-medium w-20">
                              Verschil
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {categoryLines.map((line) => (
                            <tr key={line._index} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-800">
                                {line.description}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600">
                                {formatCurrency(line.total)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {editing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-xs text-slate-400">€</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={actualCosts[line._index] ?? ""}
                                      placeholder="0.00"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setActualCosts((prev) => {
                                          const next = [...prev];
                                          next[line._index] = val === "" ? null : parseFloat(val);
                                          return next;
                                        });
                                      }}
                                      className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-medium text-blue-700">
                                    {actualCosts[line._index] != null
                                      ? formatCurrency(actualCosts[line._index]!)
                                      : "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {actualCosts[line._index] != null && actualCosts[line._index]! > 0 && (
                                  <DiffBadge
                                    quoted={line.total}
                                    actual={actualCosts[line._index]!}
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Totals comparison */}
              {hasAnyActualCosts && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Totaal offerte (excl. marge & BTW)</span>
                    <span className="text-slate-700">{formatCurrency(totalQuoted)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 font-medium">Totaal werkelijk</span>
                    <span className="text-blue-700 font-medium">{formatCurrency(totalActual)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-medium">
                    <span className="text-slate-700">Verschil</span>
                    <span className={totalActual > totalQuoted ? "text-red-600" : "text-green-600"}>
                      {totalActual > totalQuoted ? "+" : ""}
                      {formatCurrency(totalActual - totalQuoted)}{" "}
                      <DiffBadge quoted={totalQuoted} actual={totalActual} />
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
