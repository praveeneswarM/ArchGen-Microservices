"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "../../lib/api";
import { Cpu, User, Lock, AlertTriangle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-redirect if token exists
  useEffect(() => {
    const token = localStorage.getItem("archgen_auth_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginUser(username, password);
      localStorage.setItem("archgen_auth_token", data.access_token);
      localStorage.setItem("archgen_refresh_token", data.refresh_token);
      localStorage.setItem("archgen_username", data.user.username);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center min-h-screen bg-[#09090b] p-4 relative overflow-hidden">
      {/* Soft background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-slate-500/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl relative z-10">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-white border border-[#27272a] rounded-xl flex items-center justify-center shadow-md mb-4">
            <Cpu className="w-6 h-6 text-black" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 font-sans tracking-wide">
            Welcome to ArchGen AI
          </h2>
          <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
            Cloud Architecture Studio
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
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
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-black font-semibold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Login Studio"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 font-sans border-t border-white/5 pt-4">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-white font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
