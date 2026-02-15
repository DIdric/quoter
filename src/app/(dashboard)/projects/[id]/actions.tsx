"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Check, Undo2, Sparkles } from "lucide-react";

export function QuoteActions({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="flex items-center gap-3 pt-2">
      {currentStatus === "draft" ? (
        <button
          onClick={() => updateStatus("final")}
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          Markeer als definitief
        </button>
      ) : (
        <button
          onClick={() => updateStatus("draft")}
          disabled={loading}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
        >
          <Undo2 className="w-4 h-4" />
          Terugzetten naar concept
        </button>
      )}
      <a
        href={`/quotes/new?project=${quoteId}`}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium px-4 py-2.5 rounded-lg transition"
      >
        <Sparkles className="w-4 h-4" />
        Opnieuw genereren
      </a>
    </div>
  );
}
