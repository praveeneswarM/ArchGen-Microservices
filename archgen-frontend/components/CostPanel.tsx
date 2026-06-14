"use client";

import React from "react";
import { CostBreakdownItem } from "../types";
import { DollarSign, PiggyBank, Sparkles, TrendingDown, HelpCircle } from "lucide-react";

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
    <div className="flex flex-col gap-4 border border-zinc-200 rounded-3xl bg-white p-5 h-full">
      {/* Group Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-zinc-950" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-950 font-sans">
            FinOps Cost Optimization
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-700 border border-zinc-200 px-2 py-0.5 bg-zinc-50 rounded-full">
          <Sparkles className="w-2.5 h-2.5" />
          <span>Frugality Score: {costScore || 85}/100</span>
        </div>
      </div>

      {/* Hero Cost Box */}
      <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono text-zinc-500">Estimated Cost</span>
          <span className="text-3xl font-semibold text-zinc-950 tracking-tight mt-1 font-mono">
            ${costEstimate.toFixed(2)}
            <span className="text-xs text-zinc-500 font-normal"> / month</span>
          </span>
        </div>
        <div className="p-3 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center">
          <PiggyBank className="w-6 h-6 text-zinc-950" />
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Billing Breakdown</span>
        <div className="max-h-36 overflow-y-auto pr-1">
          <table className="w-full text-left border-collapse text-[10px] font-mono">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-1.5 font-medium">Service Component</th>
                <th className="py-1.5 font-medium text-right">Est. Monthly</th>
              </tr>
            </thead>
            <tbody>
              {costBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-3 text-zinc-500 italic text-center">
                    No components to audit.
                  </td>
                </tr>
              ) : (
                costBreakdown.map((item, i) => (
                  <tr key={i} className="border-b border-zinc-200 hover:bg-zinc-50" title={item.reason}>
                    <td className="py-1.5 text-zinc-700 truncate max-w-[150px]">{item.service}</td>
                    <td className="py-1.5 text-right font-semibold text-zinc-950">${item.cost.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-40 pr-1">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5 text-zinc-950" /> FinOps Saving Suggestions
        </span>
        {recommendations.length === 0 ? (
          <p className="text-[10px] text-zinc-500 font-mono italic">No savings recommendations offered.</p>
        ) : (
          recommendations.map((rec, i) => (
            <div key={i} className="flex gap-2 text-[10px] font-mono text-zinc-700 bg-zinc-50 border border-zinc-200 p-2.5 rounded-2xl">
              <span className="shrink-0">•</span>
              <p className="leading-normal">{rec}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
