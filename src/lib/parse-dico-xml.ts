/**
 * DICO Digital Standard XML parser (SALES_V005 / pricat)
 *
 * Handles pricat files from Bouwmaat, Warmteservice, Technische Unie,
 * Rexel and any other wholesaler using the DICO / S@les-in-de-Bouw
 * standard. The parser is intentionally flexible to tolerate slight
 * tag-name variations across supplier exports.
 */

export interface DicoProduct {
  name: string;
  article_code: string;
  ean: string;
  unit: string;
  price_excl_vat: number;
  supplier_name: string;
  supplier_gln: string;
}

export interface DicoParseResult {
  products: DicoProduct[];
  supplier_name: string;
  supplier_gln: string;
  total_found: number;
  skipped: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Return the trimmed text content of the first matching element. */
function el(xml: string, ...tags: string[]): string {
  for (const tag of tags) {
    const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)<\\/${tag}>`, "i"));
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return "";
}

/** Split XML into all inner-content blocks that match any of the given element names. */
function blocks(xml: string, ...tags: string[]): string[] {
  for (const tag of tags) {
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) results.push(m[1]);
    if (results.length > 0) return results;
  }
  return [];
}

/** Normalise decimal separators and parse to float. */
function parsePrice(raw: string): number {
  // DICO uses a dot as decimal separator but some exports use a comma
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  return parseFloat(cleaned);
}

/**
 * Map DICO unit codes to Quoter's internal unit vocabulary.
 * DICO units are typically uppercase abbreviations (STK, M, M2, …).
 */
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

// ─── main parser ──────────────────────────────────────────────────────────────

export function parseDicoXml(xmlText: string, onProgress?: (pct: number) => void): DicoParseResult {
  // Normalise line endings
  const xml = xmlText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // ── 1. Supplier metadata ──────────────────────────────────────────────────
  // SALES_V005 wraps supplier info in <leverancier>, <supplier>, or <afzender>
  const supplierBlock =
    blocks(xml, "leverancier", "supplier", "afzender", "leveranciergegevens")[0] ?? xml;

  const supplier_name = el(
    supplierBlock,
    "naam", "name", "bedrijfsnaam", "leveranciernaam", "suppliername",
    "companyname", "organisation"
  );
  const supplier_gln = el(
    supplierBlock,
    "gln", "glncode", "gln_code", "eanlocatiecode", "locatiecode", "iln"
  );

  // ── 2. Article blocks ─────────────────────────────────────────────────────
  // Wrap element names used across different DICO exports
  const articleBlocks = blocks(
    xml,
    // Dutch
    "artikel", "artikelregel", "artikelgegevens",
    // English / mixed
    "item", "line", "priceitem", "pricat_item",
    "article", "articleline", "product",
    // SALES_V005 specific
    "articledata", "pricelistitem"
  );

  const products: DicoProduct[] = [];
  let skipped = 0;

  const total = articleBlocks.length;
  for (let _i = 0; _i < total; _i++) {
    const block = articleBlocks[_i];
    if (onProgress && _i > 0 && _i % 5000 === 0) {
      onProgress(Math.round((_i / total) * 100));
    }
    // Product name — multiple possible tags
    const name = el(
      block,
      "omschrijving", "artikelomschrijving", "artikelnaam",
      "description", "productdescription", "productname",
      "name", "naam", "shortdescription", "korteomschrijving"
    );

    if (!name) { skipped++; continue; }

    // Article code
    const article_code = el(
      block,
      "artikelnummer", "artikelcode", "artnr", "artcode",
      "articlecode", "articlenumber", "articlenr",
      "code", "itemnumber", "productnumber"
    );

    // EAN / barcode
    const ean = el(
      block,
      "ean", "ean13", "ean_code", "barcode",
      "gtin", "internationalcodearticle"
    );

    // Unit
    const unitRaw = el(
      block,
      "eenheid", "basiseenheid", "factuureenheid",
      "unit", "baseunit", "invoiceunit", "orderunit",
      "salesunit", "priceunit", "qty_unit"
    );
    const unit = normaliseUnit(unitRaw || "stuk");

    // Price excl. VAT — try net/netto price first, then gross
    const priceRaw =
      el(
        block,
        "nettoprijsexcl", "nettoprijsexclbtw", "prijsexclbtw", "netprijs",
        "netprice", "nettoprice", "price_excl_vat", "priceexclvat",
        "verkoopprijsexcl", "basisprijsexcl",
        // fallback: gross price (less ideal but better than nothing)
        "prijs", "price", "verkoopprijs", "basisprice", "listprice"
      );

    if (!priceRaw) { skipped++; continue; }

    const price_excl_vat = parsePrice(priceRaw);
    if (isNaN(price_excl_vat) || price_excl_vat < 0) { skipped++; continue; }

    products.push({
      name,
      article_code,
      ean,
      unit,
      price_excl_vat,
      supplier_name,
      supplier_gln,
    });
  }

  return {
    products,
    supplier_name,
    supplier_gln,
    total_found: total,
    skipped,
  };
}
