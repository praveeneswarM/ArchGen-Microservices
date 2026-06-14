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
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Tier Layout Configuration ───────────────────────────────────────────────
// Maps each node type to a vertical tier and a tier priority (horizontal order)
const TIER_CONFIG: Record<string, { tier: number; priority: number }> = {
  GatewayNode:    { tier: 0, priority: 0 },
  FrontendNode:   { tier: 1, priority: 0 },
  BackendNode:    { tier: 2, priority: 0 },
  SecurityNode:   { tier: 2, priority: 1 },
  CacheNode:      { tier: 3, priority: 0 },
  DatabaseNode:   { tier: 3, priority: 1 },
  StorageNode:    { tier: 3, priority: 2 },
  MonitoringNode: { tier: 3, priority: 3 },
};

const TIER_Y_POSITIONS = [80, 260, 440, 620];
const NODE_WIDTH = 280;
const NODE_H_GAP = 60;
const CANVAS_CENTER_X = 500;

/**
 * Computes a professional top-to-bottom tiered layout.
 * Nodes in the same tier are evenly distributed around the canvas center.
 */
function computeTieredLayout(nodes: Node[]): Node[] {
  // Group by tier
  const tiers: Record<number, Node[]> = {};
  nodes.forEach((node) => {
    const cfg = TIER_CONFIG[node.type ?? ""] ?? { tier: 4, priority: 0 };
    if (!tiers[cfg.tier]) tiers[cfg.tier] = [];
    tiers[cfg.tier].push(node);
  });

  const result: Node[] = [];
  let minX = CANVAS_CENTER_X;
  let maxX = CANVAS_CENTER_X;
  let maxY = TIER_Y_POSITIONS[0];

  Object.entries(tiers).forEach(([tierStr, tierNodes]) => {
    const tierIndex = parseInt(tierStr);
    // Sort by priority within the tier
    const sorted = [...tierNodes].sort((a, b) => {
      const pa = TIER_CONFIG[a.type ?? ""]?.priority ?? 0;
      const pb = TIER_CONFIG[b.type ?? ""]?.priority ?? 0;
      return pa - pb;
    });

    const count = sorted.length;
    const totalWidth = count * NODE_WIDTH + (count - 1) * NODE_H_GAP;
    const startX = CANVAS_CENTER_X - totalWidth / 2;
    
    if (startX < minX) minX = startX;
    if (startX + totalWidth > maxX) maxX = startX + totalWidth;
    if ((TIER_Y_POSITIONS[tierIndex] ?? 0) > maxY) maxY = TIER_Y_POSITIONS[tierIndex] ?? 0;

    sorted.forEach((node, i) => {
      result.push({
        ...node,
        position: {
          x: startX + i * (NODE_WIDTH + NODE_H_GAP),
          y: TIER_Y_POSITIONS[tierIndex] ?? 60 + tierIndex * 160,
        },
      });
    });
  });

  // Inject VPC/VNet Container for all nodes EXCEPT gateways (tier 0)
  if (result.some(n => n.type !== "GatewayNode" && n.type !== "NetworkGroupNode")) {
    const startY = (TIER_Y_POSITIONS[1] ?? 260) - 100;
    const endY = maxY + 150;
    
    // Remove any existing vpc group to avoid duplicates
    const filtered = result.filter(n => n.id !== "vpc-group");
    filtered.unshift({
      id: "vpc-group",
      type: "NetworkGroupNode",
      position: { x: minX - 80, y: startY },
      data: {
        label: "Secure Virtual Network (VPC/VNet)",
        width: (maxX - minX) + 160,
        height: endY - startY
      },
      zIndex: -1,
      draggable: false,
      selectable: false,
    });
    return filtered;
  }

  return result;
}

