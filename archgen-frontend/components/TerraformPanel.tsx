"use client";

import React, { useState } from "react";
import { TerraformResponse } from "../types";
import { Copy, Check, Terminal, FileCode } from "lucide-react";

interface TerraformPanelProps {
  terraform: TerraformResponse | null;
  isLoading: boolean;
}

export default function TerraformPanel({ terraform, isLoading }: TerraformPanelProps) {
  const [activeTab, setActiveTab] = useState<"main" | "variables" | "outputs" | "tfvars" | "guide">("main");
  const [copied, setCopied] = useState(false);

  const getCodeContent = () => {
    if (!terraform) return "";
    switch (activeTab) {
      case "main":
        return terraform.main_tf;
      case "variables":
        return terraform.variables_tf;
      case "outputs":
        return terraform.outputs_tf;
      case "tfvars":
        return terraform.terraform_tfvars;
      case "guide":
        return terraform.instructions;
      default:
        return "";
    }
  };

  const handleCopy = async () => {
    const code = getCodeContent();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  if (isLoading && !terraform) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-6">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950"></div>
        <p className="text-xs font-mono text-zinc-500">Compiling Terraform configurations...</p>
      </div>
    );
  }

  if (!terraform) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-6 text-center">
        <FileCode className="mb-3 h-8 w-8 text-zinc-950/40" />
        <p className="text-sm font-semibold text-zinc-950">No Infrastructure Generated</p>
        <p className="mt-1 max-w-xs text-xs text-zinc-500 font-mono">
          Enter cloud specifications to output deployable Terraform.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-zinc-200 bg-zinc-50 px-4 py-2">
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
              className={`rounded-full px-3 py-1.5 text-xs font-mono transition ${
                activeTab === key ? "bg-zinc-950 text-white" : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-mono text-zinc-700 transition hover:border-zinc-950"
          title="Copy block to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-zinc-950" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-zinc-950" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="relative h-96 flex-1 overflow-y-auto bg-white p-4">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-mono text-zinc-700">
              <Terminal className="h-4 w-4 animate-spin" />
              <span>Regenerating HCL Stack...</span>
            </div>
          </div>
        )}
        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 font-mono">{getCodeContent()}</pre>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-[9px] font-mono text-zinc-500">
        <span className="flex items-center gap-1">
          <Terminal className="h-3 w-3 text-zinc-950" />
          <span>Output format: HCL-compliant template files</span>
        </span>
        <span>Scope: Local Directory</span>
      </div>
    </div>
  );
}
