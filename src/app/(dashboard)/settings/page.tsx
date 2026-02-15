"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<Profile>>({
    business_name: "",
    hourly_rate: 45,
    margin_percentage: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    }
    setLoading(false);
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-800"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-800"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-50"
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
