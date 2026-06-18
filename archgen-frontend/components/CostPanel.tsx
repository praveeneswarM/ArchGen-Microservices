"use client";

import React from "react";
import { CostBreakdownItem } from "../types";
import { DollarSign, PiggyBank, Sparkles, TrendingDown } from "lucide-react";

interface CostPanelProps {
  costEstimate: number;
  costBreakdown: CostBreakdownItem[];
  recommendations: string[];
  costScore: number;
}

export default function CostPanel({
  costEstimate,
  costBreakdown,
  recommendations,
  costScore,
}: CostPanelProps) {
  return (
    <div className="flex flex-col gap-4 border border-white/5 rounded-3xl bg-[#090b11]/50 p-5 h-full backdrop-blur-xl">
      {/* Group Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-sans">
            FinOps Cost Optimization
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 bg-cyan-500/10 rounded-full">
          <Sparkles className="w-2.5 h-2.5" />
          <span>Frugality Score: {costScore || 85}/100</span>
        </div>
      </div>

      {/* Hero Cost Box */}
      <div className="bg-[#05070c]/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono text-slate-400">Estimated Cost</span>
          <span className="text-3xl font-semibold text-white tracking-tight mt-1 font-mono">
            ${costEstimate.toFixed(2)}
            <span className="text-xs text-slate-500 font-normal"> / month</span>
          </span>
        </div>
        <div className="p-3 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center">
          <PiggyBank className="w-6 h-6 text-cyan-400" />
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Billing Breakdown</span>
        <div className="max-h-36 overflow-y-auto pr-1">
          <table className="w-full text-left border-collapse text-[10px] font-mono">
            <thead>
              <tr className="border-b border-white/5 text-slate-500">
                <th className="py-1.5 font-medium">Service Component</th>
                <th className="py-1.5 font-medium text-right">Est. Monthly</th>
              </tr>
            </thead>
            <tbody>
              {costBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-3 text-slate-500 italic text-center">
                    No components to audit.
                  </td>
                </tr>
              ) : (
                costBreakdown.map((item, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors" title={item.reason}>
                    <td className="py-1.5 text-slate-300 truncate max-w-[150px]">{item.service}</td>
                    <td className="py-1.5 text-right font-semibold text-white">${item.cost.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-40 pr-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5 text-cyan-400 animate-bounce" /> FinOps Saving Suggestions
        </span>
        {recommendations.length === 0 ? (
          <p className="text-[10px] text-slate-500 font-mono italic">No savings recommendations offered.</p>
        ) : (
          recommendations.map((rec, i) => (
            <div key={i} className="flex gap-2 text-[10px] font-mono text-slate-300 bg-[#05070c]/50 border border-white/5 p-2.5 rounded-2xl">
              <span className="shrink-0 text-cyan-400">•</span>
              <p className="leading-normal">{rec}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
