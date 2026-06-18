"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import { NodeSchema, EdgeSchema, ServiceSchema } from "../types";
import { nodeTypes } from "./CustomNodes";
import {
  Globe,
  Cpu,
  Database,
  HardDrive,
  Key,
  Plus,
  Trash2,
  HelpCircle,
  Activity,
  CheckCircle2,
  RefreshCw,
  Undo2,
  Redo2,
  ShieldCheck,
  Lock,
  Unlock,
  Copy,
  DollarSign,
  LayoutTemplate,
  Maximize2,
} from "lucide-react";

interface ArchitectureCanvasProps {
  initialNodes: NodeSchema[];
  initialEdges: EdgeSchema[];
  onTopologyChange: (
    nodes: NodeSchema[],
    edges: EdgeSchema[],
    services: ServiceSchema[]
  ) => void;
  isApproved: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
  undo: () => void;
  redo: () => void;
  triggerAiAssist: (action: string) => void;
  onSelectNode: (node: NodeSchema | null) => void;
}

// ─── Hierarchical Layout Generator ──────────────────────────────────────────
export function computeHierarchicalLayout(nodes: Node[], provider: string = "azure"): Node[] {
  const normProvider = (provider || "azure").toLowerCase();

  // Filter out any existing group nodes to prevent duplication
  const cleanNodes = nodes.filter(
    (n) =>
      n.type !== "RegionGroupNode" &&
      n.type !== "ResourceGroupNode" &&
      n.type !== "VNetGroupNode" &&
      n.type !== "SubnetGroupNode"
  );

  // Group resource nodes by their target subnets
  const subnetMapping: Record<string, Node[]> = {
    "subnet-ingress": [],
    "subnet-app": [],
    "subnet-data": [],
    "subnet-mgmt": [],
    "subnet-pe": [],
  };

  cleanNodes.forEach((node) => {
    const label = (node.data?.label || "").toLowerCase();
    const type = node.type || "";

    if (type === "GatewayNode" || type === "FrontendNode" || label.includes("gateway") || label.includes("front door") || label.includes("waf") || label.includes("dns")) {
      subnetMapping["subnet-ingress"].push(node);
    } else if (type === "DatabaseNode" || type === "CacheNode" || label.includes("postgres") || label.includes("redis") || label.includes("cosmos") || label.includes("mongo") || label.includes("sql")) {
      subnetMapping["subnet-data"].push(node);
    } else if (label.includes("private endpoint") || label.includes("pe-") || label.includes("endpoint")) {
      subnetMapping["subnet-pe"].push(node);
    } else if (type === "SecurityNode" || type === "MonitoringNode" || label.includes("keyvault") || label.includes("identity") || label.includes("log") || label.includes("insights") || label.includes("monitor") || label.includes("bastion") || label.includes("backup")) {
      subnetMapping["subnet-mgmt"].push(node);
    } else {
      subnetMapping["subnet-app"].push(node);
    }
  });

  const result: Node[] = [];

  // Define Subnet Sizes dynamically based on child node counts
  const subnetConfig: Record<
    string,
    { label: string; x: number; y: number; width: number; height: number; colStep: number; rowStep: number }
  > = {
    "subnet-ingress": { label: "Ingress Subnet (10.0.1.0/24)", x: 40, y: 60, width: 660, height: 340, colStep: 320, rowStep: 130 },
    "subnet-mgmt": { label: "Management Subnet (10.0.4.0/24)", x: 740, y: 60, width: 660, height: 620, colStep: 320, rowStep: 130 },
    "subnet-pe": { label: "Private Endpoint Subnet (10.0.5.0/24)", x: 1440, y: 60, width: 400, height: 450, colStep: 320, rowStep: 130 },
    "subnet-app": { label: "Application Subnet (10.0.2.0/24)", x: 40, y: 720, width: 1800, height: 340, colStep: 350, rowStep: 130 },
    "subnet-data": { label: "Data Subnet (10.0.3.0/24)", x: 40, y: 1100, width: 1800, height: 340, colStep: 350, rowStep: 130 },
  };

  // Build the 4-level nesting hierarchy:
  // Region -> Resource Group -> VNet -> Subnets
  
  // Outer Region node
  result.push({
    id: "region-group",
    type: "RegionGroupNode",
    position: { x: 50, y: 50 },
    data: { label: `Region: ${normProvider === "azure" ? "East US" : normProvider === "aws" ? "us-east-1" : "us-central1"}` },
    style: { width: 2000, height: 1520 },
    zIndex: 1,
  });

  // Resource Group node
  result.push({
    id: "rg-group",
    type: "ResourceGroupNode",
    parentNode: "region-group",
    position: { x: 30, y: 60 },
    data: { label: normProvider === "azure" ? "Resource Group: rg-production" : normProvider === "aws" ? "AWS Account Scope" : "GCP Project Scope" },
    style: { width: 1940, height: 1430 },
    zIndex: 2,
  });

  // VNet node
  result.push({
    id: "vnet-group",
    type: "VNetGroupNode",
    parentNode: "rg-group",
    position: { x: 30, y: 60 },
    data: { label: normProvider === "aws" ? "VPC: 10.0.0.0/16" : "Virtual Network (VNet): 10.0.0.0/16" },
    style: { width: 1880, height: 1340 },
    zIndex: 3,
  });

  // Render subnets and children inside the VNet
  Object.entries(subnetMapping).forEach(([subnetId, childNodes]) => {
    const cfg = subnetConfig[subnetId];
    if (!cfg) return;

    // Dynamically expand subnet sizes if child count exceeds base layout capacity
    const padding = 40;
    const itemsPerRow = Math.max(1, Math.floor(1 + (cfg.width - padding - 256) / cfg.colStep));
    const rows = Math.ceil(childNodes.length / itemsPerRow);
    
    let subWidth = cfg.width;
    let subHeight = cfg.height;
    if (childNodes.length > 0) {
      if (childNodes.length > itemsPerRow) {
        subHeight = Math.max(cfg.height, rows * cfg.rowStep + 80);
      }
      const cols = Math.min(childNodes.length, itemsPerRow);
      const neededWidth = (cols - 1) * cfg.colStep + padding + 256;
      subWidth = Math.max(cfg.width, neededWidth);
    }

    // Add Subnet Group Node
    result.push({
      id: subnetId,
      type: "SubnetGroupNode",
      parentNode: "vnet-group",
      position: { x: cfg.x, y: cfg.y },
      data: { label: cfg.label, width: subWidth, height: subHeight },
      style: { width: subWidth, height: subHeight },
      zIndex: 4,
    });

    // Position resources inside their respective subnet relative coordinates
    childNodes.forEach((node, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      
      const childX = padding + col * cfg.colStep;
      const childY = 60 + row * cfg.rowStep;

      result.push({
        ...node,
        parentNode: subnetId,
        position: { x: childX, y: childY },
        data: {
          ...node.data,
          provider: normProvider,
        },
        zIndex: 5,
      });
    });
  });

  return result;
}

