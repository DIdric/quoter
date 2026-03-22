/// <reference lib="webworker" />
/**
 * Web Worker for parsing DICO XML files using the browser's native DOMParser.
 * Runs off the main thread so large files (100+ MB) don't freeze the UI.
 */

import type { DicoParseResult, DicoProduct } from "./parse-dico-xml";

const SUPPLIER_TAGS = ["leverancier", "supplier", "afzender", "leveranciergegevens"];
const ARTICLE_TAGS = [
  "artikel", "artikelregel", "artikelgegevens",
  "item", "line", "priceitem", "pricat_item",
  "article", "articleline", "product",
  "articledata", "pricelistitem",
];

function firstText(el: Element, tags: string[]): string {
  for (const tag of tags) {
    const found = el.getElementsByTagName(tag)[0];
    const text = found?.textContent?.trim();
    if (text) return text;
  }
  return "";
}

function normaliseUnit(raw: string): string {
  const map: Record<string, string> = {
    stk: "stuk", st: "stuk", stuks: "stuk", pce: "stuk", pc: "stuk", ea: "stuk",
    m: "m", mtr: "m", lm: "m",
    m2: "m2", "m²": "m2",
    m3: "m3", "m³": "m3",
    kg: "kg", kgr: "kg",
    l: "liter", ltr: "liter", lit: "liter",
    doos: "doos", ds: "doos", box: "doos",
    zak: "zak", zk: "zak", bag: "zak",
    rol: "rol", rl: "rol",
    set: "set",
    paar: "paar", pr: "paar",
  };
  return map[raw.toLowerCase()] ?? raw.toLowerCase();
}

function parsePrice(raw: string): number {
  return parseFloat(raw.replace(/\s/g, "").replace(",", "."));
}

self.onmessage = function (e: MessageEvent<string>) {
  const xmlText: string = e.data;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    self.postMessage({ error: "Ongeldig XML bestand: " + parseError.textContent?.slice(0, 200) });
    return;
  }

  // ── Supplier metadata ────────────────────────────────────────────────────────
  let supplierEl: Element | null = null;
  for (const tag of SUPPLIER_TAGS) {
    supplierEl = doc.getElementsByTagName(tag)[0] ?? null;
    if (supplierEl) break;
  }
  const root = supplierEl ?? doc.documentElement;

  const supplier_name = firstText(root, [
    "naam", "name", "bedrijfsnaam", "leveranciernaam", "suppliername", "companyname", "organisation",
  ]);
  const supplier_gln = firstText(root, [
    "gln", "glncode", "gln_code", "eanlocatiecode", "locatiecode", "iln",
  ]);

  // ── Article elements ─────────────────────────────────────────────────────────
  let articleEls: HTMLCollectionOf<Element> | null = null;
  for (const tag of ARTICLE_TAGS) {
    const els = doc.getElementsByTagName(tag);
    if (els.length > 0) {
      articleEls = els;
      break;
    }
  }

  if (!articleEls || articleEls.length === 0) {
    const result: DicoParseResult = {
      products: [],
      supplier_name,
      supplier_gln,
      total_found: 0,
      skipped: 0,
    };
    self.postMessage(result);
    return;
  }

  const products: DicoProduct[] = [];
  let skipped = 0;
  const total = articleEls.length;

  for (let i = 0; i < total; i++) {
    const el = articleEls[i];

    const name = firstText(el, [
      "omschrijving", "artikelomschrijving", "artikelnaam",
      "description", "productdescription", "productname",
      "name", "naam", "shortdescription", "korteomschrijving",
    ]);
    if (!name) { skipped++; continue; }

    const article_code = firstText(el, [
      "artikelnummer", "artikelcode", "artnr", "artcode",
      "articlecode", "articlenumber", "articlenr",
      "code", "itemnumber", "productnumber",
    ]);

    const ean = firstText(el, [
      "ean", "ean13", "ean_code", "barcode", "gtin", "internationalcodearticle",
    ]);

    const unitRaw = firstText(el, [
      "eenheid", "basiseenheid", "factuureenheid",
      "unit", "baseunit", "invoiceunit", "orderunit",
      "salesunit", "priceunit", "qty_unit",
    ]);

    const priceRaw = firstText(el, [
      "nettoprijsexcl", "nettoprijsexclbtw", "prijsexclbtw", "netprijs",
      "netprice", "nettoprice", "price_excl_vat", "priceexclvat",
      "verkoopprijsexcl", "basisprijsexcl",
      "prijs", "price", "verkoopprijs", "basisprice", "listprice",
    ]);

    if (!priceRaw) { skipped++; continue; }

    const price_excl_vat = parsePrice(priceRaw);
    if (isNaN(price_excl_vat) || price_excl_vat < 0) { skipped++; continue; }

    products.push({
      name,
      article_code,
      ean,
      unit: normaliseUnit(unitRaw || "stuk"),
      price_excl_vat,
      supplier_name,
      supplier_gln,
    });

    // Report progress every 5 000 articles
    if (i > 0 && i % 5000 === 0) {
      self.postMessage({ progress: Math.round((i / total) * 100) });
    }
  }

  const result: DicoParseResult = {
    products,
    supplier_name,
    supplier_gln,
    total_found: total,
    skipped,
  };
  self.postMessage(result);
};
