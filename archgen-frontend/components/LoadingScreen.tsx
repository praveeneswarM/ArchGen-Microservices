"use client";

import React, { useEffect, useState } from "react";
import { Cpu, CheckCircle2 } from "lucide-react";

export default function LoadingScreen() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { name: "Generating Architecture...", desc: "Deterministic topology extraction..." },
    { name: "Generating Terraform...", desc: "HCL compilation engine running..." },
    { name: "Applying AI Enhancements...", desc: "Cost, security, and complexity reasoning..." }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="w-full h-full min-h-[500px] rounded-[28px] border border-zinc-200 bg-white p-8 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03),transparent_55%)] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        <div className="relative flex items-center justify-center w-14 h-14 bg-zinc-100 border border-zinc-200 rounded-full mb-6">
          <Cpu className="w-6 h-6 text-zinc-950 animate-spin" style={{ animationDuration: "6s" }} />
          <div className="absolute inset-0 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <h3 className="text-base font-semibold text-zinc-950 tracking-tight">
          Orchestrating Analysis
        </h3>
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-0.5 mb-6">
          Deterministic reasoning loop
        </p>

        <div className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-2xl text-left flex flex-col gap-3.5">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeStep;
            const isActive = idx === activeStep;

            return (
              <div key={idx} className="flex items-start gap-3 transition-opacity duration-300">
                <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                  isActive ? "bg-zinc-950 text-white border-zinc-950" : isCompleted ? "bg-zinc-200 border-zinc-300" : "bg-white border-zinc-200"
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-zinc-950" /> : <Cpu className="w-4 h-4" />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-center leading-none">
                    <span className={`text-[11px] font-mono font-semibold ${isActive ? "text-zinc-950" : isCompleted ? "text-zinc-700" : "text-zinc-400"}`}>
                      {step.name}
                    </span>
                    <span className="text-[8px] font-mono tracking-wider uppercase text-zinc-500">
                      {isCompleted ? "Success" : isActive ? "Running" : "Pending"}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[9px] text-zinc-500 font-mono mt-1 animate-pulse">
                      {step.desc}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
