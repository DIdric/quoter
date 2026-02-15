import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Extend jsPDF type for autotable plugin
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
    lastAutoTable: { finalY: number };
  }
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
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch quote
  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch profile for business name and logo
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const jsonData = quote.json_data as QuoteJsonData | null;
  const form = jsonData?.form;
  const result = jsonData?.result;

  if (!result) {
    return NextResponse.json(
      { error: "No quote data available" },
      { status: 400 }
    );
  }

  // Generate PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // -- Logo + Business name header --
  let logoLoaded = false;
  if (profile?.logo_url) {
    try {
      const logoRes = await fetch(profile.logo_url);
      if (logoRes.ok) {
        const buffer = await logoRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = logoRes.headers.get("content-type") || "image/png";
        const imgData = `data:${contentType};base64,${base64}`;
        doc.addImage(imgData, "PNG", margin, y, 30, 30);
        logoLoaded = true;
      }
    } catch {
      // Logo could not be loaded, continue without it
    }
  }

  const headerX = logoLoaded ? margin + 35 : margin;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(profile?.business_name || "Offerte", headerX, y + 10);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("OFFERTE", headerX, y + 18);

  y = logoLoaded ? y + 38 : y + 28;

  // -- Horizontal line --
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // -- Quote title & date --
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(result.quote_title, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const dateStr = new Date(quote.created_at).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`Datum: ${dateStr}`, margin, y);

  if (result.estimated_days > 0) {
    doc.text(
      `Geschatte doorlooptijd: ${result.estimated_days} werkdag${result.estimated_days !== 1 ? "en" : ""}`,
      pageWidth / 2,
      y
    );
  }
  y += 10;

  // -- Client info --
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Klant", margin, y);

  const clientX = pageWidth / 2;
  doc.text("Project", clientX, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600

  const clientLines: string[] = [];
  if (form?.client_name) clientLines.push(form.client_name);
  if (form?.client_email) clientLines.push(form.client_email);
  if (form?.client_phone) clientLines.push(form.client_phone);
  clientLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4.5;
  });

  let projectY = y - clientLines.length * 4.5;
  const projectLines: string[] = [];
  if (form?.project_title) projectLines.push(form.project_title);
  if (form?.project_location) projectLines.push(form.project_location);
  if (form?.project_description)
    projectLines.push(form.project_description.substring(0, 80));
  projectLines.forEach((line) => {
    doc.text(line, clientX, projectY);
    projectY += 4.5;
  });

  y = Math.max(y, projectY) + 6;

  // -- Quote lines table --
  const categories = [...new Set(result.lines.map((l) => l.category))];
  const tableBody: (string | { content: string; styles?: Record<string, unknown> })[][] = [];

  categories.forEach((category) => {
    // Category header row
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

  doc.autoTable({
    startY: y,
    head: [["Omschrijving", "Type", "Aantal", "Prijs", "Totaal"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [249, 115, 22], // orange-500
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Check if we need a new page for totals
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // -- Totals --
  const totalsX = pageWidth - margin - 70;
  const valuesX = pageWidth - margin;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);

  const totalsRows = [
    ["Materialen", formatCurrency(result.subtotal_materials)],
    ["Arbeid", formatCurrency(result.subtotal_labor)],
    ["Winstmarge", formatCurrency(result.margin_amount)],
  ];

  totalsRows.forEach(([label, value]) => {
    doc.text(label, totalsX, y);
    doc.text(value, valuesX, y, { align: "right" });
    y += 5;
  });

  // Line before totals
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX, y, valuesX, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Totaal excl. BTW", totalsX, y);
  doc.text(formatCurrency(result.total_excl_btw), valuesX, y, {
    align: "right",
  });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.text("BTW (21%)", totalsX, y);
  doc.text(formatCurrency(result.btw_amount), valuesX, y, { align: "right" });
  y += 5;

  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX, y, valuesX, y);
  y += 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(21, 128, 61); // green-700
  doc.text("Totaal incl. BTW", totalsX, y);
  doc.text(formatCurrency(result.total_incl_btw), valuesX, y, {
    align: "right",
  });
  y += 10;

  // -- Notes --
  if (result.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Opmerkingen:", margin, y);
    y += 5;
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(
      result.notes,
      pageWidth - margin * 2
    );
    doc.text(noteLines, margin, y);
  }

  // Return PDF
  const pdfBuffer = doc.output("arraybuffer");
  const clientNameSafe = (quote.client_name || form?.client_name || "Klant").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Offerte-${clientNameSafe}-${dateStr.replace(/\s/g, "-")}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
