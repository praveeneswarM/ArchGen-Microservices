"use client";

import React, { useState } from "react";
import { BookOpen, AlertCircle, Compass, HelpCircle } from "lucide-react";

interface ArchitectureExplanationPanelProps {
  explanation: string;
  alternativesConsidered: string;
  justificationForChoices: string;
}

export default function ArchitectureExplanationPanel({
  explanation,
  alternativesConsidered,
  justificationForChoices,
}: ArchitectureExplanationPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"reasoning" | "alternatives" | "justification">("reasoning");

  return (
    <div className="flex flex-col border border-white/5 rounded-3xl bg-[#090b11]/50 p-5 h-full overflow-hidden backdrop-blur-xl">
      {/* Group Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-sans">
          Architectural Explanation
        </h2>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex border-b border-white/5 gap-1.5 py-2 mt-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("reasoning")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
            activeSubTab === "reasoning" 
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/35" 
              : "text-slate-400 hover:text-white border border-transparent"
          }`}
        >
          <Compass className="w-3.5 h-3.5" /> AI Reasoning
        </button>
        <button
          onClick={() => setActiveSubTab("alternatives")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
            activeSubTab === "alternatives" 
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/35" 
              : "text-slate-400 hover:text-white border border-transparent"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" /> Alternatives Considered
        </button>
        <button
          onClick={() => setActiveSubTab("justification")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
            activeSubTab === "justification" 
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/35" 
              : "text-slate-400 hover:text-white border border-transparent"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Justifications
        </button>
      </div>

      {/* Narrative block */}
      <div className="flex-1 overflow-y-auto max-h-[500px] mt-3 text-xs font-mono text-slate-300 leading-relaxed pr-1 whitespace-pre-wrap">
        {activeSubTab === "reasoning" && (
          <div>
            {explanation || "Analyzing architecture topologies..."}
          </div>
        )}
        {activeSubTab === "alternatives" && (
          <div>
            {alternativesConsidered || "No alternatives cached."}
          </div>
        )}
        {activeSubTab === "justification" && (
          <div>
            {justificationForChoices || "No specific design justifications cached."}
          </div>
        )}
      </div>
    </div>
  );
}