// ─── Component ──────────────────────────────────────────────────────────────

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
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges as Edge[]
  );
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // ── Sync canvas when parent props change (new architecture generated) ──────
  useEffect(() => {
    const rfNodes = initialNodes as Node[];
    setNodes(rfNodes);
    setEdges(initialEdges as Edge[]);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // ── Close context menu on global click ───────────────────────────────────
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // ── Label inline edit ────────────────────────────────────────────────────
  const handleLabelChange = useCallback(
    (id: string, newLabel: string) => {
      setNodes((nds) => {
        const next = nds.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, label: newLabel } }
            : node
        );
        triggerParentSync(next, edges);
        return next;
      });
    },
    [edges] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Bind per-node listener props before passing to React Flow ────────────
  const bindNodeListeners = useCallback(
    (nds: Node[]): Node[] =>
      nds.map((n) => ({
        ...n,
        draggable: !(n as any).draggableLocked,
        data: {
          ...n.data,
          onLabelChange: handleLabelChange,
          id: n.id,
        },
      })),
    [handleLabelChange]
  );

  // ── Derive services list from canvas nodes ────────────────────────────────
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

      const services: ServiceSchema[] = updatedNodes.map((node) => ({
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

  // ── React Flow event handlers ────────────────────────────────────────────
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Defer sync so React Flow state has settled
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

  // ── HTML5 Drag & Drop ────────────────────────────────────────────────────
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
        GatewayNode:    "App Gateway Controller",
        FrontendNode:   "Web Client Static App",
        BackendNode:    "Container App Service",
        DatabaseNode:   "PostgreSQL Flexible Server",
        CacheNode:      "Redis Cache Engine",
        StorageNode:    "Storage Account Blob",
        SecurityNode:   "Key Vault Secrets",
        MonitoringNode: "Log Analytics Workspace",
      };

      const id = `${type.toLowerCase().replace("node", "")}-${Date.now()}`;
      const newNode: Node = {
        id,
        type,
        data: { label: labelMap[type] ?? "New Service" },
        position,
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        triggerParentSync(next, edges);
        return next;
      });
    },
    [reactFlowInstance, edges, setNodes, triggerParentSync]
  );

  // ── Node selection ────────────────────────────────────────────────────────
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node as unknown as NodeSchema);
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  // ── Context menu ─────────────────────────────────────────────────────────
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
          n.id === nodeId
            ? { ...n, draggableLocked: !(n as any).draggableLocked }
            : n
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
          const nextEds = eds.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          );
          triggerParentSync(nextNds, nextEds);
          return nextEds;
        });
        return nextNds;
      });
      setContextMenu(null);
    },
    [setEdges, setNodes, triggerParentSync]
  );

  // ── Professional tiered auto-arrange ─────────────────────────────────────
  const autoArrangeLayout = useCallback(() => {
    setNodes((nds) => {
      const arranged = computeTieredLayout(nds);
      triggerParentSync(arranged, edges);
      return arranged;
    });
    // Fit view after layout settles
    setTimeout(() => reactFlowInstance?.fitView({ padding: 0.15 }), 80);
  }, [edges, setNodes, triggerParentSync, reactFlowInstance]);

  // ── Render ────────────────────────────────────────────────────────────────
  const nodesWithListeners = bindNodeListeners(nodes);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full flex flex-col border border-[#27272a] rounded-2xl bg-[#18181b] shadow-xl overflow-hidden relative min-h-[500px]"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      <div className="bg-[#09090b] border-b border-[#27272a] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center gap-2">
          {isApproved ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Topology Approved — HCL Sync Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full text-sky-400 text-[10px] font-mono animate-pulse">
              <HelpCircle className="w-3.5 h-3.5" />
              Review Mode — HCL Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isApproved && (
            <button
              onClick={onApprove}
              className="bg-white hover:bg-slate-100 text-black text-[11px] font-mono font-bold px-4 py-1.5 rounded-lg shadow transition-all active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Architecture
            </button>
          )}
          <button
            onClick={onRegenerate}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-mono px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Blank Canvas
          </button>
        </div>
      </div>

      {/* ── Studio toolbar ──────────────────────────────────────────────────── */}
      <div className="bg-[#18181b] px-4 py-2 border-b border-[#27272a] flex flex-wrap gap-2 items-center z-10 select-none">
        {/* Undo / Redo */}
        <div className="flex items-center border border-white/5 rounded-lg bg-[#09090b] p-0.5">
          <button
            onClick={undo}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition-all"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tiered auto-arrange */}
        <button
          onClick={autoArrangeLayout}
          className="flex items-center gap-1.5 bg-[#09090b] hover:bg-white/5 border border-[#27272a] px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 transition-all active:scale-95"
          title="Auto-arrange nodes in professional top-to-bottom tiers"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
          Arrange
        </button>

        <div className="h-4 border-r border-[#27272a] mx-1" />

        {/* AI Assist actions */}
        <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest">
          AI Assist:
        </span>
        <button
          onClick={() => triggerAiAssist("optimize_security")}
          className="flex items-center gap-1 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-emerald-300 transition-all"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Security-First
        </button>
        <button
          onClick={() => triggerAiAssist("add_monitoring")}
          className="flex items-center gap-1 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-blue-300 transition-all"
        >
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          Add Monitor
        </button>
        <button
          onClick={() => triggerAiAssist("add_ha")}
          className="flex items-center gap-1 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-purple-300 transition-all"
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          Add HA
        </button>
        <button
          onClick={() => triggerAiAssist("reduce_cost")}
          className="flex items-center gap-1 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-amber-300 transition-all"
        >
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          Frugal Stack
        </button>
      </div>

      {/* ── React Flow canvas ───────────────────────────────────────────────── */}
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
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background color="#27272a" gap={20} size={1} />
          <Controls
            className="!bg-[#18181b] !border-[#27272a] !rounded-xl overflow-hidden"
            showInteractive={false}
          />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="!bg-[#09090b] !border-[#27272a] !rounded-xl"
            nodeColor="#27272a"
            maskColor="rgba(9,9,11,0.7)"
          />
        </ReactFlow>

        {/* ── Context menu ────────────────────────────────────────────────── */}
        {contextMenu && (
          <div
            className="absolute z-30 bg-[#18181b] border border-[#27272a] rounded-xl py-1.5 shadow-2xl w-44 text-left flex flex-col font-mono text-[10px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => toggleNodeLock(contextMenu.id)}
              className="px-3 py-2 hover:bg-white/5 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              {(nodes.find((n) => n.id === contextMenu.id) as any)
                ?.draggableLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-sky-400" />
                  Unlock Position
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Lock Position
                </>
              )}
            </button>
            <button
              onClick={() => duplicateNode(contextMenu.id)}
              className="px-3 py-2 hover:bg-white/5 text-slate-300 hover:text-white transition-colors flex items-center gap-2 border-t border-white/5"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              Duplicate Node
            </button>
            <button
              onClick={() => deleteNode(contextMenu.id)}
              className="px-3 py-2 text-rose-400 hover:bg-rose-950/20 transition-colors flex items-center gap-2 border-t border-white/5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Delete Service
            </button>
          </div>
        )}

        {/* ── Empty canvas hint ────────────────────────────────────────────── */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-[#27272a] flex items-center justify-center mx-auto mb-3">
                <Plus className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-xs font-mono text-slate-500">
                Drag services from the palette
              </p>
              <p className="text-[10px] font-mono text-slate-600 mt-1">
                or describe your app to generate
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
