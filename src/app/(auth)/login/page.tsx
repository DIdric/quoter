"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, ArrowRight, Loader2, Building2, MapPin } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Controleer je e-mail voor een link om je wachtwoord te resetten.");
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      if (!businessName.trim()) {
        setError("Bedrijfsnaam is verplicht.");
        setLoading(false);
        return;
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            business_name: businessName.trim(),
            business_city: businessCity.trim() || null,
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        // Update profile with business name if user was created
        if (signUpData.user) {
          await supabase.from("profiles").upsert({
            id: signUpData.user.id,
            business_name: businessName.trim(),
            business_city: businessCity.trim() || null,
          });
        }
        setMessage("Controleer je e-mail voor een bevestigingslink.");
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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
          <p className="text-slate-400 mt-2">
            Professionele offertes voor aannemers
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            {isForgotPassword ? "Wachtwoord resetten" : isLogin ? "Inloggen" : "Account aanmaken"}
          </h2>

          <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
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
                  placeholder="naam@bedrijf.nl"
                  required
                />
              </div>
            </div>

            {!isForgotPassword && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition text-slate-800"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-brand-500 transition mt-1"
                >
                  Wachtwoord vergeten?
                </button>
              )}
            </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bedrijfsnaam <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition text-slate-800"
                      placeholder="Jouw Bedrijf B.V."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plaats <span className="text-slate-400 font-normal">(optioneel)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={businessCity}
                      onChange={(e) => setBusinessCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition text-slate-800"
                      placeholder="Amsterdam"
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-brand-50 text-brand-700 text-sm p-3 rounded-lg">
                {message}
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
                  {isForgotPassword ? "Reset link versturen" : isLogin ? "Inloggen" : "Registreren"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {isForgotPassword ? (
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm text-slate-600 hover:text-brand-500 transition"
              >
                Terug naar inloggen
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm text-slate-600 hover:text-brand-500 transition"
              >
                {isLogin
                  ? "Nog geen account? Registreer hier"
                  : "Al een account? Log hier in"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
