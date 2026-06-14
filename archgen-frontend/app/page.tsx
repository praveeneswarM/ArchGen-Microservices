"use client";

import Link from "next/link";
import { ArrowRight, Cloud, Layers, ShieldCheck, Sparkles, Terminal, LucideIcon } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-950 text-white">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">ArchGen AI</div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Enterprise Cloud Architecture Studio</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
              Login
            </Link>
            <Link href="/register" className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800">
              Launch Studio
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              <Sparkles className="h-3.5 w-3.5" />
              Black & white workflow
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-zinc-950 lg:text-7xl">
              Design cloud architecture with clarity.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 lg:text-lg">
              ArchGen AI turns project setup, requirements, planning, architecture, and export into a guided enterprise workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950">
                Access Dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Project Setup", "Define the stack, provider, scale, and budget."],
                ["Requirements", "Capture app behavior, constraints, and security needs."],
                ["AI Planning", "Review provider/model-driven planning output."],
                ["Studio & Export", "Edit, review, and export Terraform deliverables."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-3xl border border-zinc-200 bg-white p-5">
                  <div className="text-sm font-medium text-zinc-950">{title}</div>
                  <div className="mt-2 text-sm leading-6 text-zinc-600">{description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {(
            [
              [Cloud, "Provider-aware", "OpenAI, Ollama, and fallback flows stay visible."],
              [Layers, "Guided workflow", "Progress moves users from brief to review."],
              [ShieldCheck, "Enterprise clean", "Black, white, and gray with minimal clutter."],
            ] as [LucideIcon, string, string][]
          ).map(([Icon, title, description]) => (
            <div key={title} className="rounded-3xl border border-zinc-200 bg-white p-6">
              <Icon className="h-5 w-5 text-zinc-950" />
              <div className="mt-4 text-sm font-medium text-zinc-950">{title}</div>
              <div className="mt-2 text-sm leading-6 text-zinc-600">{description}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