export default function ArchitectureCanvas({
  initialNodes,
  initialEdges,
  onTopologyChange,
  isApproved,
  onApprove,
  onRegenerate,
  undo,
  redo,
  triggerAiAssist,
  onSelectNode,
}: ArchitectureCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // ── Sync canvas when parent props change ───────────────────────────────────
  useEffect(() => {
    setNodes(initialNodes as Node[]);
    setEdges(initialEdges as Edge[]);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // ── Close context menu on global click ─────────────────────────────────────
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // ── Label inline edit ──────────────────────────────────────────────────────
  const handleLabelChange = useCallback(
    (id: string, newLabel: string) => {
      setNodes((nds) => {
        const next = nds.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, label: newLabel } } : node
        );
        triggerParentSync(next, edges);
        return next;
      });
    },
    [edges]
  );

  // ── Bind per-node listener props before passing to React Flow ──────────────
  const bindNodeListeners = useCallback(
    (nds: Node[]): Node[] =>
      nds.map((n) => {
        const isGroup = ["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"].includes(n.type || "");
        return {
          ...n,
          draggable: !isGroup && !(n as any).draggableLocked,
          data: {
            ...n.data,
            onLabelChange: handleLabelChange,
            id: n.id,
          },
        };
      }),
    [handleLabelChange]
  );

  // ── Derive services list from canvas nodes ──────────────────────────────────
  const triggerParentSync = useCallback(
    (updatedNodes: Node[], updatedEdges: Edge[]) => {
      const categoryMap: Record<string, string> = {
        GatewayNode: "gateway",
        FrontendNode: "frontend",
        BackendNode: "backend",
        DatabaseNode: "database",
        CacheNode: "cache",
        StorageNode: "storage",
        SecurityNode: "security",
        MonitoringNode: "monitoring",
      };

      const services: ServiceSchema[] = updatedNodes
        .filter((n) => !["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"].includes(n.type || ""))
        .map((node) => ({
          name: node.data?.label ?? node.id,
          category: categoryMap[node.type ?? ""] ?? "backend",
          description: `Visual node representing ${node.data?.label ?? node.id}.`,
        }));

      onTopologyChange(
        updatedNodes as unknown as NodeSchema[],
        updatedEdges as unknown as EdgeSchema[],
        services
      );
    },
    [onTopologyChange]
  );

  // ── React Flow event handlers ──────────────────────────────────────────────
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Defer sync to allow React Flow states to settle
      setTimeout(() => triggerParentSync(nodes, edges), 0);
    },
    [onNodesChange, nodes, edges, triggerParentSync]
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...params,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            id: `e-${params.source}-${params.target}`,
          },
          eds
        );
        triggerParentSync(nodes, next);
        return next;
      });
    },
    [nodes, setEdges, triggerParentSync]
  );

  // ── HTML5 Drag & Drop ──────────────────────────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!wrapperRef.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow-type");
      if (!type) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const labelMap: Record<string, string> = {
        GatewayNode: "App Gateway Controller",
        FrontendNode: "Web Client Static App",
        BackendNode: "Container App Service",
        DatabaseNode: "PostgreSQL Flexible Server",
        CacheNode: "Redis Cache Engine",
        StorageNode: "Storage Account Blob",
        SecurityNode: "Key Vault Secrets",
        MonitoringNode: "Log Analytics Workspace",
      };

      const id = `${type.toLowerCase().replace("node", "")}-${Date.now()}`;
      
      // Attempt to find if we dropped it inside a subnet group
      // React Flow coordinates are relative when dropped inside a parent
      let parentNodeId: string | undefined = undefined;
      const targetSubnet = nodes.find((n) => {
        if (n.type !== "SubnetGroupNode") return false;
        const width = n.style?.width || n.data?.width || 300;
        const height = n.style?.height || n.data?.height || 200;
        const nx = n.position.x;
        const ny = n.position.y;
        
        // Convert screen drop position back to relative coords
        return position.x >= nx && position.x <= nx + Number(width) &&
               position.y >= ny && position.y <= ny + Number(height);
      });

      if (targetSubnet) {
        parentNodeId = targetSubnet.id;
        position.x = position.x - targetSubnet.position.x;
        position.y = position.y - targetSubnet.position.y;
      }

      const newNode: Node = {
        id,
        type,
        parentNode: parentNodeId,
        data: { label: labelMap[type] ?? "New Service" },
        position,
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        triggerParentSync(next, edges);
        return next;
      });
    },
    [reactFlowInstance, nodes, edges, setNodes, triggerParentSync]
  );

  // ── Node selection ─────────────────────────────────────────────────────────
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node as unknown as NodeSchema);
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  // ── Context menu ───────────────────────────────────────────────────────────
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (!wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      setContextMenu({
        id: node.id,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    []
  );

  const toggleNodeLock = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const next = nds.map((n) =>
          n.id === nodeId ? { ...n, draggableLocked: !(n as any).draggableLocked } : n
        );
        triggerParentSync(next, edges);
        return next;
      });
      setContextMenu(null);
    },
    [edges, setNodes, triggerParentSync]
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const src = nodes.find((n) => n.id === nodeId);
      if (!src) return;

      const id = `${(src.type ?? "node").toLowerCase().replace("node", "")}-${Date.now()}`;
      const newNode: Node = {
        ...src,
        id,
        position: { x: src.position.x + 30, y: src.position.y + 30 },
        selected: false,
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        triggerParentSync(next, edges);
        return next;
      });
      setContextMenu(null);
    },
    [nodes, edges, setNodes, triggerParentSync]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const nextNds = nds.filter((n) => n.id !== nodeId);
        setEdges((eds) => {
          const nextEds = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
          triggerParentSync(nextNds, nextEds);
          return nextEds;
        });
        return nextNds;
      });
      setContextMenu(null);
    },
    [setEdges, setNodes, triggerParentSync]
  );

  // ── Upgraded visual nested layout auto-arrange ─────────────────────────────
  const autoArrangeLayout = useCallback(() => {
    setNodes((nds) => {
      const provider = nds.find(n => n.data?.provider)?.data?.provider || "azure";
      const arranged = computeHierarchicalLayout(nds, provider);
      triggerParentSync(arranged, edges);
      return arranged;
    });
    setTimeout(() => reactFlowInstance?.fitView({ padding: 0.15 }), 120);
  }, [edges, setNodes, triggerParentSync, reactFlowInstance]);

  const nodesWithListeners = bindNodeListeners(nodes);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full flex flex-col border border-white/10 rounded-2xl bg-[#090b11] shadow-2xl overflow-hidden relative min-h-[600px]"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div className="bg-[#05070c] border-b border-white/5 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center gap-2">
          {isApproved ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-mono shadow-neon-blue/5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Studio Approved — Terraform Sync Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[10px] font-mono animate-pulse">
              <HelpCircle className="w-3.5 h-3.5" />
              Design Mode — HCL Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isApproved && (
            <button
              onClick={onApprove}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-mono font-bold px-4 py-1.5 rounded-lg shadow-neon-blue transition-all active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Design
            </button>
          )}
          <button
            onClick={onRegenerate}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-mono px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear Canvas
          </button>
        </div>
      </div>

      {/* ── Studio toolbar ───────────────────────────────────────────────────── */}
      <div className="bg-[#0d111d] px-4 py-2 border-b border-white/5 flex flex-wrap gap-2 items-center z-10 select-none">
        {/* Undo / Redo */}
        <div className="flex items-center border border-white/5 rounded-lg bg-[#05070c] p-0.5">
          <button
            onClick={undo}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition-all"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition-all"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tiered auto-arrange */}
        <button
          onClick={autoArrangeLayout}
          className="flex items-center gap-1.5 bg-[#05070c] hover:bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 transition-all active:scale-95"
          title="Auto-arrange layout in professional nested boundaries"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
          Auto-Layout
        </button>

        <div className="h-4 border-r border-white/5 mx-1" />

        {/* AI Assist actions */}
        <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest">
          Refactoring:
        </span>
        <button
          onClick={() => triggerAiAssist("optimize_security")}
          className="flex items-center gap-1 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-emerald-300 transition-all"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Security Audit
        </button>
        <button
          onClick={() => triggerAiAssist("add_monitoring")}
          className="flex items-center gap-1 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-blue-300 transition-all"
        >
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          Inject Monitoring
        </button>
        <button
          onClick={() => triggerAiAssist("add_ha")}
          className="flex items-center gap-1 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-purple-300 transition-all"
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          High Availability
        </button>
        <button
          onClick={() => triggerAiAssist("reduce_cost")}
          className="flex items-center gap-1 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-amber-300 transition-all"
        >
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          Cost Optimise
        </button>
      </div>

      {/* ── React Flow canvas ────────────────────────────────────────────────── */}
      <div className="flex-grow w-full relative">
        <ReactFlow
          nodes={nodesWithListeners}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          attributionPosition="bottom-left"
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background color="#1e293b" gap={24} size={1.5} />
          <Controls
            className="!bg-[#0f172a] !border-white/10 !rounded-xl overflow-hidden"
            showInteractive={false}
          />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="!bg-[#070b14] !border-white/10 !rounded-xl"
            nodeColor={(node) => {
              if (node.type === "SubnetGroupNode") return "#334155";
              if (node.type === "VNetGroupNode") return "#0f172a";
              if (node.type === "ResourceGroupNode") return "#065f46";
              if (node.type === "RegionGroupNode") return "#312e81";
              return "#1e1e24";
            }}
            maskColor="rgba(3, 7, 18, 0.7)"
          />
        </ReactFlow>

        {/* ── Context menu ─────────────────────────────────────────────────── */}
        {contextMenu && (
          <div
            className="absolute z-30 bg-[#0f172a] border border-white/10 rounded-xl py-1.5 shadow-2xl w-48 text-left flex flex-col font-mono text-[10px] backdrop-blur-xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => toggleNodeLock(contextMenu.id)}
              className="px-3 py-2 hover:bg-white/5 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              {(nodes.find((n) => n.id === contextMenu.id) as any)?.draggableLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-cyan-400" />
                  Unlock Location
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Lock Location
                </>
              )}
            </button>
            <button
              onClick={() => duplicateNode(contextMenu.id)}
              className="px-3 py-2 hover:bg-white/5 text-slate-300 hover:text-white transition-colors flex items-center gap-2 border-t border-white/5"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              Duplicate Service
            </button>
            <button
              onClick={() => deleteNode(contextMenu.id)}
              className="px-3 py-2 text-rose-400 hover:bg-rose-950/20 transition-colors flex items-center gap-2 border-t border-white/5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Remove Resource
            </button>
          </div>
        )}

        {/* ── Empty canvas hint ────────────────────────────────────────────── */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Plus className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-xs font-mono text-slate-500">
                Drag nodes here or build requirements
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
