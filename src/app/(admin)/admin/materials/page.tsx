"use client";

import { useState, useEffect, useRef } from "react";
import {
  Package,
  Plus,
  Upload,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
  FileCode2,
} from "lucide-react";
import type { DefaultMaterial } from "@/lib/types";

const CATEGORIES = [
  "Sanitair",
  "Elektra",
  "Verwarming",
  "Bouw",
  "Dakwerk",
  "Isolatie",
  "Gereedschap",
  "Bevestiging",
  "Buizen & Fittingen",
  "Verf & Afwerking",
  "Overig",
];

const UNITS = ["stuk", "m", "m2", "m3", "kg", "liter", "doos", "zak", "rol", "set"];

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<DefaultMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [dicoUploading, setDicoUploading] = useState(false);
  const [dicoProgress, setDicoProgress] = useState<string | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const dicoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    category: "Overig",
    unit: "stuk",
    cost_price: "",
    source: "Hornbach",
    source_url: "",
    article_number: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    const res = await fetch("/api/admin?action=default-materials");
    const data = await res.json();
    setMaterials(data.materials ?? []);
    setLoading(false);
  }

  async function handleSave() {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert-material",
        id: editingId,
        name: form.name,
        category: form.category,
        unit: form.unit,
        cost_price: parseFloat(form.cost_price),
        source: form.source,
        source_url: form.source_url || null,
        article_number: form.article_number || null,
      }),
    });

    if (res.ok) {
      resetForm();
      loadMaterials();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je dit materiaal wilt verwijderen?")) return;
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-material", id }),
    });
    loadMaterials();
  }

  function handleEdit(mat: DefaultMaterial) {
    setForm({
      name: mat.name,
      category: mat.category,
      unit: mat.unit,
      cost_price: mat.cost_price.toString(),
      source: mat.source ?? "Hornbach",
      source_url: mat.source_url ?? "",
      article_number: mat.article_number ?? "",
    });
    setEditingId(mat.id);
    setShowForm(true);
  }

  function resetForm() {
    setForm({
      name: "",
      category: "Overig",
      unit: "stuk",
      cost_price: "",
      source: "Hornbach",
      source_url: "",
      article_number: "",
    });
    setShowForm(false);
    setEditingId(null);
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    setUploadMessage(null);

    try {
      // Strip BOM and split on CR+LF or LF
      const raw = await file.text();
      const text = raw.replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length < 2) {
        setUploadMessage({ type: "error", text: "CSV heeft te weinig regels (minimaal 1 headerregel + 1 dataregel)" });
        return;
      }

      // Auto-detect delimiter by trying ;  ,  \t on the header row
      const detectDelimiter = (header: string): string => {
        for (const d of [";", "\t", ","]) {
          if (header.split(d).length >= 4) return d;
        }
        return ";";
      };
      const delimiter = detectDelimiter(lines[0]);

      // Parse header row, normalise to lowercase without quotes
      const normalise = (s: string) =>
        s.trim().toLowerCase().replace(/^"|"$/g, "").replace(/\s+/g, " ");

      const headerCols = lines[0].split(delimiter).map(normalise);

      // Find column index by keyword candidates
      const findCol = (...keywords: string[]): number => {
        for (const kw of keywords) {
          const idx = headerCols.findIndex((h) => h.includes(kw));
          if (idx >= 0) return idx;
        }
        return -1;
      };

      const nameIdx  = findCol("naam", "omschrijving", "name", "artikel", "description", "product");
      const catIdx   = findCol("categorie", "category", "groep", "type", "subgroep");
      const unitIdx  = findCol("eenheid", "unit", "eh");
      const priceIdx = findCol(
        "netto prijs", "nettoprijsexcl", "prijs excl", "prijs_excl", "kostprijs",
        "cost", "netto", "prijs", "price"
      );

      // Fall back to positional if header recognition failed
      const ni = nameIdx  >= 0 ? nameIdx  : 0;
      const ci = catIdx   >= 0 ? catIdx   : 1;
      const ui = unitIdx  >= 0 ? unitIdx  : 2;
      const pi = priceIdx >= 0 ? priceIdx : 3;

      const splitLine = (line: string): string[] =>
        line.split(delimiter).map((s) => s.trim().replace(/^"|"$/g, ""));

      let skipped = 0;
      const rows = lines
        .slice(1)                      // skip header
        .map((line) => {
          const p = splitLine(line);
          const name = p[ni] ?? "";
          const priceRaw = (p[pi] ?? "").replace(",", ".").replace(/[^\d.]/g, "");
          const price = parseFloat(priceRaw);
          if (!name || isNaN(price) || price < 0) { skipped++; return null; }
          return {
            name,
            category: p[ci] || "Overig",
            unit:     p[ui] || "stuk",
            cost_price: price,
            source:   file.name.replace(/\.csv$/i, ""),
          };
        })
        .filter(Boolean) as { name: string; category: string; unit: string; cost_price: number; source: string }[];

      if (rows.length === 0) {
        setUploadMessage({
          type: "error",
          text: `Geen geldige regels gevonden (${skipped} overgeslagen). ` +
                `Herkende kolommen: naam(${ni}), cat(${ci}), eenheid(${ui}), prijs(${pi}). ` +
                `Verwacht formaat: naam;categorie;eenheid;prijs`,
        });
        return;
      }

      // Send in batches of 200 rows (small JSON bodies, no size limit issues)
      const BATCH = 200;
      let total = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "import-materials-batch", rows: batch }),
        });
        const data = await res.json();
        if (!res.ok) {
          setUploadMessage({ type: "error", text: "Fout bij importeren: " + data.error });
          return;
        }
        total += data.count ?? 0;
      }

      setUploadMessage({
        type: "success",
        text: `${total} materialen geïmporteerd${skipped > 0 ? ` (${skipped} regels overgeslagen)` : ""}`,
      });
      loadMaterials();
    } catch (err) {
      setUploadMessage({ type: "error", text: "Fout bij verwerken CSV: " + String(err) });
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDicoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setDicoUploading(true);
    setDicoProgress("XML inlezen...");
    setUploadMessage(null);

    // Parse XML in a Web Worker (regex-based, no DOMParser, no file upload needed)
    const worker = new Worker(
      new URL("@/lib/dico-parser.worker.ts", import.meta.url)
    );

    file.text().then((text) => {
      if (!text.trim().startsWith("<")) {
        setUploadMessage({ type: "error", text: "Bestand lijkt geen geldig XML te zijn" });
        worker.terminate();
        setDicoUploading(false);
        setDicoProgress(null);
        if (dicoInputRef.current) dicoInputRef.current.value = "";
        return;
      }
      setDicoProgress("XML verwerken...");
      worker.postMessage(text);
    });

    worker.onmessage = async (ev) => {
      const data = ev.data;

      if (data?.progress !== undefined) {
        setDicoProgress(`Verwerken ${data.progress}%`);
        return;
      }

      worker.terminate();

      if (data?.error) {
        setDicoUploading(false);
        setDicoProgress(null);
        if (dicoInputRef.current) dicoInputRef.current.value = "";
        setUploadMessage({ type: "error", text: "Fout bij verwerken XML: " + data.error });
        return;
      }

      if (!data.products?.length) {
        setDicoUploading(false);
        setDicoProgress(null);
        if (dicoInputRef.current) dicoInputRef.current.value = "";
        setUploadMessage({ type: "error", text: "Geen artikelen gevonden. Controleer of het een DICO-exportbestand is (SALES_V005)." });
        return;
      }

      // Send parsed products in batches of 500 (small JSON bodies)
      const BATCH = 500;
      let totalImported = 0;
      const allProducts = data.products;

      for (let i = 0; i < allProducts.length; i += BATCH) {
        setDicoProgress(`Importeren ${totalImported} / ${allProducts.length}...`);
        const batch = allProducts.slice(i, i + BATCH);
        const importRes = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "import-materials-dico",
            products: batch,
            supplier_name: data.supplier_name,
          }),
        });
        const importData = await importRes.json();
        if (!importRes.ok) {
          setDicoUploading(false);
          setDicoProgress(null);
          if (dicoInputRef.current) dicoInputRef.current.value = "";
          setUploadMessage({ type: "error", text: "Fout bij importeren: " + importData.error });
          return;
        }
        totalImported += importData.count ?? 0;
      }

      setDicoUploading(false);
      setDicoProgress(null);
      if (dicoInputRef.current) dicoInputRef.current.value = "";
      setUploadMessage({
        type: "success",
        text: `${totalImported} materialen geïmporteerd van ${data.supplier_name ?? "leverancier"}`,
      });
      loadMaterials();
    };

    worker.onerror = (err) => {
      worker.terminate();
      setDicoUploading(false);
      setDicoProgress(null);
      if (dicoInputRef.current) dicoInputRef.current.value = "";
      setUploadMessage({ type: "error", text: "Fout bij verwerken XML: " + err.message });
    };
  }

  const filteredMaterials = filterCategory
    ? materials.filter((m) => m.category === filterCategory)
    : materials;

  const categories = [...new Set(materials.map((m) => m.category))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          Standaard Materialen ({materials.length})
        </h1>
        <div className="flex gap-2 md:gap-3">
          <label className={`flex items-center gap-1.5 md:gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition cursor-pointer text-sm ${dicoUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {dicoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {dicoProgress ?? "DICO XML"}
            </span>
            <span className="sm:hidden">XML</span>
            <input
              ref={dicoInputRef}
              type="file"
              accept=".xml"
              onChange={handleDicoUpload}
              className="hidden"
              disabled={dicoUploading}
            />
          </label>
          <label className={`flex items-center gap-1.5 md:gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition cursor-pointer text-sm ${csvUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {csvUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="hidden sm:inline">{csvUploading ? "Importeren..." : "CSV Importeren"}</span>
            <span className="sm:hidden">CSV</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
              disabled={csvUploading}
            />
          </label>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 md:gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Toevoegen</span>
          </button>
        </div>
      </div>

      {/* Upload feedback */}
      {uploadMessage && (
        <div className={`flex items-center justify-between gap-2 rounded-lg px-4 py-3 mb-4 text-sm font-medium ${uploadMessage.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          <span>{uploadMessage.text}</span>
          <button onClick={() => setUploadMessage(null)} className="ml-2 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* XML progress banner */}
      {dicoUploading && dicoProgress && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm text-blue-700">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{dicoProgress}</span>
        </div>
      )}

      {/* CSV format info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 text-xs md:text-sm text-blue-700">
        <strong>CSV formaat:</strong> Separator ; , of tab — kolomvolgorde wordt automatisch herkend via de headerregel.
        Kolommen <em>naam/omschrijving</em>, <em>eenheid</em> en <em>prijs</em> zijn verplicht; <em>categorie/groep</em> is optioneel.{" "}
        Voorbeeld:{" "}
        <code className="bg-blue-100 px-1 rounded">
          naam;categorie;eenheid;prijs
        </code>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterCategory("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              !filterCategory
                ? "bg-brand-500 text-white"
                : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Alles
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterCategory === cat
                  ? "bg-brand-500 text-white"
                  : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {editingId ? "Materiaal Bewerken" : "Nieuw Materiaal"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Naam</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="bijv. Koperbuis 15mm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Eenheid</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kostprijs (&euro;)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bron</label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="Hornbach"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Artikelnr.</label>
              <input
                type="text"
                value={form.article_number}
                onChange={(e) => setForm({ ...form, article_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="optioneel"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
            <input
              type="url"
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              placeholder="https://www.hornbach.nl/..."
            />
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
              onClick={resetForm}
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
        {filteredMaterials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">Naam</th>
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">Categorie</th>
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">Eenheid</th>
                  <th className="text-right px-4 py-3 md:px-6 text-sm font-medium text-slate-500">Prijs</th>
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">Bron</th>
                  <th className="text-right px-4 py-3 md:px-6 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 md:px-6 font-medium text-slate-800">
                      {mat.source_url ? (
                        <a
                          href={mat.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-500 hover:underline"
                        >
                          {mat.name}
                        </a>
                      ) : (
                        mat.name
                      )}
                    </td>
                    <td className="px-4 py-3 md:px-6 text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                        {mat.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 md:px-6 text-slate-600">{mat.unit}</td>
                    <td className="px-4 py-3 md:px-6 text-right text-slate-800">
                      {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(mat.cost_price))}
                    </td>
                    <td className="px-4 py-3 md:px-6 text-slate-600 text-sm">
                      {mat.source}{mat.article_number ? ` (#${mat.article_number})` : ""}
                    </td>
                    <td className="px-4 py-3 md:px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(mat)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(mat.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
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
          <div className="px-6 py-12 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Nog geen standaard materialen</p>
            <p className="text-sm mt-1">
              Voeg materialen toe of importeer via CSV
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
