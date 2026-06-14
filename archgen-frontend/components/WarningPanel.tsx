"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, Gauge, Layers } from "lucide-react";

interface WarningPanelProps {
  warnings: string[];
  complexityScore: number;
  operationalOverheadScore: number;
  overengineered: boolean;
}

export default function WarningPanel({
  warnings,
  complexityScore,
  operationalOverheadScore,
  overengineered,
}: WarningPanelProps) {
  return (
    <div className="flex flex-col gap-4 border border-zinc-200 rounded-3xl bg-white p-5 h-full">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
        <Gauge className="w-4 h-4 text-zinc-950" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-950 font-sans">
          Complexity & Auditor Analysis
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center bg-zinc-50">
          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">Complexity Rating</span>
          <span className="text-2xl font-semibold font-mono leading-none text-zinc-950">{complexityScore}</span>
          <span className="text-[9px] font-mono mt-1 text-zinc-500">Scale of 100</span>
        </div>

        <div className="border border-zinc-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center bg-zinc-50">
          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">Ops Overhead</span>
          <span className="text-2xl font-semibold font-mono leading-none text-zinc-950">{operationalOverheadScore}</span>
          <span className="text-[9px] font-mono mt-1 text-zinc-500">Scale of 100</span>
        </div>
      </div>

      {overengineered ? (
        <div className="flex items-start gap-3 bg-white border border-zinc-200 p-3 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-zinc-950 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-950 font-sans">Overengineering Flagged!</span>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">
              The ComplexityAuditorAgent detected infrastructural elements excessive for your traffic scale and budget constraints.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-zinc-50 border border-zinc-200 p-3 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-zinc-950 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-950 font-sans">Optimally Engineered Stack</span>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">
              The architecture is aligned with your scale targets, minimizing operational waste.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-44 pr-1">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono flex items-center gap-1">
          <Layers className="w-3 h-3 text-zinc-950" /> System Warnings ({warnings.length})
        </span>
        {warnings.length === 0 ? (
          <p className="text-[10px] text-zinc-500 font-mono italic">No auditor warnings triggered.</p>
        ) : (
          warnings.map((warn, i) => (
            <div key={i} className="flex gap-2 text-[10px] font-mono text-zinc-700 bg-zinc-50 border border-zinc-200 p-2.5 rounded-2xl">
              <span className="shrink-0">•</span>
              <p className="leading-normal">{warn}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
