"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Save, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<Profile>>({
    business_name: "",
    hourly_rate: 45,
    margin_percentage: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
    }
    setLoading(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/logo.${fileExt}`;

    const { error } = await supabase.storage
      .from("logos")
      .upload(filePath, file, { upsert: true });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("logos").getPublicUrl(filePath);

      const logoUrl = `${publicUrl}?t=${Date.now()}`;
      setLogoPreview(logoUrl);
      setProfile({ ...profile, logo_url: logoUrl });

      await supabase
        .from("profiles")
        .update({ logo_url: logoUrl })
        .eq("id", user.id);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveLogo() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setLogoPreview(null);
    setProfile({ ...profile, logo_url: null });

    await supabase
      .from("profiles")
      .update({ logo_url: null })
      .eq("id", user.id);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        business_name: profile.business_name,
        hourly_rate: profile.hourly_rate,
        margin_percentage: profile.margin_percentage,
      })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Instellingen</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-2xl">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            Bedrijfsprofiel
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Deze gegevens worden gebruikt voor je offertes
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </form>
      </div>
    </div>
  );
}
