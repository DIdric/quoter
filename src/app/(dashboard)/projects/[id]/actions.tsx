"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Check,
  Undo2,
  Sparkles,
  Download,
  Mail,
  Loader2,
} from "lucide-react";

export function QuoteActions({
  quoteId,
  status,
  clientName,
  clientEmail,
}: {
  quoteId: string;
  status: string;
  clientName?: string;
  clientEmail?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const router = useRouter();
  const supabase = createClient();

  async function updateStatus(newStatus: "draft" | "final") {
    setLoading(true);
    await supabase
      .from("quotes")
      .update({ status: newStatus })
      .eq("id", quoteId);
    setCurrentStatus(newStatus);
    setLoading(false);
    router.refresh();
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/generate-pdf/${quoteId}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] || "offerte.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    }
    setDownloading(false);
  }

  function handleSendEmail() {
    const subject = encodeURIComponent(
      `Offerte${clientName ? ` - ${clientName}` : ""}`
    );
    const body = encodeURIComponent(
      `Beste${clientName ? ` ${clientName}` : ""},\n\nBijgaand vindt u de offerte.\n\nMet vriendelijke groet`
    );
    const mailto = `mailto:${clientEmail || ""}?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {currentStatus === "draft" ? (
          <button
            onClick={() => updateStatus("final")}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition disabled:opacity-50 text-sm md:text-base"
          >
            <Check className="w-4 h-4" />
            Markeer als definitief
          </button>
        ) : (
          <button
            onClick={() => updateStatus("draft")}
            disabled={loading}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition disabled:opacity-50 text-sm md:text-base"
          >
            <Undo2 className="w-4 h-4" />
            Terugzetten naar concept
          </button>
        )}
        <a
          href={`/quotes/new?project=${quoteId}`}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition text-sm md:text-base"
        >
          <Sparkles className="w-4 h-4" />
          Opnieuw genereren
        </a>
      </div>

      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-4 rounded-lg ${currentStatus === "final" ? "bg-green-50 border border-green-200" : "bg-slate-50 border border-slate-200"}`}>
        <span className={`text-sm font-medium sm:mr-auto ${currentStatus === "final" ? "text-green-700" : "text-slate-600"}`}>
          {currentStatus === "final" ? "Offerte is definitief" : "Concept offerte"}
        </span>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className={`flex items-center gap-2 bg-white border font-medium px-3 py-2 md:px-4 rounded-lg transition text-sm disabled:opacity-50 ${currentStatus === "final" ? "border-green-300 hover:bg-green-50 text-green-700" : "border-slate-300 hover:bg-slate-100 text-slate-700"}`}
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Download</span> PDF
          </button>
          {currentStatus === "final" && (
            <button
              onClick={() => {
                handleDownloadPdf().then(() => {
                  setTimeout(handleSendEmail, 500);
                });
              }}
              disabled={downloading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 md:px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Verstuur per</span> email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
