"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/Logo Quoter.svg"
              alt="Quoter"
              width={180}
              height={52}
              priority
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold text-slate-800">
                Check je inbox
              </h2>
              <p className="text-sm text-slate-600">
                Als dit e-mailadres bij ons bekend is, ontvang je een link om je wachtwoord in te stellen.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Terug naar inloggen
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Wachtwoord vergeten?
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord in te stellen.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    E-mailadres
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition text-slate-800"
                      placeholder="jouw@email.nl"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Reset link versturen
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
                    Terug naar inloggen
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
