"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Phone, MapPin, Pencil, Check, X } from "lucide-react";

interface ProjectForm {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  project_title?: string;
  project_description?: string;
  project_location?: string;
  ai_input?: string;
}

interface EditableProjectDetailsProps {
  quoteId: string;
  userId: string;
  initialForm: ProjectForm;
  initialClientName: string;
}

function Field({
  label,
  value,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onSave: (val: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <label className="text-xs text-slate-500">{label}</label>
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
            className="w-full px-2 py-1.5 text-sm border border-brand-400 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none text-slate-800"
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="w-full px-2 py-1.5 text-sm border border-brand-400 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-800"
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium"
          >
            <Check className="w-3.5 h-3.5" />
            Opslaan
          </button>
          <button
            onClick={cancel}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
            Annuleren
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="group flex items-start gap-1 w-full text-left hover:bg-slate-50 rounded px-1 -mx-1 transition"
      title={`${label} bewerken`}
    >
      <span className="flex-1 text-sm text-slate-700 min-h-[1.25rem]">
        {value || <span className="text-slate-400 italic">Niet ingevuld</span>}
      </span>
      <Pencil className="w-3 h-3 text-slate-300 group-hover:text-brand-500 transition shrink-0 mt-0.5" />
    </button>
  );
}

export function EditableProjectDetails({
  quoteId,
  userId,
  initialForm,
  initialClientName,
}: EditableProjectDetailsProps) {
  const [form, setForm] = useState<ProjectForm>(initialForm);
  const [clientName, setClientName] = useState(initialClientName);
  const supabase = createClient();

  async function saveFormField(field: keyof ProjectForm, value: string) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("json_data")
      .eq("id", quoteId)
      .eq("user_id", userId)
      .single();

    if (!quote) return;

    const jsonData = (quote.json_data as Record<string, unknown>) || {};
    const currentForm = (jsonData.form as Record<string, unknown>) || {};

    await supabase
      .from("quotes")
      .update({
        json_data: { ...jsonData, form: { ...currentForm, [field]: value } },
        ...(field === "client_name" ? { client_name: value } : {}),
      })
      .eq("id", quoteId)
      .eq("user_id", userId);

    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "client_name") setClientName(value);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
      {/* Klantgegevens */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Klantgegevens
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <Field
              label="Naam klant"
              value={clientName}
              onSave={(v) => saveFormField("client_name", v)}
            />
          </div>
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <Field
              label="E-mail"
              value={form.client_email ?? ""}
              onSave={(v) => saveFormField("client_email", v)}
            />
          </div>
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <Field
              label="Telefoon"
              value={form.client_phone ?? ""}
              onSave={(v) => saveFormField("client_phone", v)}
            />
          </div>
        </div>
      </div>

      {/* Projectdetails */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Projectdetails
        </h2>
        <div className="space-y-3">
          <Field
            label="Projecttitel"
            value={form.project_title ?? ""}
            onSave={(v) => saveFormField("project_title", v)}
          />
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <Field
              label="Locatie"
              value={form.project_location ?? ""}
              onSave={(v) => saveFormField("project_location", v)}
            />
          </div>
          <Field
            label="Omschrijving"
            value={form.project_description ?? ""}
            multiline
            onSave={(v) => saveFormField("project_description", v)}
          />
        </div>
      </div>
    </div>
  );
}
