"use client";

import React, { useState, memo } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import { 
  Server, Globe, Database, Cpu, Shield, HardDrive, Key, Activity, Maximize2 
} from "lucide-react";

// Helper to render high-fidelity, provider-specific visual SVG icons
export function getProviderIcon(provider: string, type: string, label: string): React.ReactNode {
  const normProvider = (provider || "azure").toLowerCase();
  const normLabel = (label || "").toLowerCase();

  // AWS Icons (Orange/Yellow Accent style)
  if (normProvider === "aws") {
    if (type === "GatewayNode" || normLabel.includes("cloudfront") || normLabel.includes("alb") || normLabel.includes("gateway")) {
      return (
        <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
        </svg>
      );
    }
    if (type === "BackendNode" || normLabel.includes("eks") || normLabel.includes("ecs") || normLabel.includes("lambda")) {
      return (
        <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
          <line x1="12" y1="2" x2="12" y2="22"/>
          <line x1="2" y1="8.5" x2="22" y2="15.5"/>
          <line x1="2" y1="15.5" x2="22" y2="8.5"/>
        </svg>
      );
    }
    if (type === "DatabaseNode" || normLabel.includes("rds") || normLabel.includes("dynamo") || normLabel.includes("aurora")) {
      return (
        <svg className="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C7.58 2 4 3.79 4 6v12c0 2.21 3.58 4 8 4s8-1.79 8-4V6c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.43 6 2s-2.13 2-6 2-6-1.43-6-2 2.13-2 6-2zm0 14c-3.87 0-6-1.43-6-2v-2.35c1.47.85 3.61 1.35 6 1.35s4.53-.5 6-1.35V16c0 .57-2.13 2-6 2zm0-4.35c-3.87 0-6-1.43-6-2V9.35c1.47.85 3.61 1.35 6 1.35s4.53-.5 6-1.35V11c0 .57-2.13 2-6 2z"/>
        </svg>
      );
    }
    if (type === "CacheNode" || normLabel.includes("elasticache") || normLabel.includes("redis")) {
      return (
        <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="6" rx="1" />
          <rect x="3" y="15" width="18" height="6" rx="1" />
          <line x1="7" y1="6" x2="7.01" y2="6" strokeWidth="3" />
          <line x1="7" y1="18" x2="7.01" y2="18" strokeWidth="3" />
        </svg>
      );
    }
    if (type === "StorageNode" || normLabel.includes("s3") || normLabel.includes("efs") || normLabel.includes("ebs")) {
      return (
        <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      );
    }
    if (type === "SecurityNode" || normLabel.includes("iam") || normLabel.includes("kms") || normLabel.includes("secrets")) {
      return (
        <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
      );
    }
    return <Server className="w-5 h-5 text-orange-500" />;
  }

  // GCP Icons (Modern Google Colors layout)
  if (normProvider === "gcp") {
    if (type === "GatewayNode" || normLabel.includes("load balancer") || normLabel.includes("cdn") || normLabel.includes("armor")) {
      return (
        <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8M12 8l4 4-4 4" />
        </svg>
      );
    }
    if (type === "BackendNode" || normLabel.includes("gke") || normLabel.includes("run") || normLabel.includes("functions")) {
      return (
        <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="8" rx="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" />
          <line x1="6" y1="6" x2="18" y2="6" />
          <line x1="6" y1="18" x2="18" y2="18" />
        </svg>
      );
    }
    if (type === "DatabaseNode" || normLabel.includes("sql") || normLabel.includes("spanner") || normLabel.includes("firestore")) {
      return (
        <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 10h16v2H4zm0-6h16v2H4zm0 12h16v2H4zm0 4h16v2H4z"/>
        </svg>
      );
    }
    return <Cpu className="w-5 h-5 text-blue-400" />;
  }

  // Default / Azure Icons (Blue premium portal theme)
  if (type === "GatewayNode" || normLabel.includes("gateway") || normLabel.includes("front door") || normLabel.includes("traffic manager")) {
    return (
      <svg className="w-6 h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="14" width="6" height="8" rx="1" />
        <rect x="16" y="14" width="6" height="8" rx="1" />
        <rect x="9" y="2" width="6" height="8" rx="1" />
        <path d="M12 10v4M5 14v-2c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v2" />
      </svg>
    );
  }
  if (type === "BackendNode" || normLabel.includes("aks") || normLabel.includes("container app") || normLabel.includes("function")) {
    return (
      <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
        <circle cx="12" cy="7" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (type === "DatabaseNode" || normLabel.includes("postgres") || normLabel.includes("cosmos") || normLabel.includes("database")) {
    return (
      <svg className="w-6 h-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
      </svg>
    );
  }
  if (type === "CacheNode" || normLabel.includes("redis") || normLabel.includes("cache")) {
    return (
      <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" />
        <path d="M6 21v-4M18 21v-4M2 13h20" />
      </svg>
    );
  }
  if (type === "StorageNode" || normLabel.includes("blob") || normLabel.includes("storage") || normLabel.includes("bucket")) {
    return (
      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (type === "SecurityNode" || normLabel.includes("key") || normLabel.includes("vault") || normLabel.includes("identity") || normLabel.includes("waf")) {
    return (
      <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (type === "MonitoringNode" || normLabel.includes("analytics") || normLabel.includes("monitor") || normLabel.includes("insights")) {
    return (
      <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
      </svg>
    );
  }

  return <Server className="w-5 h-5 text-blue-400" />;
}

// Resizable Group Base style container
interface NestedGroupProps {
  id: string;
  data: any;
  selected: boolean;
  borderClass: string;
  bgClass: string;
  title: string;
  icon: React.ReactNode;
}

const NestedGroup = memo(({
  id,
  data,
  selected,
  borderClass,
  bgClass,
  title,
  icon,
}: NestedGroupProps) => {
  return (
    <div className={`w-full h-full rounded-2xl border-2 p-4 flex flex-col relative transition-all duration-300 ${bgClass} ${borderClass} ${selected ? "ring-2 ring-cyan-400/50 shadow-neon-blue" : "shadow-md"}`}>
      <NodeResizer minWidth={200} minHeight={120} isVisible={selected} lineClassName="border-cyan-500" handleClassName="bg-cyan-500 rounded-full w-2.5 h-2.5" />
      <div className="flex items-center gap-2 mb-3 select-none pointer-events-none border-b border-white/5 pb-2">
        <div className="p-1 rounded bg-[#09090b] border border-white/5 text-slate-300">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-100 font-sans tracking-wide">
            {data.label || title}
          </span>
          {data.subnet && (
            <span className="text-[9px] text-slate-400 font-mono tracking-wider">
              CIDR: {data.subnet}
            </span>
          )}
        </div>
      </div>
      
      {/* Resizable handle marker */}
      {selected && (
        <div className="absolute bottom-2 right-2 text-slate-500 pointer-events-none">
          <Maximize2 className="w-3.5 h-3.5 rotate-90" />
        </div>
      )}
    </div>
  );
});
NestedGroup.displayName = "NestedGroup";

// Custom Group Nodes representing the actual Visual Networking hierarchy
export const RegionGroupNode = memo(({ id, data, selected }: any) => (
  <NestedGroup
    id={id}
    data={data}
    selected={selected}
    title="Cloud Region"
    borderClass="border-indigo-500/25"
    bgClass="bg-indigo-950/5"
    icon={<Globe className="w-3.5 h-3.5 text-indigo-400" />}
  />
));
RegionGroupNode.displayName = "RegionGroupNode";

export const ResourceGroupNode = memo(({ id, data, selected }: any) => (
  <NestedGroup
    id={id}
    data={data}
    selected={selected}
    title="Resource Group"
    borderClass="border-emerald-500/20"
    bgClass="bg-emerald-950/5"
    icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />}
  />
));
ResourceGroupNode.displayName = "ResourceGroupNode";

export const VNetGroupNode = memo(({ id, data, selected }: any) => (
  <NestedGroup
    id={id}
    data={data}
    selected={selected}
    title="Virtual Network (VNet)"
    borderClass="border-cyan-500/25 border-dashed"
    bgClass="bg-cyan-950/5"
    icon={<Globe className="w-3.5 h-3.5 text-cyan-400" />}
  />
));
VNetGroupNode.displayName = "VNetGroupNode";

export const SubnetGroupNode = memo(({ id, data, selected }: any) => (
  <NestedGroup
    id={id}
    data={data}
    selected={selected}
    title="Subnet Zone"
    borderClass="border-slate-800"
    bgClass="bg-slate-900/10"
    icon={<Server className="w-3.5 h-3.5 text-slate-400" />}
  />
));
SubnetGroupNode.displayName = "SubnetGroupNode";

// Standard Premium Cloud Resource Node
interface NodeContainerProps {
  id: string;
  label: string;
  onChange?: (id: string, newLabel: string) => void;
  icon: React.ReactNode;
  cost?: string;
  typeSubText?: string;
  borderClass: string;
}

const NodeContainer = memo(({
  id,
  label,
  onChange,
  icon,
  cost,
  typeSubText,
  borderClass
}: NodeContainerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(label);

  const handleBlur = () => {
    setIsEditing(false);
    if (onChange && val.trim() !== "") {
      onChange(id, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  return (
    <div className={`w-64 rounded-xl border bg-[#0f172a] p-3 flex items-center gap-3 ${borderClass} shadow-lg transition-all duration-300 hover:shadow-neon-blue/10 hover:border-cyan-500/40 relative group`}>
      {/* Icon Badge */}
      <div className="p-2.5 rounded-lg bg-[#070b14] border border-white/5 flex items-center justify-center text-slate-300 shrink-0 shadow-inner">
        {icon}
      </div>

      {/* Details */}
      <div className="flex flex-col flex-grow min-w-0 pr-8">
        {isEditing ? (
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-[#020617] text-[10px] border border-cyan-500 rounded px-1.5 py-0.5 text-white font-mono w-full focus:outline-none"
            autoFocus
          />
        ) : (
          <span 
            onDoubleClick={() => setIsEditing(true)}
            className="text-[10px] font-bold text-slate-200 font-sans tracking-wide truncate cursor-pointer hover:text-white transition-colors"
            title="Double-click to rename"
          >
            {label}
          </span>
        )}
        <span className="text-[8px] text-slate-500 font-mono mt-1 truncate uppercase tracking-wider leading-none">
          {typeSubText || "azurerm_resource"}
        </span>
      </div>

      {/* cost Badge */}
      {cost && (
        <span className="absolute top-2.5 right-2 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-mono text-slate-400">
          {cost}
        </span>
      )}
    </div>
  );
});
NodeContainer.displayName = "NodeContainer";

// Export upgraded components with handles
export const GatewayNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$60/mo"}
      typeSubText={data.typeSubText || "azurerm_application_gateway"}
      borderClass="border-white/10 hover:border-cyan-500/35"
      icon={getProviderIcon(data.provider, "GatewayNode", data.label)}
    />
  </div>
));
GatewayNode.displayName = "GatewayNode";

export const FrontendNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$30/mo"}
      typeSubText={data.typeSubText || "azurerm_static_web_app"}
      borderClass="border-white/10 hover:border-cyan-500/35"
      icon={getProviderIcon(data.provider, "FrontendNode", data.label)}
    />
  </div>
));
FrontendNode.displayName = "FrontendNode";

export const BackendNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$75/mo"}
      typeSubText={data.typeSubText || "azurerm_container_app"}
      borderClass="border-white/10 hover:border-cyan-500/35"
      icon={getProviderIcon(data.provider, "BackendNode", data.label)}
    />
  </div>
));
BackendNode.displayName = "BackendNode";

export const DatabaseNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$115/mo"}
      typeSubText={data.typeSubText || "azurerm_postgresql_flexible_server"}
      borderClass="border-white/10 hover:border-cyan-500/35"
      icon={getProviderIcon(data.provider, "DatabaseNode", data.label)}
    />
  </div>
));
DatabaseNode.displayName = "DatabaseNode";

export const CacheNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$45/mo"}
      typeSubText={data.typeSubText || "azurerm_redis_cache"}
      borderClass="border-white/10 hover:border-cyan-500/35"
      icon={getProviderIcon(data.provider, "CacheNode", data.label)}
    />
  </div>
));
CacheNode.displayName = "CacheNode";

