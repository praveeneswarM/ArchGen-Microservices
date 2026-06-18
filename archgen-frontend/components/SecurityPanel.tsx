"use client";

import React from "react";
import { SecurityFinding, ComplianceCheck } from "../types";
import { Shield, ShieldAlert, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

interface SecurityPanelProps {
  securityScore: number;
  findings: SecurityFinding[];
  compliance: ComplianceCheck[];
}

export default function SecurityPanel({
  securityScore,
  findings,
  compliance,
}: SecurityPanelProps) {
  return (
    <div className="flex flex-col gap-4 border border-white/5 rounded-3xl bg-[#090b11]/50 p-5 h-full backdrop-blur-xl">
      {/* Group Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-sans">
            DevSecOps Security Audit
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 bg-cyan-500/10 rounded-full">
          <span>Score: {securityScore || 85}/100</span>
        </div>
      </div>

      {/* Compliance Section */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Compliance Mapping</span>
        <div className="grid grid-cols-2 gap-2">
          {compliance.length === 0 ? (
            <p className="text-[10px] text-slate-500 font-mono italic col-span-2 text-center py-2">
              No compliance checks resolved.
            </p>
          ) : (
            compliance.map((item, idx) => (
              <div key={idx} className="border border-white/5 p-2.5 rounded-2xl flex flex-col bg-[#05070c]/50 text-slate-300" title={item.notes}>
                <span className="text-[10px] font-bold font-mono text-slate-200">{item.standard}</span>
                <span className="text-[9px] font-mono mt-0.5 opacity-80">{item.status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Findings List */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-56 pr-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" /> Findings & Vulnerabilities ({findings.length})
        </span>
        {findings.length === 0 ? (
          <p className="text-[10px] text-slate-500 font-mono italic">No security vulnerabilities detected.</p>
        ) : (
          findings.map((item, i) => (
            <div key={i} className="border border-white/5 p-3 rounded-2xl flex flex-col gap-1.5 bg-[#05070c]/50 text-slate-300">
              <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">
                <span className="text-rose-400">Severity: {item.severity}</span>
                <span>Audit Tag</span>
              </div>
              <p className="text-[10px] leading-relaxed font-sans text-slate-300">{item.description}</p>
              <div className="text-[9px] font-mono opacity-80 border-t border-white/5 pt-1.5 mt-1 text-slate-400">
                <span className="font-bold text-slate-200">Remediation:</span> {item.remediation}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
