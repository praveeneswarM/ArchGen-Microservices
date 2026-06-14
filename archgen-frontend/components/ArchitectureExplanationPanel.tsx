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
    <div className="flex flex-col border border-zinc-200 rounded-3xl bg-white p-5 h-full overflow-hidden">
      {/* Group Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
        <BookOpen className="w-4 h-4 text-zinc-950" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-950 font-sans">
          Architectural Explanation
        </h2>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex border-b border-zinc-200 gap-1.5 py-2 mt-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("reasoning")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
            activeSubTab === "reasoning" ? "bg-zinc-950 text-white border border-zinc-950" : "text-zinc-500 hover:text-zinc-950 border border-transparent"
          }`}
        >
          <Compass className="w-3.5 h-3.5" /> AI Reasoning
        </button>
        <button
          onClick={() => setActiveSubTab("alternatives")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
            activeSubTab === "alternatives" ? "bg-zinc-950 text-white border border-zinc-950" : "text-zinc-500 hover:text-zinc-950 border border-transparent"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" /> Alternatives Considered
        </button>
        <button
          onClick={() => setActiveSubTab("justification")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
            activeSubTab === "justification" ? "bg-zinc-950 text-white border border-zinc-950" : "text-zinc-500 hover:text-zinc-950 border border-transparent"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Justifications
        </button>
      </div>

      {/* Narrative block */}
      <div className="flex-1 overflow-y-auto max-h-56 mt-3 text-xs font-sans text-zinc-700 leading-relaxed font-mono pr-1">
        {activeSubTab === "reasoning" && (
          <div className="whitespace-pre-wrap">
            {explanation || "Analyzing architecture topologies..."}
          </div>
        )}
        {activeSubTab === "alternatives" && (
          <div className="whitespace-pre-wrap">
            {alternativesConsidered || "No alternatives cached."}
          </div>
        )}
        {activeSubTab === "justification" && (
          <div className="whitespace-pre-wrap">
            {justificationForChoices || "No specific design justifications cached."}
          </div>
        )}
      </div>
    </div>
  );
}
