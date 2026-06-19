"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Cloud, Layers, ShieldCheck, Sparkles, Terminal, Menu, X, LucideIcon } from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 relative overflow-hidden flex flex-col justify-between font-sans">
      {/* Premium Background Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#030712]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-900 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Terminal className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">ArchGen AI</div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-slate-400 hidden xs:block">
                Enterprise Cloud Architecture Studio
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/login" 
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-mono font-medium text-slate-300 transition hover:border-cyan-500 hover:text-cyan-400 bg-white/5 hover:bg-cyan-500/5"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-2 text-xs font-mono font-bold text-slate-950 transition shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
            >
              Launch Studio
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 md:hidden hover:bg-white/5 rounded-lg border border-white/5 text-slate-400 hover:text-white transition"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/5 bg-[#030712] px-4 py-4 space-y-3 animate-fade-in">
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center rounded-lg border border-white/10 px-4 py-2.5 text-xs font-mono font-medium text-slate-300 bg-white/5 hover:border-cyan-500"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-mono font-bold text-slate-950"
            >
              Launch Studio
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1400px] w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-20 flex-grow flex flex-col justify-center">
        <div className="grid gap-12 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
          
          {/* Left Hero Column */}
          <div className="space-y-6 md:space-y-8 text-center xl:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 shadow-inner">
              <Sparkles className="h-3 w-3 text-cyan-300" />
              Agentic Multi-Service Studio
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] max-w-3xl mx-auto xl:mx-0">
              Design cloud architecture with <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 drop-shadow-[0_2px_10px_rgba(6,182,212,0.15)]">clarity</span>.
            </h1>
            
            <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-400 mx-auto xl:mx-0">
              ArchGen AI turns complex infrastructure briefs, requirements, security policies, and cost targets into structured visual blueprints and compilable Terraform configurations automatically.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center xl:justify-start">
              <Link 
                href="/register" 
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-6 py-3.5 text-xs font-mono font-bold text-slate-950 transition-all hover:translate-y-[-1px] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3.5 text-xs font-mono font-bold text-slate-200 transition-all"
              >
                Access Dashboard
              </Link>
            </div>
          </div>

          {/* Right Blueprint Cards Column */}
          <div className="rounded-3xl border border-white/10 bg-[#090d16]/40 p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative">
            {/* Soft inner glow */}
            <div className="absolute inset-0 border border-cyan-500/5 rounded-3xl pointer-events-none"></div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Project Setup", "Define the stack, provider, scale, and budget limits.", "01"],
                ["Requirements", "Capture app behavior, networking zones, and security protocols.", "02"],
                ["AI Planning", "Review provider-aware planning graph topologies dynamically.", "03"],
                ["Studio & Export", "Refactor cloud systems and compile synthesizable Terraform.", "04"],
              ].map(([title, description, num]) => (
                <div 
                  key={title} 
                  className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 hover:border-cyan-500/20 hover:bg-slate-950/80 transition-all relative group"
                >
                  <span className="absolute top-4 right-4 text-[10px] font-mono text-cyan-500/30 group-hover:text-cyan-500/60 transition-colors">
                    {num}
                  </span>
                  <div className="text-xs font-bold text-white font-mono uppercase tracking-wider">{title}</div>
                  <div className="mt-2.5 text-xs leading-relaxed text-slate-400">{description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Benefits Row */}
        <div className="mt-16 grid gap-4 md:grid-cols-3 w-full">
          {(
            [
              [Cloud, "Provider-aware", "Seamless deployment topologies across Azure, AWS, and GCP with automated fallback chains."],
              [Layers, "Guided workflow", "A visual interactive workspace that progresses your design from requirements brief to full HCL review."],
              [ShieldCheck, "Enterprise security", "Enforce compliance audits (SOC2, PCI DSS) and private networking zones automatically."],
            ] as [LucideIcon, string, string][]
          ).map(([Icon, title, description]) => (
            <div 
              key={title} 
              className="rounded-2xl border border-white/5 bg-[#090d16]/30 p-6 hover:border-cyan-500/10 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">{title}</div>
              <div className="mt-2 text-xs leading-relaxed text-slate-400">{description}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-[#030712] relative z-10 text-center">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          © {new Date().getFullYear()} ArchGen AI Suite · All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
