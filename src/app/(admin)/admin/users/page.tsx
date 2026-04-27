"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Loader2, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

type Tier = "free" | "pro" | "pro_plus" | "business" | "business_plus";
type SortKey = keyof UserData;
type SortDir = "asc" | "desc";

interface UserData {
  id: string;
  business_name: string | null;
  business_email: string | null;
  business_city: string | null;
  auth_email: string | null;
  phone: string | null;
  subscription_tier: Tier;
  created_at: string;
  last_active: string | null;
  quote_count: number;
  total_tokens: number;
  total_cost: number;
}

const TIER_ORDER: Record<Tier, number> = {
  free: 0, pro: 1, pro_plus: 2, business: 3, business_plus: 4,
};

const TIER_STYLES: Record<Tier, string> = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-blue-100 text-blue-700",
  pro_plus: "bg-violet-100 text-violet-700",
  business: "bg-amber-100 text-amber-700",
  business_plus: "bg-emerald-100 text-emerald-700",
};

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_STYLES[tier] ?? TIER_STYLES.free}`}>
      {tier}
    </span>
  );
}

function TierSelect({ userId, current, onChanged }: { userId: string; current: Tier; onChanged: (t: Tier) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function changeTier(tier: Tier) {
    if (tier === current) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-user-tier", userId, tier }),
    });
    onChanged(tier);
    setSaving(false);
  }

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)} disabled={saving} className="flex items-center gap-1 group">
        <TierBadge tier={current} />
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[110px]">
            {(["free", "pro", "pro_plus", "business", "business_plus"] as Tier[]).map((t) => (
              <button
                key={t}
                onClick={() => changeTier(t)}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 transition ${t === current ? "font-medium" : ""}`}
              >
                <TierBadge tier={t} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 ml-1 inline" />
    : <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1 inline" />;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/admin?action=users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  function handleTierChanged(userId: string, tier: Tier) {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, subscription_tier: tier } : u));
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      let av: string | number | null = a[sortKey] as string | number | null;
      let bv: string | number | null = b[sortKey] as string | number | null;

      if (sortKey === "subscription_tier") {
        av = TIER_ORDER[a.subscription_tier] ?? 0;
        bv = TIER_ORDER[b.subscription_tier] ?? 0;
      }

      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;

      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [users, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const th = (label: string, key: SortKey, align: "left" | "right" = "left") => (
    <th
      className={`px-4 py-3 md:px-6 text-sm font-medium text-slate-500 cursor-pointer select-none hover:text-slate-700 transition ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => handleSort(key)}
    >
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          Gebruikers ({users.length})
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {sorted.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200">
                  {th("Bedrijf", "business_name")}
                  {th("E-mail", "auth_email")}
                  {th("Telefoon", "phone")}
                  {th("Tier", "subscription_tier")}
                  {th("Offertes", "quote_count", "right")}
                  {th("Tokens", "total_tokens", "right")}
                  {th("API Kosten", "total_cost", "right")}
                  {th("Aangemeld", "created_at")}
                  {th("Laatste activiteit", "last_active")}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sorted.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="font-medium text-slate-800">{user.business_name || "—"}</div>
                      {user.business_city && (
                        <div className="text-xs text-slate-400 mt-0.5">{user.business_city}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="text-slate-800">{user.auth_email || "—"}</div>
                      {user.business_email && user.business_email !== user.auth_email && (
                        <div className="text-xs text-slate-400 mt-0.5">Zakelijk: {user.business_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600">{user.phone || "—"}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <TierSelect
                        userId={user.id}
                        current={user.subscription_tier ?? "free"}
                        onChanged={(t) => handleTierChanged(user.id, t)}
                      />
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right text-slate-800">{user.quote_count}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right text-slate-800">{user.total_tokens.toLocaleString("nl-NL")}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right text-slate-800">€{user.total_cost.toFixed(2)}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600">
                      {new Date(user.created_at).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600">
                      {user.last_active ? new Date(user.last_active).toLocaleDateString("nl-NL") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Nog geen gebruikers</p>
          </div>
        )}
      </div>
    </div>
  );
}