export const StorageNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$25/mo"}
      typeSubText={data.typeSubText || "azurerm_storage_account"}
      borderClass="border-white/10 hover:border-cyan-500/35"
      icon={getProviderIcon(data.provider, "StorageNode", data.label)}
    />
  </div>
));
StorageNode.displayName = "StorageNode";

export const SecurityNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$15/mo"}
      typeSubText={data.typeSubText || "azurerm_key_vault"}
      borderClass="border-white/10 hover:border-cyan-500/35"
      icon={getProviderIcon(data.provider, "SecurityNode", data.label)}
    />
  </div>
));
SecurityNode.displayName = "SecurityNode";

export const MonitoringNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-cyan-500 !border-cyan-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$20/mo"}
      typeSubText={data.typeSubText || "azurerm_log_analytics_workspace"}
      borderClass="border-white/10 hover:border-cyan-500/35"
      icon={getProviderIcon(data.provider, "MonitoringNode", data.label)}
    />
  </div>
));
MonitoringNode.displayName = "MonitoringNode";

export const nodeTypes = {
  GatewayNode,
  FrontendNode,
  BackendNode,
  DatabaseNode,
  CacheNode,
  StorageNode,
  SecurityNode,
  MonitoringNode,
  RegionGroupNode,
  ResourceGroupNode,
  VNetGroupNode,
  SubnetGroupNode,
};
