"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, DisplayMode, Keurmerk, Language } from "@/lib/types";
import { Save, Loader2, Upload, X, Image as ImageIcon, Zap, Check, ExternalLink, Lock, Award } from "lucide-react";

const PRESET_KEURMERKEN = [
  "Bouwend Nederland",
  "VBW",
  "Erkend Renovatiebedrijf",
  "KOMO",
  "SKH",
  "Vakdiploma Dakdekker",
  "Uneto-VNI",
];
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/usage-limits";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<Profile>>({
    business_name: "",
    business_address: "",
    business_postal_code: "",
    business_city: "",
    business_phone: "",
    business_email: "",
    kvk_number: "",
    btw_number: "",
    iban: "",
    hourly_rate: 45,
    margin_percentage: 15,
    quote_validity_days: 30,
    quote_number_prefix: "",
    default_display_mode: "open" as DisplayMode,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [keurmerken, setKeurmerken] = useState<Keurmerk[]>([]);
  const [uploadingKeurmerk, setUploadingKeurmerk] = useState(false);
  const keurmerkInputRef = useRef<HTMLInputElement>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [quotesUsed, setQuotesUsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      }
      setKeurmerken((data.keurmerken as Keurmerk[] | null) ?? []);
    }

    // Load quotes used this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabase
      .from("token_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("endpoint", "generate-quote")
      .gte("created_at", monthStart);
    setQuotesUsed(count ?? 0);

    setLoading(false);
  }

  const [uploadError, setUploadError] = useState<string | null>(null);

  function togglePreset(name: string) {
    const existing = keurmerken.find(
      (k) => k.name === name && k.type === "preset"
    );
    if (existing) {
      setKeurmerken(keurmerken.filter((k) => k.id !== existing.id));
    } else if (keurmerken.length < 4) {
      setKeurmerken([
        ...keurmerken,
        {
          id: crypto.randomUUID(),
          name,
          logo_url: null,
          type: "preset",
        },
      ]);
    }
  }

  function removeKeurmerk(id: string) {
    setKeurmerken(keurmerken.filter((k) => k.id !== id));
  }

  async function handleKeurmerkUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKeurmerk(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-keurmerk", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const name = file.name.replace(/\.[^.]+$/, "");
        setKeurmerken([
          ...keurmerken,
          {
            id: crypto.randomUUID(),
            name,
            logo_url: data.logoUrl,
            type: "custom",
          },
        ]);
      }
    } catch {
      // ignore — user can retry
    }

    setUploadingKeurmerk(false);
    if (keurmerkInputRef.current) keurmerkInputRef.current.value = "";
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload mislukt");
      } else {
        setLogoPreview(data.logoUrl);
        setProfile({ ...profile, logo_url: data.logoUrl });
      }
    } catch {
      setUploadError("Upload mislukt. Probeer opnieuw.");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveLogo() {
    setLogoPreview(null);
    setProfile({ ...profile, logo_url: null });

    await fetch("/api/upload-logo", { method: "DELETE" });
  }

  async function handleCheckout(planId: string) {
    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Ignore — user can retry
    }
    setCheckoutLoading(null);
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Ignore
    }
    setPortalLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: profile.business_name,
        business_address: profile.business_address,
        business_postal_code: profile.business_postal_code,
        business_city: profile.business_city,
        business_phone: profile.business_phone,
        business_email: profile.business_email,
        kvk_number: profile.kvk_number,
        btw_number: profile.btw_number,
        iban: profile.iban,
        hourly_rate: profile.hourly_rate,
        margin_percentage: profile.margin_percentage,
        quote_validity_days: profile.quote_validity_days,
        quote_number_prefix: profile.quote_number_prefix,
        default_display_mode: profile.default_display_mode,
        default_language: profile.default_language ?? "nl",
        keurmerken: keurmerken,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
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
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Instellingen</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-2xl">
        <div className="p-4 md:p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            Bedrijfsprofiel
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Deze gegevens worden gebruikt voor je offertes
          </p>
        </div>

        <form onSubmit={handleSave} className="p-4 md:p-6 space-y-5">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bedrijfslogo
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Bedrijfslogo"
                    className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Uploaden..." : "Logo uploaden"}
                </button>
                <p className="text-xs text-slate-400 mt-1">
                  PNG, JPG of SVG. Wordt getoond op je offertes.
                </p>
                {uploadError && (
                  <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bedrijfsnaam
            </label>
            <input
              type="text"
              value={profile.business_name ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, business_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              placeholder="Jouw Bedrijf B.V."
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Adres
            </label>
            <input
              type="text"
              value={profile.business_address ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, business_address: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              placeholder="Kaasjeskruidstraat 13"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Postcode
              </label>
              <input
                type="text"
                value={profile.business_postal_code ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, business_postal_code: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="1032LS"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plaats
              </label>
              <input
                type="text"
                value={profile.business_city ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, business_city: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="Amsterdam"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Telefoon
              </label>
              <input
                type="tel"
                value={profile.business_phone ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, business_phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="020-1234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={profile.business_email ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, business_email: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="info@jouwbedrijf.nl"
              />
            </div>
          </div>

          {/* Registration numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                KvK-nummer
              </label>
              <input
                type="text"
                value={profile.kvk_number ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, kvk_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                BTW-nummer
              </label>
              <input
                type="text"
                value={profile.btw_number ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, btw_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
                placeholder="NL001234567B01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              IBAN
            </label>
            <input
              type="text"
              value={profile.iban ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, iban: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              placeholder="NL32 ABNA 0464 9587 17"
            />
          </div>

          {/* Pricing & Quote settings */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Offerte-instellingen</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Offertenummer prefix
            </label>
            <input
              type="text"
              value={profile.quote_number_prefix ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, quote_number_prefix: e.target.value })
              }
              className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              placeholder="bijv. OFF-"
            />
            <p className="text-xs text-slate-400 mt-1">
              Optioneel. Voorbeeld: OFF-2026-001. Laat leeg voor 2026-001.
            </p>
          </div>

          {/* Default display mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Standaard offerte-smaak
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Bepaalt hoeveel detail de klant standaard ziet in de PDF. Je kunt
              dit per offerte aanpassen.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    value: "open",
                    label: "Open begroting",
                    description: "Alle regels zichtbaar",
                  },
                  {
                    value: "module",
                    label: "Per module",
                    description: "Totaalprijs per module",
                  },
                  {
                    value: "hoogover",
                    label: "Hoog-over",
                    description: "Één eindtotaal",
                  },
                ] as { value: DisplayMode; label: string; description: string }[]
              ).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() =>
                    setProfile({ ...profile, default_display_mode: m.value })
                  }
                  className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition ${
                    profile.default_display_mode === m.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      profile.default_display_mode === m.value
                        ? "text-brand-700"
                        : "text-slate-700"
                    }`}
                  >
                    {m.label}
                  </span>
                  <span className="text-xs text-slate-500">{m.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Default language */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Standaard taal voor offertes
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { code: "nl", flag: "🇳🇱", label: "Nederlands" },
                  { code: "en", flag: "🇬🇧", label: "English" },
                  { code: "de", flag: "🇩🇪", label: "Deutsch" },
                  { code: "pl", flag: "🇵🇱", label: "Polski" },
                ] as { code: Language; flag: string; label: string }[]
              ).map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setProfile({ ...profile, default_language: lang.code })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    (profile.default_language ?? "nl") === lang.code
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Uurtarief (&euro;)
              </label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={profile.hourly_rate ?? 45}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    hourly_rate: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Marge (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={profile.margin_percentage ?? 15}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    margin_percentage: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Geldigheid (dagen)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={profile.quote_validity_days ?? 30}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    quote_validity_days: parseInt(e.target.value) || 30,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
              />
            </div>
          </div>

          {/* Keurmerken & lidmaatschappen */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">
                Keurmerken & lidmaatschappen
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Verschijnen in de footer van je offertes. Maximaal 4.
            </p>

            {/* Preset pills */}
            <p className="text-xs font-medium text-slate-600 mb-1.5">
              Kies uit bekende organisaties:
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_KEURMERKEN.map((name) => {
                const isAdded = keurmerken.some(
                  (k) => k.name === name && k.type === "preset"
                );
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => togglePreset(name)}
                    disabled={!isAdded && keurmerken.length >= 4}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition disabled:opacity-40 ${
                      isAdded
                        ? "bg-brand-100 border-brand-400 text-brand-700"
                        : "bg-white border-slate-300 text-slate-600 hover:border-brand-400 hover:bg-slate-50"
                    }`}
                  >
                    {isAdded ? "✓ " : ""}
                    {name}
                  </button>
                );
              })}
            </div>

            {/* Custom upload */}
            <input
              ref={keurmerkInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleKeurmerkUpload}
              className="hidden"
            />
            {keurmerken.length < 4 && (
              <button
                type="button"
                onClick={() => keurmerkInputRef.current?.click()}
                disabled={uploadingKeurmerk}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 mb-3"
              >
                {uploadingKeurmerk ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingKeurmerk ? "Uploaden..." : "Eigen keurmerk-logo uploaden"}
              </button>
            )}

            {/* Active keurmerken */}
            {keurmerken.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keurmerken.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                  >
                    {k.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={k.logo_url}
                        alt={k.name}
                        className="h-5 object-contain"
                      />
                    )}
                    <span className="text-xs text-slate-700">{k.name}</span>
                    <button
                      type="button"
                      onClick={() => removeKeurmerk(k.id)}
                      className="text-slate-400 hover:text-red-500 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <span className="text-xs text-slate-400 self-center">
                  {keurmerken.length}/4
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Opslaan
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                Instellingen opgeslagen!
              </span>
            )}
            {saveError && (
              <span className="text-sm text-red-600 font-medium">
                Opslaan mislukt: {saveError}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Password Change */}
      <PasswordChangeCard />

      {/* Subscription */}
      <SubscriptionCard
        tier={(profile.subscription_tier as SubscriptionTier) ?? "free"}
        quotesUsed={quotesUsed}
        checkoutLoading={checkoutLoading}
        portalLoading={portalLoading}
        onCheckout={handleCheckout}
        onPortal={handlePortal}
      />
    </div>
  );
}

function PasswordChangeCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Wachtwoord moet minimaal 6 tekens bevatten.");
      return;
    }

    setSaving(true);

    // Verify current password by attempting sign-in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError("Kan gebruiker niet verifiëren.");
      setSaving(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setError("Huidig wachtwoord is onjuist.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-2xl mt-6">
      <div className="p-4 md:p-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Wachtwoord wijzigen</h2>
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="p-4 md:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Huidig wachtwoord
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nieuw wachtwoord
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
            placeholder="Minimaal 6 tekens"
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Bevestig nieuw wachtwoord
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-800"
            required
            minLength={6}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg max-w-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Wachtwoord wijzigen
          </button>
          {success && (
            <span className="text-sm text-green-600 font-medium">
              Wachtwoord gewijzigd!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

const PLAN_FEATURES: Record<string, { price: number; features: string[] }> = {
  free: {
    price: 0,
    features: ["10 AI-offertes per maand", "PDF export", "Eigen materialen"],
  },
  pro: {
    price: 19,
    features: [
      "50 AI-offertes per maand",
      "PDF export",
      "Eigen materialen",
      "E-mail support",
    ],
  },
  business: {
    price: 49,
    features: [
      "Onbeperkt AI-offertes",
      "Alles van Pro",
      "Prioriteit support",
      "Meerdere gebruikers (binnenkort)",
    ],
  },
};

function SubscriptionCard({
  tier,
  quotesUsed,
  checkoutLoading,
  portalLoading,
  onCheckout,
  onPortal,
}: {
  tier: SubscriptionTier;
  quotesUsed: number;
  checkoutLoading: string | null;
  portalLoading: boolean;
  onCheckout: (planId: string) => void;
  onPortal: () => void;
}) {
  const limits = TIER_LIMITS[tier];
  const plans = ["free", "pro", "business"] as const;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-2xl mt-6">
      <div className="p-4 md:p-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-slate-800">Abonnement</h2>
          <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">
            {limits.label}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {limits.quotesPerMonth > 0
            ? `${quotesUsed} / ${limits.quotesPerMonth} offertes gebruikt deze maand`
            : "Onbeperkt gebruik"}
        </p>
        {limits.quotesPerMonth > 0 && (
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${
                quotesUsed >= limits.quotesPerMonth
                  ? "bg-red-500"
                  : quotesUsed >= limits.quotesPerMonth * 0.8
                  ? "bg-yellow-500"
                  : "bg-brand-500"
              }`}
              style={{
                width: `${Math.min(100, (quotesUsed / limits.quotesPerMonth) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((planId) => {
          const plan = PLAN_FEATURES[planId];
          const isCurrent = planId === tier;
          const isUpgrade =
            plans.indexOf(planId) > plans.indexOf(tier);

          return (
            <div
              key={planId}
              className={`rounded-lg border-2 p-4 ${
                isCurrent
                  ? "border-brand-500 bg-brand-50/50"
                  : "border-slate-200"
              }`}
            >
              <div className="text-sm font-semibold text-slate-800 mb-1">
                {TIER_LIMITS[planId].label}
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {plan.price === 0 ? (
                  "Gratis"
                ) : (
                  <>
                    &euro;{plan.price}
                    <span className="text-sm font-normal text-slate-500">
                      /maand
                    </span>
                  </>
                )}
              </div>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-1.5 text-xs text-slate-600"
                  >
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                {isCurrent ? (
                  <span className="block text-center text-xs font-medium text-brand-600 py-2">
                    Huidig plan
                  </span>
                ) : isUpgrade ? (
                  <button
                    onClick={() => onCheckout(planId)}
                    disabled={!!checkoutLoading}
                    className="w-full flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {checkoutLoading === planId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Upgraden
                  </button>
                ) : (
                  <span className="block text-center text-xs text-slate-400 py-2">
                    &mdash;
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tier !== "free" && (
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <button
            onClick={onPortal}
            disabled={portalLoading}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            Abonnement beheren via Stripe
          </button>
        </div>
      )}
    </div>
  );
}
