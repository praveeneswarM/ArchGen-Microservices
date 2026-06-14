"use client";

import React, { useState } from "react";
import { RequirementInput } from "../types";
import { Play, Sparkles, Terminal, Sliders, Cloud, DollarSign, Users, FileText } from "lucide-react";

interface RequirementFormProps {
  onSubmit: (data: RequirementInput) => void;
  isLoading: boolean;
}

export default function RequirementForm({ onSubmit, isLoading }: RequirementFormProps) {
  const [formData, setFormData] = useState<RequirementInput>({
    expected_users: "1,000,000 monthly",
    monthly_budget: "500",
    cloud_provider: "azure",
    app_description: "Deploy a global OTT video streaming platform requiring high throughput, hot cache storage, low latency client deliveries, and highly secure administrative controls.",
    additional_notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* Group Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Sliders className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-200 font-sans">
          Autonomous Design Inputs
        </h2>
      </div>

      {/* Cloud Provider Select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
          <Cloud className="w-3.5 h-3.5 text-indigo-400" /> Target Cloud Provider
        </label>
        <select
          name="cloud_provider"
          value={formData.cloud_provider}
          onChange={handleChange}
          className="bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors font-sans"
        >
          <option value="azure">Microsoft Azure (Primary support)</option>
          <option value="aws">Amazon Web Services (AWS)</option>
          <option value="gcp">Google Cloud Platform (GCP)</option>
        </select>
      </div>

      {/* Row: Expected Users & Budget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-400" /> Expected Scale
          </label>
          <input
            type="text"
            name="expected_users"
            value={formData.expected_users}
            onChange={handleChange}
            placeholder="e.g. 100k monthly"
            className="bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" /> Budget Limit ($/mo)
          </label>
          <input
            type="text"
            name="monthly_budget"
            value={formData.monthly_budget}
            onChange={handleChange}
            placeholder="e.g. 500"
            className="bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            required
          />
        </div>
      </div>

      {/* Wide Rich Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-indigo-400" /> Application Description
        </label>
        <textarea
          name="app_description"
          value={formData.app_description}
          onChange={handleChange}
          rows={6}
          placeholder="Describe your application logic, traffic patterns, static file storage loads, security requirements, and data storage scopes..."
          className="bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono text-xs leading-normal"
          required
        />
      </div>

      {/* Extra Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-400 font-medium">Extra Architect Specifications (Optional)</label>
        <textarea
          name="additional_notes"
          value={formData.additional_notes}
          onChange={handleChange}
          rows={2}
          placeholder="e.g. Ensure WAF rate limits are set tight, force DB backups daily..."
          className="bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono text-xs"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-neon-indigo"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Deploying Agents...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 text-white fill-white" />
            <span className="font-mono uppercase tracking-wider text-xs">Run Agentic Architect</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
          </>
        )}
      </button>

      {/* DevOps AI Agent log indicators */}
      <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-1 text-[10px] font-mono text-gray-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-indigo-400 animate-pulse-slow" />
          <span>Active reasoning nodes: 7 Agents</span>
        </div>
        <div className="text-[9px] text-gray-500">
          Understanding, reasoning, security, FinOps, auditor, HCL, explanation
        </div>
      </div>
    </form>
  );
}
