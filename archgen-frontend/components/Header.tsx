"use client";

import React, { useEffect, useState } from "react";
import { Cpu, Cloud, Radio, Sparkles } from "lucide-react";

export default function Header() {
  const [serverOnline, setServerOnline] = useState(false);

  // Poll backend health status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/");
        if (res.ok) {
          setServerOnline(true);
        } else {
          setServerOnline(false);
        }
      } catch {
        setServerOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 glass-panel border-b border-border flex items-center justify-between px-6 z-20 sticky top-0">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-tr from-primary to-secondary rounded-lg shadow-neon-indigo flex items-center justify-center animate-pulse-slow">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-bold text-lg leading-tight tracking-wide bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent flex items-center gap-1.5 font-sans">
            ArchGen <span className="text-secondary font-black text-xs border border-secondary/30 px-1 rounded-sm">AI</span>
          </h1>
          <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Agentic Cloud Architect</span>
        </div>
      </div>

      {/* Center Slogan */}
      <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full text-xs font-mono text-indigo-300">
        <Sparkles className="w-3.5 h-3.5 text-secondary animate-bounce" />
        <span>Requirement to HCL Terraform Multi-Agent System</span>
      </div>

      {/* Connection & Actions */}
      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-border rounded-full">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${serverOnline ? "bg-emerald-400" : "bg-rose-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${serverOnline ? "bg-emerald-500" : "bg-rose-500"}`}></span>
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-gray-300">
            Orchestrator: {serverOnline ? "Online" : "Offline"}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Cloud className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-mono text-gray-400">v1.0 MVP</span>
        </div>
      </div>
    </header>
  );
}
