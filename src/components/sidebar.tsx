"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  Shield,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projecten", icon: FolderOpen },
  { href: "/materials", label: "Materialen", icon: Package },
  { href: "/settings", label: "Instellingen", icon: Settings },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useState(() => {
    // Check admin status on mount
    fetch("/api/admin?action=dashboard")
      .then((r) => {
        if (r.ok) setIsAdmin(true);
      })
      .catch(() => {});

    // Check subscription tier
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          const tier = data?.subscription_tier ?? "free";
          setIsFree(tier === "free");
        });
    });
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-slate-900 text-white flex items-center gap-3 px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1 rounded-lg hover:bg-slate-800 transition"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/Bug Quoter.svg"
            alt="Quoter"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="text-lg font-bold text-brand-500">Quoter</span>
        </Link>
        <div className="ml-auto">
          <Link
            href="/quotes/new"
            className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nieuwe Offerte</span>
          </Link>
        </div>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <Image
              src="/Bug Quoter.svg"
              alt="Quoter"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-xl font-bold text-brand-500">Quoter</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 transition lg:hidden"
            aria-label="Sluit menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Quote Button */}
        <div className="p-4">
          <Link
            href="/quotes/new"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Nieuwe Offerte
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin link */}
        {isAdmin && (
          <div className="px-3 mt-4">
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-800 transition"
            >
              <Shield className="w-5 h-5" />
              Admin Panel
            </Link>
          </div>
        )}

        {/* Upgrade link (free users only) */}
        {isFree && (
          <div className="px-3 mb-2">
            <Link
              href="/upgrade"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 font-medium text-sm transition"
            >
              <Zap className="w-4 h-4" />
              Upgrade naar Pro
            </Link>
          </div>
        )}

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition w-full"
          >
            <LogOut className="w-5 h-5" />
            Uitloggen
          </button>
        </div>
      </aside>
    </>
  );
}
