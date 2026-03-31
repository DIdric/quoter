"use client";

import { useState, useEffect } from "react";
import { Loader2, Activity, FileText } from "lucide-react";

interface QuoteFeedItem {
  id: string;
  user_id: string;
  business_name: string;
  client_name: string | null;
  quote_number: string | null;
  status: string;
  created_at: string;
}

interface UsageByDay {
  [date: string]: { tokens: number; cost: number; requests: number };
}

interface UsageByUser {
  [userId: string]: { tokens: number; cost: number; requests: number; name: string };
}

export default function AdminUsagePage() {
  const [byDay, setByDay] = useState<UsageByDay>({});
  const [byUser, setByUser] = useState<UsageByUser>({});
  const [quotesFeed, setQuotesFeed] = useState<QuoteFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin?action=usage&days=${days}`).then((r) => r.json()),
      fetch(`/api/admin?action=quotes-feed&days=${days}`).then((r) => r.json()),
    ]).then(([usage, feed]) => {
      setByDay(usage.byDay ?? {});
      setByUser(usage.byUser ?? {});
      setQuotesFeed(feed.quotes ?? []);
    }).finally(() => setLoading(false));
  }, [days]);

  const sortedDays = Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a));
  const sortedUsers = Object.entries(byUser).sort(
    ([, a], [, b]) => b.cost - a.cost
  );

  const totalTokens = Object.values(byDay).reduce((s, d) => s + d.tokens, 0);
  const totalCost = Object.values(byDay).reduce((s, d) => s + d.cost, 0);
  const totalRequests = Object.values(byDay).reduce((s, d) => s + d.requests, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          API Gebruik
        </h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white"
        >
          <option value={7}>Laatste 7 dagen</option>
          <option value={30}>Laatste 30 dagen</option>
          <option value={90}>Laatste 90 dagen</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 text-center">
          <p className="text-2xl font-bold text-slate-800">{totalRequests}</p>
          <p className="text-sm text-slate-500">Requests</p>
        </div>
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 text-center">
          <p className="text-2xl font-bold text-slate-800">
            {totalTokens.toLocaleString("nl-NL")}
          </p>
          <p className="text-sm text-slate-500">Tokens</p>
        </div>
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 text-center">
          <p className="text-2xl font-bold text-slate-800">
            €{totalCost.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500">Kosten</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per day */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-4 py-4 md:px-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Per dag</h2>
          </div>
          {sortedDays.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Datum</th>
                    <th className="text-right px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Requests</th>
                    <th className="text-right px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Tokens</th>
                    <th className="text-right px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Kosten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedDays.map(([date, stats]) => (
                    <tr key={date} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 md:px-6 text-slate-800">{date}</td>
                      <td className="px-4 py-2.5 md:px-6 text-right text-slate-600">{stats.requests}</td>
                      <td className="px-4 py-2.5 md:px-6 text-right text-slate-600">
                        {stats.tokens.toLocaleString("nl-NL")}
                      </td>
                      <td className="px-4 py-2.5 md:px-6 text-right text-slate-800">
                        €{stats.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-slate-500">
              <Activity className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>Geen data in deze periode</p>
            </div>
          )}
        </div>

        {/* Per user */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-4 py-4 md:px-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Per gebruiker</h2>
          </div>
          {sortedUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Gebruiker</th>
                    <th className="text-right px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Requests</th>
                    <th className="text-right px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Tokens</th>
                    <th className="text-right px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Kosten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedUsers.map(([userId, stats]) => (
                    <tr key={userId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 md:px-6 text-slate-800">{stats.name}</td>
                      <td className="px-4 py-2.5 md:px-6 text-right text-slate-600">{stats.requests}</td>
                      <td className="px-4 py-2.5 md:px-6 text-right text-slate-600">
                        {stats.tokens.toLocaleString("nl-NL")}
                      </td>
                      <td className="px-4 py-2.5 md:px-6 text-right text-slate-800">
                        €{stats.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-slate-500">
              <Activity className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>Geen data in deze periode</p>
            </div>
          )}
        </div>
      </div>

      {/* Quotes feed */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-4 py-4 md:px-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Offerte-activiteit</h2>
          <span className="text-sm text-slate-500">{quotesFeed.length} offertes</span>
        </div>
        {quotesFeed.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Tijdstip</th>
                  <th className="text-left px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Gebruiker</th>
                  <th className="text-left px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Klant</th>
                  <th className="text-left px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Nummer</th>
                  <th className="text-left px-4 py-2 md:px-6 text-sm font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotesFeed.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 md:px-6 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(q.created_at).toLocaleString("nl-NL", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-2.5 md:px-6 text-sm font-medium text-slate-800">{q.business_name}</td>
                    <td className="px-4 py-2.5 md:px-6 text-sm text-slate-600">{q.client_name || "—"}</td>
                    <td className="px-4 py-2.5 md:px-6 text-sm text-slate-500">{q.quote_number || "—"}</td>
                    <td className="px-4 py-2.5 md:px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        q.status === "final" ? "bg-green-100 text-green-700" :
                        q.status === "completed" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {q.status === "final" ? "Definitief" : q.status === "completed" ? "Afgerond" : "Concept"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>Geen offertes in deze periode</p>
          </div>
        )}
      </div>
    </div>
  );
}
