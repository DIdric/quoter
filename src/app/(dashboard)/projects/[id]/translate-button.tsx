"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, Loader2 } from "lucide-react";

const LANGUAGES = [
  { code: "en", flag: "🇬🇧", label: "Engels (EN)" },
  { code: "de", flag: "🇩🇪", label: "Duits (DE)" },
  { code: "pl", flag: "🇵🇱", label: "Pools (PL)" },
  { code: "nl", flag: "🇳🇱", label: "Nederlands (NL)" },
];

export function TranslateButton({
  quoteId,
  currentLanguage,
}: {
  quoteId: string;
  currentLanguage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const available = LANGUAGES.filter((l) => l.code !== (currentLanguage ?? "nl"));

  async function handleTranslate(targetLang: string) {
    setLoading(targetLang);
    try {
      const res = await fetch("/api/translate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId, target_language: targetLang }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/projects/${data.id}`);
      }
    } catch {
      // ignore — user can retry
    }
    setLoading(null);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
      >
        <Languages className="w-4 h-4" />
        Vertaal
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-52">
            <p className="text-xs text-slate-400 px-2 pb-1">
              Maakt een nieuwe vertaalde versie
            </p>
            {available.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleTranslate(lang.code)}
                disabled={loading !== null}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition disabled:opacity-50"
              >
                {loading === lang.code ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                ) : (
                  <span>{lang.flag}</span>
                )}
                {lang.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
