"use client";

import { useState, useEffect } from "react";
import { Users, FileText, Package, Activity, DollarSign, Zap } from "lucide-react";

interface DashboardData {
  totalUsers: number;
  totalQuotes: number;
  totalDefaultMaterials: number;
  tierCounts: { free: number; pro: number; business: number };
  last30Days: {
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin?action=dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: "Gebruikers", value: data.totalUsers, icon: Users, color: "bg-blue-500" },
    { label: "Offertes", value: data.totalQuotes, icon: FileText, color: "bg-green-500" },
    { label: "Standaard Materialen", value: data.totalDefaultMaterials, icon: Package, color: "bg-amber-500" },
    { label: "API Requests (30d)", value: data.last30Days.totalRequests, icon: Activity, color: "bg-purple-500" },
    {
      label: "Tokens (30d)",
      value: data.last30Days.totalTokens.toLocaleString("nl-NL"),
      icon: Zap,
      color: "bg-orange-500",
    },
    {
      label: "API Kosten (30d)",
      value: `€${data.last30Days.totalCost.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-red-500",
    },
  ];

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-6">
        Admin Dashboard
      </h1>

      {/* Tier breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">Abonnementstiers</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Free</span>
            <span className="text-lg font-bold text-slate-800">{data.tierCounts.free}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Pro</span>
            <span className="text-lg font-bold text-slate-800">{data.tierCounts.pro}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Business</span>
            <span className="text-lg font-bold text-slate-800">{data.tierCounts.business}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-3 md:gap-4">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-lg flex items-center justify-center shrink-0`}
              >
                <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold text-slate-800">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-slate-500 truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
