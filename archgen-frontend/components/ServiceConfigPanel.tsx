"use client";

import React, { useState, useEffect } from "react";
import { NodeSchema } from "../types";
import { Sliders, Shield, Database, Cpu, DollarSign } from "lucide-react";

interface ServiceConfigPanelProps {
  node: NodeSchema;
  onUpdateNode: (nodeId: string, updatedData: { label: string; cost?: string; typeSubText?: string; customMetadata?: any }) => void;
  onClose: () => void;
}

export default function ServiceConfigPanel({ node, onUpdateNode, onClose }: ServiceConfigPanelProps) {
  const [label, setLabel] = useState(node.data.label);
  const [pricingTier, setPricingTier] = useState("Standard");
  const [minReplicas, setMinReplicas] = useState("1");
  const [maxReplicas, setMaxReplicas] = useState("5");
  const [forceHttps, setForceHttps] = useState(true);
  const [subnetName, setSubnetName] = useState("subnet-default");

  useEffect(() => {
    setLabel(node.data.label);
    const meta = (node.data as any).customMetadata || {};
    setPricingTier(meta.pricingTier || "Standard");
    setMinReplicas(meta.minReplicas || "1");
    setMaxReplicas(meta.maxReplicas || "5");
    setForceHttps(meta.forceHttps !== undefined ? meta.forceHttps : true);
    setSubnetName(meta.subnetName || "subnet-default");
  }, [node]);

  const handleSave = () => {
    let cost = "~$25/mo";
    switch (node.type) {
      case "BackendNode":
        cost = pricingTier === "Premium" ? "~$150/mo" : pricingTier === "Standard" ? "~$75/mo" : "~$30/mo";
        break;
      case "DatabaseNode":
        cost = pricingTier === "Premium" ? "~$240/mo" : pricingTier === "Standard" ? "~$115/mo" : "~$45/mo";
        break;
      case "CacheNode":
        cost = pricingTier === "Premium" ? "~$90/mo" : pricingTier === "Standard" ? "~$45/mo" : "~$15/mo";
        break;
      case "GatewayNode":
        cost = pricingTier === "Premium" ? "~$120/mo" : pricingTier === "Standard" ? "~$60/mo" : "~$25/mo";
        break;
    }

    onUpdateNode(node.id, {
      label,
      cost,
      typeSubText: node.data.typeSubText,
      customMetadata: { pricingTier, minReplicas, maxReplicas, forceHttps, subnetName },
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-zinc-950" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-950">Service Settings</h2>
        </div>
        <button onClick={onClose} className="text-xs font-mono text-zinc-500 transition hover:text-zinc-950">
          Close
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[10px] font-mono">
        <span className="text-zinc-500 uppercase tracking-widest leading-none">Class:</span>
        <p className="mt-0.5 text-zinc-950">{node.type}</p>
        <span className="mt-2 block text-zinc-500 uppercase tracking-widest leading-none">Component ID:</span>
        <p className="mt-0.5 truncate text-zinc-700">{node.id}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-500">Service Name (Label)</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 outline-none transition focus:border-zinc-950"
        />
      </div>

      {["BackendNode", "DatabaseNode", "CacheNode", "GatewayNode"].includes(node.type) && (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-500">
            <DollarSign className="h-3.5 w-3.5 text-zinc-950" /> Infrastructure Pricing Tier
          </label>
          <select
            value={pricingTier}
            onChange={(e) => setPricingTier(e.target.value)}
            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 outline-none transition focus:border-zinc-950"
          >
            <option value="Basic">Basic Tier (Cost optimized)</option>
            <option value="Standard">Standard Tier (Standard SLAs)</option>
            <option value="Premium">Premium Tier (Enterprise specs)</option>
          </select>
        </div>
      )}

      {node.type === "BackendNode" && (
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-200 pt-3">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-[10px] font-medium text-zinc-500">
              <Cpu className="h-3 w-3 text-zinc-950" /> Min Replicas
            </label>
            <input
              type="number"
              value={minReplicas}
              onChange={(e) => setMinReplicas(e.target.value)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-950 outline-none transition focus:border-zinc-950"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-[10px] font-medium text-zinc-500">
              <Cpu className="h-3 w-3 text-zinc-950" /> Max Replicas
            </label>
            <input
              type="number"
              value={maxReplicas}
              onChange={(e) => setMaxReplicas(e.target.value)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-950 outline-none transition focus:border-zinc-950"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t border-zinc-200 pt-3">
        <label className="flex items-center gap-1 text-xs font-medium text-zinc-500">
          <Database className="h-3.5 w-3.5 text-zinc-950" /> Virtual Network Subnet
        </label>
        <input
          type="text"
          value={subnetName}
          onChange={(e) => setSubnetName(e.target.value)}
          className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 outline-none transition focus:border-zinc-950"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-xs">
        <label className="flex items-center gap-1.5 font-medium text-zinc-500">
          <Shield className="h-4 w-4 text-zinc-950" /> Force Secure TLS / HTTPS
        </label>
        <input
          type="checkbox"
          checked={forceHttps}
          onChange={(e) => setForceHttps(e.target.checked)}
          className="h-4 w-4 rounded border border-zinc-300 bg-white"
        />
      </div>

      <button
        onClick={handleSave}
        className="mt-4 w-full rounded-full bg-zinc-950 py-2.5 text-xs font-medium uppercase tracking-wider text-white transition hover:bg-zinc-800"
      >
        Save Parameter Changes
      </button>
    </div>
  );
}
