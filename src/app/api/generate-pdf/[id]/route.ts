export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface QuoteLine {
  category: string;
  description: string;
  type: "arbeid" | "materiaal";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface QuoteModuleDescription {
  name: string;
  intro: string;
  items: string[];
}

interface QuoteResult {
  quote_title: string;
  summary: string;
  technical_description?: string;
  modules?: QuoteModuleDescription[];
  lines: QuoteLine[];
  subtotal_materials: number;
  subtotal_labor: number;
  margin_amount: number;
  total_excl_btw: number;
  btw_amount: number;
  total_incl_btw: number;
  estimated_days: number;
  notes: string;
  uitsluitingen?: string[];
  language?: string;
}

type DisplayMode = "open" | "module" | "hoogover";

const PDF_LABELS: Record<string, Record<string, string>> = {
  nl: {
    dear: "Beste", dearFormal: "Geachte heer/mevrouw,",
    introPrefix: "Hierbij zenden wij u onze vrijblijvende offerte ten behoeve van",
    introLocation: "te", techSection: "Technische omschrijving werkzaamheden",
    colDesc: "Omschrijving", colType: "Type", colAmount: "Aantal",
    colPrice: "Prijs", colTotal: "Totaal", colModule: "Module",
    colPriceExcl: "Prijs excl. BTW", totalExcl: "Totaal excl. BTW",
    btw: "BTW (21%)", totalIncl: "Totaal incl. BTW", notes: "Opmerkingen:",
    exclusions: "Uitsluitingen", validUntil: "Deze offerte is geldig tot",
    closing1: "Wij vertrouwen erop u hiermee een passende aanbieding te hebben gedaan.",
    closing2: "Met vriendelijke groet,", quoteLabel: "Offerte:", subjectLabel: "Betreft:",
    locationLabel: "Locatie:", dateLabel: "Offertedatum:", expiryLabel: "Vervaldatum:",
    durationLabel: "Doorlooptijd:", workday: "werkdag", workdays: "werkdagen",
    typeMaterial: "Materiaal", typeLabor: "Arbeid",
  },
  en: {
    dear: "Dear", dearFormal: "Dear Sir/Madam,",
    introPrefix: "Please find enclosed our non-binding quotation for",
    introLocation: "in", techSection: "Technical description of works",
    colDesc: "Description", colType: "Type", colAmount: "Quantity",
    colPrice: "Price", colTotal: "Total", colModule: "Module",
    colPriceExcl: "Price excl. VAT", totalExcl: "Total excl. VAT",
    btw: "VAT (21%)", totalIncl: "Total incl. VAT", notes: "Notes:",
    exclusions: "Exclusions", validUntil: "This quotation is valid until",
    closing1: "We trust this offer meets your requirements.",
    closing2: "Kind regards,", quoteLabel: "Quote:", subjectLabel: "Subject:",
    locationLabel: "Location:", dateLabel: "Quote date:", expiryLabel: "Expiry date:",
    durationLabel: "Duration:", workday: "working day", workdays: "working days",
    typeMaterial: "Material", typeLabor: "Labour",
  },
  de: {
    dear: "Sehr geehrte(r)", dearFormal: "Sehr geehrte Damen und Herren,",
    introPrefix: "Hiermit übersenden wir Ihnen unser unverbindliches Angebot für",
    introLocation: "in", techSection: "Technische Beschreibung der Arbeiten",
    colDesc: "Beschreibung", colType: "Typ", colAmount: "Menge",
    colPrice: "Preis", colTotal: "Gesamt", colModule: "Modul",
    colPriceExcl: "Preis exkl. MwSt.", totalExcl: "Gesamt exkl. MwSt.",
    btw: "MwSt. (21%)", totalIncl: "Gesamt inkl. MwSt.", notes: "Anmerkungen:",
    exclusions: "Ausschlüsse", validUntil: "Dieses Angebot ist gültig bis",
    closing1: "Wir vertrauen darauf, Ihnen hiermit ein passendes Angebot gemacht zu haben.",
    closing2: "Mit freundlichen Grüßen,", quoteLabel: "Angebot:", subjectLabel: "Betreff:",
    locationLabel: "Standort:", dateLabel: "Angebotsdatum:", expiryLabel: "Ablaufdatum:",
    durationLabel: "Laufzeit:", workday: "Arbeitstag", workdays: "Arbeitstage",
    typeMaterial: "Material", typeLabor: "Arbeit",
  },
  pl: {
    dear: "Szanowny/a", dearFormal: "Szanowni Państwo,",
    introPrefix: "W załączeniu przesyłamy naszą ofertę na",
    introLocation: "w", techSection: "Techniczny opis prac",
    colDesc: "Opis", colType: "Typ", colAmount: "Ilość",
    colPrice: "Cena", colTotal: "Razem", colModule: "Moduł",
    colPriceExcl: "Cena bez VAT", totalExcl: "Razem bez VAT",
    btw: "VAT (21%)", totalIncl: "Razem z VAT", notes: "Uwagi:",
    exclusions: "Wyłączenia", validUntil: "Oferta ważna do",
    closing1: "Mamy nadzieję, że nasza oferta spełnia Państwa oczekiwania.",
    closing2: "Z poważaniem,", quoteLabel: "Oferta:", subjectLabel: "Dotyczy:",
    locationLabel: "Lokalizacja:", dateLabel: "Data oferty:", expiryLabel: "Data ważności:",
    durationLabel: "Czas realizacji:", workday: "dzień roboczy", workdays: "dni robocze",
    typeMaterial: "Materiał", typeLabor: "Robocizna",
  },
};

interface QuoteJsonData {
  form?: {
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    project_title?: string;
    project_description?: string;
    project_location?: string;
  };
  result?: QuoteResult;
  display_mode?: DisplayMode;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDateNL(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProfileData = Record<string, any>;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const url = new URL(request.url);
    const shareToken = url.searchParams.get("token");

    let quote;

    if (shareToken) {
      // Public access via share token
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .eq("share_token", shareToken)
        .single();
      quote = data;
    } else {
      // Authenticated access
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      quote = data;
    }

    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", quote.user_id)
      .single();

    const p = (profile || {}) as ProfileData;
    const jsonData = quote.json_data as QuoteJsonData | null;
    const form = jsonData?.form;
    const result = jsonData?.result;
    const displayMode: DisplayMode =
      jsonData?.display_mode ?? p.default_display_mode ?? "open";

    if (!result) {
      return NextResponse.json(
        { error: "No quote data available" },
        { status: 400 }
      );
    }

    const lang = result.language ?? "nl";
    const labels = PDF_LABELS[lang] ?? PDF_LABELS.nl;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const rightCol = pageWidth - margin;
    let y = 15;

    // ============================================================
    // PAGE 1: COVER / HEADER
    // ============================================================

    // -- Logo (top-right, max 45×15 mm bounding box, aspect ratio preserved) --
    let logoLoaded = false;
    let logoRenderH = 0;
    if (p.logo_url) {
      try {
        const logoRes = await fetch(p.logo_url);
        if (logoRes.ok) {
          const buffer = await logoRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const contentType =
            logoRes.headers.get("content-type") || "image/png";
          const imgData = `data:${contentType};base64,${base64}`;

          // Max bounding box: 45 × 15 mm (≈ 180 × 60 px at 96 dpi)
          const maxW = 45;
          const maxH = 15;
          const imgProps = doc.getImageProperties(imgData);
          const scale = Math.min(maxW / imgProps.width, maxH / imgProps.height);
          const logoW = Math.round(imgProps.width * scale * 10) / 10;
          const logoH = Math.round(imgProps.height * scale * 10) / 10;

          doc.addImage(imgData, "PNG", rightCol - logoW, y, logoW, logoH);
          logoRenderH = logoH;
          logoLoaded = true;
        }
      } catch {
        // continue without logo
      }
    }

    // -- Business info (top-right, below logo) --
    const bizY = logoLoaded ? y + logoRenderH + 4 : y;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(p.business_name || "Mijn Bedrijf", rightCol, bizY, {
      align: "right",
    });

    let bizLineY = bizY + 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);

    const bizLines: string[] = [];
    if (p.business_address) bizLines.push(p.business_address);
    if (p.business_postal_code || p.business_city)
      bizLines.push(
        [p.business_postal_code, p.business_city].filter(Boolean).join(" ")
      );
    if (p.business_email) bizLines.push(p.business_email);
    if (p.business_phone) bizLines.push(p.business_phone);

    bizLines.forEach((line) => {
      doc.text(line, rightCol, bizLineY, { align: "right" });
      bizLineY += 3.5;
    });

    // Extra line for KvK/BTW/IBAN
    bizLineY += 1;
    const regLines: string[] = [];
    if (p.kvk_number) regLines.push(`KvK: ${p.kvk_number}`);
    if (p.btw_number) regLines.push(`Btw: ${p.btw_number}`);
    if (p.iban) regLines.push(`Bank: ${p.iban}`);
    regLines.forEach((line) => {
      doc.text(line, rightCol, bizLineY, { align: "right" });
      bizLineY += 3.5;
    });

    // -- Client address block (top-left) --
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    let clientY = y + 4;
    if (form?.client_name) {
      doc.text(form.client_name, margin, clientY);
      clientY += 4.5;
    }
    if (form?.project_location) {
      doc.text(form.project_location, margin, clientY);
      clientY += 4.5;
    }
    if (form?.client_email) {
      doc.text(form.client_email, margin, clientY);
      clientY += 4.5;
    }
    if (form?.client_phone) {
      doc.text(form.client_phone, margin, clientY);
      clientY += 4.5;
    }

    y = Math.max(clientY, bizLineY) + 10;

    // -- Quote metadata block --
    const quoteDate = new Date(quote.created_at);
    const validityDays = p.quote_validity_days || 30;
    const expiryDate = new Date(quoteDate);
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    // Use stored quote number, or fallback to generated one
    const quoteNumber = quote.quote_number || `${quoteDate.getFullYear()}-${String(quoteDate.getMonth() + 1).padStart(2, "0")}${id.substring(0, 3).toUpperCase()}`;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    const metaLeft = [
      `${labels.quoteLabel.padEnd(13)} ${quoteNumber}`,
      `${labels.subjectLabel.padEnd(13)} ${result.quote_title}`,
    ];
    if (form?.project_location) {
      metaLeft.push(`${labels.locationLabel.padEnd(13)} ${form.project_location}`);
    }
    metaLeft.forEach((line) => {
      doc.text(line, margin, y);
      y += 4.5;
    });

    // Dates on the right
    const metaRightY = y - metaLeft.length * 4.5;
    doc.text(`${labels.dateLabel.padEnd(16)} ${formatDateNL(quoteDate)}`, rightCol, metaRightY, { align: "right" });
    doc.text(`${labels.expiryLabel.padEnd(16)} ${formatDateNL(expiryDate)}`, rightCol, metaRightY + 4.5, { align: "right" });
    if (result.estimated_days > 0) {
      const wdLabel = result.estimated_days !== 1 ? labels.workdays : labels.workday;
      doc.text(
        `${labels.durationLabel.padEnd(16)} ${result.estimated_days} ${wdLabel}`,
        rightCol,
        metaRightY + 9,
        { align: "right" }
      );
    }

    y += 8;

    // -- Horizontal line --
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, rightCol, y);
    y += 10;

    // -- Greeting / intro --
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    const clientFirstName = (form?.client_name || "").split(" ")[0];
    const greeting = clientFirstName
      ? `${labels.dear} ${form?.client_name},`
      : labels.dearFormal;
    doc.text(greeting, margin, y);
    y += 6;

    const introText = `${labels.introPrefix} ${(result.quote_title || "de werkzaamheden").toLowerCase()}${form?.project_location ? ` ${labels.introLocation} ${form.project_location}` : ""}.`;
    const introWrapped = doc.splitTextToSize(introText, pageWidth - margin * 2);
    doc.text(introWrapped, margin, y);
    y += introWrapped.length * 4 + 8;

    // -- Project introduction (summary) --
    if (result.summary) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(71, 85, 105);
      const summaryWrapped = doc.splitTextToSize(result.summary, pageWidth - margin * 2);
      doc.text(summaryWrapped, margin, y);
      y += summaryWrapped.length * 4 + 8;
    }

    // ============================================================
    // MODULE DESCRIPTIONS (all modes; hoogover skips bullet items)
    // ============================================================
    if (result.modules && result.modules.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(labels.techSection, margin, y);
      y += 8;

      result.modules.forEach((mod) => {
        if (y > 245) {
          doc.addPage();
          y = 20;
        }

        // Module name
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 65, 85);
        doc.text(mod.name, margin, y);
        y += 5;

        // Module intro
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        const introLines = doc.splitTextToSize(
          mod.intro,
          pageWidth - margin * 2
        );
        doc.text(introLines, margin, y);
        y += introLines.length * 3.5 + 2;

        // Bullet items — skipped for hoogover mode
        if (displayMode !== "hoogover") {
          mod.items.forEach((item) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            const itemWrapped = doc.splitTextToSize(
              `•  ${item}`,
              pageWidth - margin * 2 - 5
            );
            doc.text(itemWrapped, margin + 3, y);
            y += itemWrapped.length * 3.5 + 0.5;
          });
        }

        y += 5;
      });
    }

    // ============================================================
    // PRICE TABLE — rendered based on displayMode
    // ============================================================
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    const categories = [...new Set(result.lines.map((l) => l.category))];

    if (displayMode === "open") {
      // ── Smaak 1: Open begroting — alle regels zichtbaar ──────────
      const tableBody: (
        | string
        | { content: string; styles?: Record<string, unknown> }
      )[][] = [];

      categories.forEach((category) => {
        tableBody.push([
          {
            content: category,
            styles: {
              fontStyle: "bold",
              fillColor: [248, 250, 252],
              textColor: [51, 65, 85],
            },
          },
          { content: "", styles: { fillColor: [248, 250, 252] } },
          { content: "", styles: { fillColor: [248, 250, 252] } },
          { content: "", styles: { fillColor: [248, 250, 252] } },
          { content: "", styles: { fillColor: [248, 250, 252] } },
        ]);

        result.lines
          .filter((l) => l.category === category)
          .forEach((line) => {
            tableBody.push([
              line.description,
              line.type === "materiaal" ? labels.typeMaterial : labels.typeLabor,
              `${line.quantity} ${line.unit}`,
              formatCurrency(line.unit_price),
              formatCurrency(line.total),
            ]);
          });
      });

      autoTable(doc, {
        startY: y,
        head: [[labels.colDesc, labels.colType, labels.colAmount, labels.colPrice, labels.colTotal]],
        body: tableBody,
        theme: "striped",
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 8.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 22, halign: "center" },
          2: { cellWidth: 25, halign: "right" },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 28, halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;
    } else if (displayMode === "module") {
      // ── Smaak 2: Per module — totaalprijs per module ──────────────
      // Distribute margin proportionally across modules
      const totalLinesSum =
        result.subtotal_materials + result.subtotal_labor;

      const moduleTableBody = categories.map((cat) => {
        const catSum = result.lines
          .filter((l) => l.category === cat)
          .reduce((s, l) => s + l.total, 0);
        const moduleTotal =
          totalLinesSum > 0
            ? (catSum / totalLinesSum) * result.total_excl_btw
            : catSum;
        return [cat, formatCurrency(moduleTotal)];
      });

      autoTable(doc, {
        startY: y,
        head: [[labels.colModule, labels.colPriceExcl]],
        body: moduleTableBody,
        theme: "striped",
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 8.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 40, halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    // displayMode === "hoogover": no price table — only module descriptions + grand total

    // ============================================================
    // TOTALS — architecture rule: NEVER show margin amount
    // ============================================================
    if (y > 235) {
      doc.addPage();
      y = 20;
    }

    const totalsX = pageWidth - margin - 70;
    const valuesX = rightCol;

    if (displayMode !== "hoogover") {
      // Smaak 1 & 2: show excl. BTW + BTW + incl. BTW
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);

      doc.text(labels.totalExcl, totalsX, y);
      doc.text(formatCurrency(result.total_excl_btw), valuesX, y, {
        align: "right",
      });
      y += 5;

      doc.text(labels.btw, totalsX, y);
      doc.text(formatCurrency(result.btw_amount), valuesX, y, {
        align: "right",
      });
      y += 5;

      doc.setDrawColor(203, 213, 225);
      doc.line(totalsX, y, valuesX, y);
      y += 6;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(21, 128, 61);
    doc.text(labels.totalIncl, totalsX, y);
    doc.text(formatCurrency(result.total_incl_btw), valuesX, y, {
      align: "right",
    });
    y += 12;

    // ============================================================
    // NOTES
    // ============================================================
    if (result.notes) {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(labels.notes, margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const noteLines = doc.splitTextToSize(
        result.notes,
        pageWidth - margin * 2
      );
      doc.text(noteLines, margin, y);
      y += noteLines.length * 4 + 8;
    }

    // ============================================================
    // UITSLUITINGEN
    // ============================================================
    if (result.uitsluitingen && result.uitsluitingen.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text(labels.exclusions, margin, y);
      y += 6;

      result.uitsluitingen.forEach((item, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        const itemText = `${index + 1}.  ${item}`;
        const wrapped = doc.splitTextToSize(itemText, pageWidth - margin * 2 - 5);
        doc.text(wrapped, margin + 3, y);
        y += wrapped.length * 3.5 + 1.5;
      });

      y += 6;
    }

    // ============================================================
    // CLOSING / SIGNATURE BLOCK
    // ============================================================
    if (y > 245) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, rightCol, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(
      `${labels.validUntil} ${formatDateNL(expiryDate)}.`,
      margin,
      y
    );
    y += 5;
    doc.text(labels.closing1, margin, y);
    y += 5;
    doc.text(labels.closing2, margin, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text(p.business_name || "", margin, y);

    // ============================================================
    // KEURMERK IMAGES — pre-process before footer loop
    // ============================================================
    interface KeurmerkRender {
      name: string;
      imgData: string | null;
      w: number; // mm
      h: number; // mm
    }
    const keurmerkRenders: KeurmerkRender[] = [];
    const rawKeurmerken = (p.keurmerken ?? []) as Array<{
      id: string;
      name: string;
      logo_url: string | null;
    }>;
    const kH = 8; // max logo height in mm

    for (const k of rawKeurmerken) {
      if (k.logo_url) {
        try {
          const kRes = await fetch(k.logo_url);
          if (kRes.ok) {
            const kBuf = await kRes.arrayBuffer();
            const kB64 = Buffer.from(kBuf).toString("base64");
            const kCT = kRes.headers.get("content-type") || "image/png";
            const kImgData = `data:${kCT};base64,${kB64}`;
            const kProps = doc.getImageProperties(kImgData);
            const scale = kH / kProps.height;
            keurmerkRenders.push({
              name: k.name,
              imgData: kImgData,
              w: Math.round(kProps.width * scale * 10) / 10,
              h: kH,
            });
          } else {
            keurmerkRenders.push({ name: k.name, imgData: null, w: 0, h: kH });
          }
        } catch {
          keurmerkRenders.push({ name: k.name, imgData: null, w: 0, h: kH });
        }
      } else {
        keurmerkRenders.push({ name: k.name, imgData: null, w: 0, h: kH });
      }
    }

    // ============================================================
    // FOOTER on every page
    // ============================================================
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageH = doc.internal.pageSize.getHeight();

      // Keurmerk logos/badges — right-aligned, above footer line
      if (keurmerkRenders.length > 0) {
        const kLogoY = pageH - 24; // 8mm logos + 1mm gap above footer line
        let kLogoX = rightCol;

        for (let ki = keurmerkRenders.length - 1; ki >= 0; ki--) {
          const k = keurmerkRenders[ki];
          if (k.imgData) {
            kLogoX -= k.w;
            doc.addImage(k.imgData, "PNG", kLogoX, kLogoY, k.w, k.h);
            kLogoX -= 2;
          } else {
            // Text badge for presets without uploaded logo
            doc.setFontSize(5.5);
            doc.setFont("helvetica", "normal");
            const textW = doc.getTextWidth(k.name);
            const badgeW = textW + 3;
            kLogoX -= badgeW;
            doc.setDrawColor(203, 213, 225);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(kLogoX, kLogoY, badgeW, kH, 1, 1, "FD");
            doc.setTextColor(71, 85, 105);
            doc.text(k.name, kLogoX + 1.5, kLogoY + 5.5);
            kLogoX -= 2;
          }
        }
      }

      // Footer line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, pageH - 15, rightCol, pageH - 15);

      // Footer text
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);

      const footerParts: string[] = [];
      if (p.business_name) footerParts.push(p.business_name);
      if (p.business_address)
        footerParts.push(
          [p.business_address, p.business_postal_code, p.business_city]
            .filter(Boolean)
            .join(", ")
        );
      if (p.kvk_number) footerParts.push(`KvK: ${p.kvk_number}`);
      if (p.btw_number) footerParts.push(`BTW: ${p.btw_number}`);
      if (p.iban) footerParts.push(`IBAN: ${p.iban}`);

      if (footerParts.length > 0) {
        const footerText = footerParts.join("  |  ");
        const footerWrapped = doc.splitTextToSize(
          footerText,
          pageWidth - margin * 2
        );
        doc.text(footerWrapped, pageWidth / 2, pageH - 12, {
          align: "center",
        });
      }

      // Page number
      doc.text(`${i} / ${pageCount}`, rightCol, pageH - 8, {
        align: "right",
      });
    }

    // Return PDF
    const pdfBuffer = doc.output("arraybuffer");
    const clientNameSafe = (
      quote.client_name ||
      form?.client_name ||
      "Klant"
    ).replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Offerte-${quoteNumber}-${clientNameSafe}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "PDF generation failed", details: message },
      { status: 500 }
    );
  }
}
