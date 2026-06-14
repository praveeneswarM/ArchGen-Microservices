"use client";

import React, { useState, memo } from "react";
import { Handle, Position } from "reactflow";
import { 
  Server, Globe, Database, Cpu, Shield, HardDrive, Key, Activity 
} from "lucide-react";

// Corporate Node Container
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
    <div className={`w-56 rounded-lg border bg-[#18181b] p-3 flex items-center gap-3 ${borderClass} shadow-md transition-all duration-200 hover:shadow-lg relative group`}>
      {/* Visual Icon Badge (Monochrome slate/steel) */}
      <div className="p-2.5 rounded-lg bg-[#09090b] border border-[#27272a] flex items-center justify-center text-slate-300 shrink-0 shadow-inner">
        {icon}
      </div>

      {/* Service description */}
      <div className="flex flex-col flex-grow min-w-0 pr-8">
        {isEditing ? (
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-[#09090b] text-[10px] border border-slate-500 rounded px-1 py-0.5 text-white font-mono w-full focus:outline-none"
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
        <span className="text-[8px] text-slate-500 font-mono mt-0.5 truncate uppercase tracking-widest leading-none">
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

// Render corporate Azure nodes
export const GatewayNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$60/mo"}
      typeSubText={data.typeSubText || "azurerm_application_gateway"}
      borderClass="border-[#27272a] hover:border-slate-500"
      icon={<Globe className="w-4 h-4 text-slate-400" />}
    />
  </div>
));
GatewayNode.displayName = "GatewayNode";

export const FrontendNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$30/mo"}
      typeSubText={data.typeSubText || "azurerm_static_web_app"}
      borderClass="border-[#27272a] hover:border-slate-500"
      icon={<Server className="w-4 h-4 text-slate-400" />}
    />
  </div>
));
FrontendNode.displayName = "FrontendNode";

export const BackendNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$75/mo"}
      typeSubText={data.typeSubText || "azurerm_container_app"}
      borderClass="border-[#27272a] hover:border-slate-500"
      icon={<Cpu className="w-4 h-4 text-slate-400" />}
    />
  </div>
));
BackendNode.displayName = "BackendNode";

export const DatabaseNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$115/mo"}
      typeSubText={data.typeSubText || "azurerm_postgresql_flexible_server"}
      borderClass="border-[#27272a] hover:border-slate-500"
      icon={<Database className="w-4 h-4 text-slate-400" />}
    />
  </div>
));
DatabaseNode.displayName = "DatabaseNode";

export const CacheNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$45/mo"}
      typeSubText={data.typeSubText || "azurerm_redis_cache"}
      borderClass="border-[#27272a] hover:border-slate-500"
      icon={<HardDrive className="w-4 h-4 text-slate-400" />}
    />
  </div>
));
CacheNode.displayName = "CacheNode";

export const StorageNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$25/mo"}
      typeSubText={data.typeSubText || "azurerm_storage_account"}
      borderClass="border-[#27272a] hover:border-slate-500"
      icon={<HardDrive className="w-4 h-4 text-slate-400" />}
    />
  </div>
));
StorageNode.displayName = "StorageNode";

export const SecurityNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$15/mo"}
      typeSubText={data.typeSubText || "azurerm_key_vault"}
      borderClass="border-[#27272a] hover:border-slate-500"
      icon={<Key className="w-4 h-4 text-slate-400" />}
    />
  </div>
));
SecurityNode.displayName = "SecurityNode";

export const MonitoringNode = memo(({ id, data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-500 !border-slate-600" />
    <NodeContainer
      id={id}
      label={data.label}
      onChange={data.onLabelChange}
      cost={data.cost || "~$20/mo"}
      typeSubText={data.typeSubText || "azurerm_log_analytics_workspace"}
      borderClass="border-[#27272a] hover:border-slate-500"
      icon={<Activity className="w-4 h-4 text-slate-400" />}
    />
  </div>
));
MonitoringNode.displayName = "MonitoringNode";

export const NetworkGroupNode = memo(({ data }: any) => {
  return (
    <div 
      className="w-full h-full border-2 border-dashed border-sky-500/30 rounded-3xl bg-sky-950/5 pointer-events-none relative transition-colors duration-500"
      style={{ width: data.width || 800, height: data.height || 600 }}
    >
      <div className="absolute -top-3 left-6 bg-[#18181b] px-3 py-1 text-xs font-mono text-sky-400 rounded-full border border-sky-500/30 flex items-center gap-2 shadow-lg">
        <Globe className="w-3.5 h-3.5" />
        {data.label || "Virtual Network / VPC"}
      </div>
    </div>
  );
});
NetworkGroupNode.displayName = "NetworkGroupNode";

export const nodeTypes = {
  GatewayNode,
  FrontendNode,
  BackendNode,
  DatabaseNode,
  CacheNode,
  StorageNode,
  SecurityNode,
  MonitoringNode,
  NetworkGroupNode,
};
