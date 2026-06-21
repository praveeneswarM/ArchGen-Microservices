"use client";

import React, { useState, useEffect } from "react";
import { TerraformResponse } from "../types";
import { Copy, Check, Terminal, FileCode, AlertTriangle, RefreshCw } from "lucide-react";

interface TerraformPanelProps {
  terraform: TerraformResponse | null;
  isLoading: boolean;
  onCodeChange?: (newCode: string, tab: "main" | "variables" | "outputs" | "tfvars") => void;
  error?: string | null;
  onForceRegenerate?: () => void;
}

export default function TerraformPanel({ terraform, isLoading, onCodeChange, error, onForceRegenerate }: TerraformPanelProps) {
  const [activeTab, setActiveTab] = useState<"main" | "variables" | "outputs" | "tfvars" | "guide">("main");
  const [copied, setCopied] = useState(false);
  const [editCode, setEditCode] = useState("");

  // Sync internal state when activeTab or terraform changes
  useEffect(() => {
    if (!terraform) {
      setEditCode("");
      return;
    }
    switch (activeTab) {
      case "main":
        setEditCode(terraform.main_tf || "");
        break;
      case "variables":
        setEditCode(terraform.variables_tf || "");
        break;
      case "outputs":
        setEditCode(terraform.outputs_tf || "");
        break;
      case "tfvars":
        setEditCode(terraform.terraform_tfvars || "");
        break;
      case "guide":
        setEditCode(terraform.instructions || "");
        break;
    }
  }, [activeTab, terraform]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditCode(val);
    if (onCodeChange && activeTab !== "guide") {
      onCodeChange(val, activeTab);
    }
  };

  const handleCopy = async () => {
    if (!editCode) return;
    try {
      await navigator.clipboard.writeText(editCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  if (isLoading && !terraform) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-white/5 bg-[#090b11]/50 p-6 backdrop-blur-xl">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-500"></div>
        <p className="text-xs font-mono text-slate-400">Compiling Terraform configurations...</p>
      </div>
    );
  }

  if (!terraform) {
    if (error) {
      let cleanMessage = error.replace("Failed compiling infrastructure configurations: ", "").replace("Failed to generate Terraform: ", "");
      let findings: string[] = [];
      if (error.includes("Findings: ")) {
        const parts = cleanMessage.split("Findings: ");
        cleanMessage = parts[0].trim();
        if (parts.length > 1) {
          findings = parts[1].split(", ").map(f => f.trim());
        }
      }

      return (
        <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-3xl border border-rose-500/20 bg-rose-950/10 p-8 text-center backdrop-blur-xl max-w-xl mx-auto shadow-2xl shadow-rose-950/20 animate-fade-in">
          <AlertTriangle className="mb-4 h-10 w-10 text-rose-500 animate-pulse" />
          <h3 className="text-base font-bold text-rose-200">Infrastructure Compilation Blocked</h3>
          <p className="mt-2 text-xs text-rose-300/80 font-mono leading-relaxed">
            {cleanMessage || "Architecture drift or incompatibility detected in layout configurations."}
          </p>
          
          {findings.length > 0 && (
            <div className="mt-4 w-full text-left bg-rose-950/20 border border-rose-500/10 rounded-xl p-3.5 max-h-40 overflow-y-auto">
              <span className="text-[10px] font-bold text-rose-400 font-mono uppercase tracking-wider block mb-2">Detailed Findings</span>
              <ul className="space-y-1.5 font-mono text-[10px] text-rose-300">
                {findings.map((f, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-rose-500">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {onForceRegenerate && (
            <button
              onClick={onForceRegenerate}
              className="mt-6 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono rounded-xl transition duration-200 flex items-center gap-1.5 shadow-lg shadow-rose-950/30 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Force Regenerate (Ignore Drift)</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-white/5 bg-[#090b11]/50 p-6 text-center backdrop-blur-xl">
        <FileCode className="mb-3 h-8 w-8 text-slate-500" />
        <p className="text-sm font-semibold text-slate-200">No Infrastructure Generated</p>
        <p className="mt-1 max-w-xs text-xs text-slate-500 font-mono">
          Enter cloud specifications to output deployable Terraform.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#090b11]/50 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-white/5 bg-[#05070c]/50 px-4 py-2">
        <div className="flex min-w-max gap-1.5">
          {[
            ["main", "main.tf"],
            ["variables", "variables.tf"],
            ["outputs", "outputs.tf"],
            ["tfvars", "terraform.tfvars"],
            ["guide", "Operations Guide"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`rounded-full px-3 py-1.5 text-xs font-mono transition-all ${
                activeTab === key 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/35" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0b0f19] px-3 py-1.5 text-xs font-mono text-slate-300 transition hover:text-white hover:border-cyan-500/35"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="relative h-[450px] flex-grow overflow-hidden bg-[#0b0f19]/40">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#080b11]/80">
            <div className="flex items-center gap-2 rounded-full border border-white/5 bg-[#090b11] px-4 py-2 text-xs font-mono text-cyan-400">
              <Terminal className="h-4 w-4 animate-spin" />
              <span>Regenerating HCL Stack...</span>
            </div>
          </div>
        )}
        
        {activeTab === "guide" ? (
          <pre className="w-full h-full p-4 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-300 font-mono">
            {editCode}
          </pre>
        ) : (
          <textarea
            value={editCode}
            onChange={handleTextChange}
            className="w-full h-full p-4 bg-[#0b0f19]/80 text-xs leading-relaxed text-cyan-400 font-mono focus:outline-none resize-none overflow-y-auto border-none"
            spellCheck={false}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 bg-[#05070c]/50 px-4 py-2 text-[9px] font-mono text-slate-500">
        <span className="flex items-center gap-1">
          <Terminal className="h-3 w-3 text-cyan-400" />
          <span>Bi-directional HCL Editor Active</span>
        </span>
        <span>Scope: Workspace Sync</span>
      </div>
    </div>
  );
}
