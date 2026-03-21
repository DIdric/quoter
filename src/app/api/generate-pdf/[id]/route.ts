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
}

type DisplayMode = "open" | "module" | "hoogover";

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
      `Offerte:     ${quoteNumber}`,
      `Betreft:     ${result.quote_title}`,
    ];
    if (form?.project_location) {
      metaLeft.push(`Locatie:     ${form.project_location}`);
    }
    metaLeft.forEach((line) => {
      doc.text(line, margin, y);
      y += 4.5;
    });

    // Dates on the right
    const metaRightY = y - metaLeft.length * 4.5;
    doc.text(`Offertedatum:   ${formatDateNL(quoteDate)}`, rightCol, metaRightY, { align: "right" });
    doc.text(`Vervaldatum:    ${formatDateNL(expiryDate)}`, rightCol, metaRightY + 4.5, { align: "right" });
    if (result.estimated_days > 0) {
      doc.text(
        `Doorlooptijd:   ${result.estimated_days} werkdag${result.estimated_days !== 1 ? "en" : ""}`,
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
      ? `Beste ${form?.client_name},`
      : "Geachte heer/mevrouw,";
    doc.text(greeting, margin, y);
    y += 6;

    const introText = `Hierbij zenden wij u onze vrijblijvende offerte ten behoeve van ${(result.quote_title || "de werkzaamheden").toLowerCase()}${form?.project_location ? ` te ${form.project_location}` : ""}.`;
    const introWrapped = doc.splitTextToSize(introText, pageWidth - margin * 2);
    doc.text(introWrapped, margin, y);
    y += introWrapped.length * 4 + 8;

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
      doc.text("Technische omschrijving werkzaamheden", margin, y);
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
              line.type === "materiaal" ? "Materiaal" : "Arbeid",
              `${line.quantity} ${line.unit}`,
              formatCurrency(line.unit_price),
              formatCurrency(line.total),
            ]);
          });
      });

      autoTable(doc, {
        startY: y,
        head: [["Omschrijving", "Type", "Aantal", "Prijs", "Totaal"]],
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
        head: [["Module", "Prijs excl. BTW"]],
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

      doc.text("Totaal excl. BTW", totalsX, y);
      doc.text(formatCurrency(result.total_excl_btw), valuesX, y, {
        align: "right",
      });
      y += 5;

      doc.text("BTW (21%)", totalsX, y);
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
    doc.text("Totaal incl. BTW", totalsX, y);
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
      doc.text("Opmerkingen:", margin, y);
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
      `Deze offerte is geldig tot ${formatDateNL(expiryDate)}.`,
      margin,
      y
    );
    y += 5;
    doc.text(
      "Wij vertrouwen erop u hiermee een passende aanbieding te hebben gedaan.",
      margin,
      y
    );
    y += 5;
    doc.text("Met vriendelijke groet,", margin, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text(p.business_name || "", margin, y);

    // ============================================================
    // FOOTER on every page
    // ============================================================
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageH = doc.internal.pageSize.getHeight();

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
