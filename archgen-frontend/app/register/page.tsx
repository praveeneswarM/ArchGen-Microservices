"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "../../lib/api";
import { Cpu, User, Lock, Mail, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await registerUser(username, password, email);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center min-h-screen bg-[#09090b] p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-slate-500/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl relative z-10">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-white border border-[#27272a] rounded-xl flex items-center justify-center shadow-md mb-4">
            <Cpu className="w-6 h-6 text-black" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 font-sans tracking-wide">
            Create SaaS Account
          </h2>
          <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
            Join Architecture Studio
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 mb-4 animate-bounce">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Account created! Routing to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="bg-[#09090b] border border-[#27272a] px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:border-slate-500 text-slate-200 transition-colors font-mono"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pick a unique user handle"
              className="bg-[#09090b] border border-[#27272a] px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:border-slate-500 text-slate-200 transition-colors font-mono"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-[#09090b] border border-[#27272a] px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:border-slate-500 text-slate-200 transition-colors font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-black font-semibold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {loading ? "Registering..." : "Sign Up"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 font-sans border-t border-white/5 pt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-semibold hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
