"use client";

import { useState, useEffect } from "react";
import { Users, Loader2 } from "lucide-react";

interface UserData {
  id: string;
  business_name: string | null;
  business_email: string | null;
  business_city: string | null;
  created_at: string;
  quote_count: number;
  total_tokens: number;
  total_cost: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin?action=users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          Gebruikers ({users.length})
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Bedrijf
                  </th>
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    E-mail
                  </th>
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Plaats
                  </th>
                  <th className="text-right px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Offertes
                  </th>
                  <th className="text-right px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Tokens
                  </th>
                  <th className="text-right px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    API Kosten
                  </th>
                  <th className="text-left px-4 py-3 md:px-6 text-sm font-medium text-slate-500">
                    Aangemeld
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-slate-800">
                      {user.business_name || "—"}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600">
                      {user.business_email || "—"}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600">
                      {user.business_city || "—"}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right text-slate-800">
                      {user.quote_count}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right text-slate-800">
                      {user.total_tokens.toLocaleString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right text-slate-800">
                      €{user.total_cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600">
                      {new Date(user.created_at).toLocaleDateString("nl-NL")}
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
