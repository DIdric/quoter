"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  Package,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Gebruikers", icon: Users },
  { href: "/admin/usage", label: "API Gebruik", icon: Activity },
  { href: "/admin/materials", label: "Standaard Materialen", icon: Package },
];

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

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
        <span className="text-lg font-bold text-red-400">Admin Panel</span>
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
            href="/admin"
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
            <div>
              <span className="text-xl font-bold text-brand-500">Quoter</span>
              <span className="block text-xs text-red-400 font-medium">Admin</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 transition lg:hidden"
            aria-label="Sluit menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
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

        {/* Back to app */}
        <div className="p-4 border-t border-slate-700">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition w-full"
          >
            <ArrowLeft className="w-5 h-5" />
            Terug naar app
          </Link>
        </div>
      </aside>
    </>
  );
}
