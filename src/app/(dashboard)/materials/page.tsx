"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Material } from "@/lib/types";
import {
  Package,
  Plus,
  Upload,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
} from "lucide-react";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", unit: "stuk", cost_price: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    const { data } = await supabase
      .from("materials")
      .select("*")
      .order("name");
    setMaterials(data ?? []);
    setLoading(false);
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      name: form.name,
      unit: form.unit,
      cost_price: parseFloat(form.cost_price),
      user_id: user.id,
    };

    if (editingId) {
      await supabase.from("materials").update(payload).eq("id", editingId);
    } else {
      await supabase.from("materials").insert(payload);
    }

    setForm({ name: "", unit: "stuk", cost_price: "" });
    setShowForm(false);
    setEditingId(null);
    loadMaterials();
  }

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je dit materiaal wilt verwijderen?")) return;
    await supabase.from("materials").delete().eq("id", id);
    loadMaterials();
  }

  function handleEdit(material: Material) {
    setForm({
      name: material.name,
      unit: material.unit,
      cost_price: material.cost_price.toString(),
    });
    setEditingId(material.id);
    setShowForm(true);
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    // Skip header row
    const dataLines = lines.slice(1);

    // Detect delimiter: semicolon (Dutch Excel) or comma
    const delimiter = dataLines[0]?.includes(";") ? ";" : ",";

    const newMaterials = dataLines
      .map((line) => {
        const parts = line.split(delimiter).map((s) => s.trim());
        const [name, unit, ...priceParts] = parts;
        // Support both comma (12,50) and dot (12.50) as decimal separator
        const priceStr = priceParts.join("").replace(",", ".");
        if (!name || !priceStr) return null;
        const price = parseFloat(priceStr);
        if (isNaN(price)) return null;
        return {
          name,
          unit: unit || "stuk",
          cost_price: price,
          user_id: user.id,
        };
      })
      .filter(Boolean);

    if (newMaterials.length > 0) {
      // Check which materials already exist (by name) to update their prices
      const { data: existing } = await supabase
        .from("materials")
        .select("id, name")
        .eq("user_id", user.id);

      const existingMap = new Map(
        (existing ?? []).map((m) => [m.name.toLowerCase(), m.id])
      );

      const toUpdate: { id: string; unit: string; cost_price: number }[] = [];
      const toInsert: typeof newMaterials = [];

      for (const mat of newMaterials) {
        if (!mat) continue;
        const existingId = existingMap.get(mat.name.toLowerCase());
        if (existingId) {
          toUpdate.push({ id: existingId, unit: mat.unit, cost_price: mat.cost_price });
        } else {
          toInsert.push(mat);
        }
      }

      // Update existing materials
      for (const item of toUpdate) {
        await supabase
          .from("materials")
          .update({ unit: item.unit, cost_price: item.cost_price })
          .eq("id", item.id);
      }

      // Insert new materials
      if (toInsert.length > 0) {
        await supabase.from("materials").insert(toInsert);
      }

      loadMaterials();
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 shrink-0">
          Materialen
        </h1>
        <div className="flex gap-2 md:gap-3">
          <label className="flex items-center gap-1.5 md:gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition cursor-pointer text-sm md:text-base">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">CSV Uploaden</span>
            <span className="sm:hidden">CSV</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm({ name: "", unit: "stuk", cost_price: "" });
            }}
            className="flex items-center gap-1.5 md:gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition text-sm md:text-base"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Toevoegen</span>
          </button>
        </div>
      </div>

      {/* CSV Format Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6 text-xs md:text-sm text-blue-700">
        <strong>CSV formaat:</strong> naam;eenheid;kostprijs (bijv:{" "}
        <code className="bg-blue-100 px-1 rounded">
          Schroeven M8;doos;12,50
        </code>
        ) — Komma-gescheiden bestanden werken ook.
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {editingId ? "Materiaal Bewerken" : "Nieuw Materiaal"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Naam
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="bijv. Schroeven M8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Eenheid
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              >
                <option value="stuk">Stuk</option>
                <option value="m">Meter</option>
                <option value="m2">M²</option>
                <option value="m3">M³</option>
                <option value="kg">Kilogram</option>
                <option value="liter">Liter</option>
                <option value="doos">Doos</option>
                <option value="zak">Zak</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kostprijs (&euro;)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) =>
                  setForm({ ...form, cost_price: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={!form.name || !form.cost_price}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Opslaan
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg transition"
            >
              <X className="w-4 h-4" />
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Materials Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {materials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[450px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Naam
                  </th>
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Eenheid
                  </th>
                  <th className="text-right px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Kostprijs
                  </th>
                  <th className="text-right px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-slate-800">
                      {material.name}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600">{material.unit}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right text-slate-800">
                      {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(material.cost_price))}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2">
                        <button
                          onClick={() => handleEdit(material)}
                          className="p-2 md:p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="p-2 md:p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 md:px-6 md:py-12 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Nog geen materialen toegevoegd</p>
            <p className="text-sm mt-1">
              Voeg materialen toe of upload een CSV-bestand
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
