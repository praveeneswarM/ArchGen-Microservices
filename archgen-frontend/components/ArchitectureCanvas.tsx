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
  applyNodeChanges,
  applyEdgeChanges,
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
  Shield,
  Server,
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

  // Find existing group nodes in the nodes list (before filtering) to preserve their custom labels
  const existingRegionNode = nodes.find((n) => n.type === "RegionGroupNode");
  const existingRgNode = nodes.find((n) => n.type === "ResourceGroupNode");
  const existingVnetNode = nodes.find((n) => n.type === "VNetGroupNode");
  const existingSubnetNodes = nodes.filter((n) => n.type === "SubnetGroupNode");

  const regionLabel = existingRegionNode?.data?.label || `Region: ${normProvider === "azure" ? "East US" : normProvider === "aws" ? "us-east-1" : "us-central1"}`;
  const rgLabel = existingRgNode?.data?.label || (normProvider === "azure" ? "Resource Group: rg-production" : normProvider === "aws" ? "AWS Account Scope" : "GCP Project Scope");
  const vnetLabel = existingVnetNode?.data?.label || (normProvider === "aws" ? "VPC: 10.0.0.0/16" : "Virtual Network (VNet): 10.0.0.0/16");

  const getSubnetLabel = (id: string, defaultLabel: string) => {
    const found = existingSubnetNodes.find((n) => n.id === id);
    return found?.data?.label || defaultLabel;
  };

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

  // Calculate Subnet Sizes dynamically based on child node counts
  const subnetDimensions: Record<string, { width: number; height: number; itemsPerRow: number; colStep: number; rowStep: number }> = {};
  
  const getSubnetDims = (subnetId: string, childNodes: Node[], baseWidth: number) => {
    const padding = 40;
    if (childNodes.length === 0) {
      return { width: 320, height: 140, itemsPerRow: 1, colStep: 320, rowStep: 130 };
    }
    let colStep = 320;
    let rowStep = 130;
    if (subnetId === "subnet-app" || subnetId === "subnet-data") {
      colStep = 350;
    }
    
    // How many items fit in a row based on the width
    const itemsPerRow = Math.max(1, Math.floor(1 + (baseWidth - padding - 256) / colStep));
    const cols = Math.min(childNodes.length, itemsPerRow);
    const rows = Math.ceil(childNodes.length / itemsPerRow);
    
    const subWidth = Math.max(baseWidth, (cols - 1) * colStep + padding + 256);
    const subHeight = Math.max(140, rows * rowStep + 80);
    return { width: subWidth, height: subHeight, itemsPerRow, colStep, rowStep };
  };

  // Row 1 widths
  subnetDimensions["subnet-ingress"] = getSubnetDims("subnet-ingress", subnetMapping["subnet-ingress"], 500);
  subnetDimensions["subnet-mgmt"] = getSubnetDims("subnet-mgmt", subnetMapping["subnet-mgmt"], 500);
  subnetDimensions["subnet-pe"] = getSubnetDims("subnet-pe", subnetMapping["subnet-pe"], 320);

  const row1Gap = 40;
  const ingressX = 40;
  const mgmtX = ingressX + subnetDimensions["subnet-ingress"].width + row1Gap;
  const peX = mgmtX + subnetDimensions["subnet-mgmt"].width + row1Gap;
  const row1Width = peX + subnetDimensions["subnet-pe"].width;
  const row1Height = Math.max(
    subnetDimensions["subnet-ingress"].height,
    subnetDimensions["subnet-mgmt"].height,
    subnetDimensions["subnet-pe"].height
  );

  // Row 2 and 3 can stretch to cover the row1Width
  const stretchedWidth = row1Width - 40;
  subnetDimensions["subnet-app"] = getSubnetDims("subnet-app", subnetMapping["subnet-app"], stretchedWidth);
  subnetDimensions["subnet-data"] = getSubnetDims("subnet-data", subnetMapping["subnet-data"], stretchedWidth);

  const appX = 40;
  const appY = 60 + row1Height + 40;
  
  const dataX = 40;
  const dataY = appY + subnetDimensions["subnet-app"].height + 40;

  // Bounding box of all subnets relative to vnet-group
  const vnetWidth = row1Width + 40;
  const vnetHeight = dataY + subnetDimensions["subnet-data"].height + 60;

  const rgWidth = vnetWidth + 60;
  const rgHeight = vnetHeight + 90;

  const regionWidth = rgWidth + 60;
  const regionHeight = rgHeight + 90;

  // Outer Region node
  result.push({
    id: "region-group",
    type: "RegionGroupNode",
    position: { x: 50, y: 50 },
    data: { label: regionLabel },
    style: { width: regionWidth, height: regionHeight },
    zIndex: 1,
  });

  // Resource Group node
  result.push({
    id: "rg-group",
    type: "ResourceGroupNode",
    parentNode: "region-group",
    position: { x: 30, y: 60 },
    data: { label: rgLabel },
    style: { width: rgWidth, height: rgHeight },
    zIndex: 2,
  });

  // VNet node
  result.push({
    id: "vnet-group",
    type: "VNetGroupNode",
    parentNode: "rg-group",
    position: { x: 30, y: 60 },
    data: { label: vnetLabel },
    style: { width: vnetWidth, height: vnetHeight },
    zIndex: 3,
  });

  // Subnet configurations for positioning
  const subnetPositions: Record<string, { x: number; y: number }> = {
    "subnet-ingress": { x: ingressX, y: 60 },
    "subnet-mgmt": { x: mgmtX, y: 60 },
    "subnet-pe": { x: peX, y: 60 },
    "subnet-app": { x: appX, y: appY },
    "subnet-data": { x: dataX, y: dataY },
  };

  // Render subnets and children inside the VNet
  const subnetList = ["subnet-ingress", "subnet-mgmt", "subnet-pe", "subnet-app", "subnet-data"];
  subnetList.forEach((subnetId) => {
    const childNodes = subnetMapping[subnetId] || [];
    const dims = subnetDimensions[subnetId];
    const pos = subnetPositions[subnetId];
    const label = getSubnetLabel(subnetId, subnetId === "subnet-ingress" ? "Ingress Subnet (10.0.1.0/24)" : subnetId === "subnet-mgmt" ? "Management Subnet (10.0.4.0/24)" : subnetId === "subnet-pe" ? "Private Endpoint Subnet (10.0.5.0/24)" : subnetId === "subnet-app" ? "Application Subnet (10.0.2.0/24)" : "Data Subnet (10.0.3.0/24)");

    // Add Subnet Group Node
    result.push({
      id: subnetId,
      type: "SubnetGroupNode",
      parentNode: "vnet-group",
      position: { x: pos.x, y: pos.y },
      data: { label: label, width: dims.width, height: dims.height },
      style: { width: dims.width, height: dims.height },
      zIndex: 4,
    });

    // Position resources inside their respective subnet relative coordinates
    const padding = 40;
    childNodes.forEach((node, index) => {
      const row = Math.floor(index / dims.itemsPerRow);
      const col = index % dims.itemsPerRow;
      
      const childX = padding + col * dims.colStep;
      const childY = 60 + row * dims.rowStep;

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

  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // ── Sync canvas when parent props change ───────────────────────────────────
  const hasArrangedOnMount = useRef(false);

  useEffect(() => {
    if (!hasArrangedOnMount.current && initialNodes.length > 0) {
      hasArrangedOnMount.current = true;
      const provider = initialNodes.find(n => n.data?.provider)?.data?.provider || "azure";
      const arranged = computeHierarchicalLayout(initialNodes as Node[], provider);
      setNodes(arranged);
      setEdges(initialEdges as Edge[]);
      setTimeout(() => reactFlowInstance?.fitView({ padding: 0.15 }), 150);
    } else {
      setNodes(initialNodes as Node[]);
      setEdges(initialEdges as Edge[]);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, reactFlowInstance]);

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
        return {
          ...n,
          draggable: !(n as any).draggableLocked,
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
    (updatedNodes?: Node[], updatedEdges?: Edge[]) => {
      const activeNodes = updatedNodes || nodesRef.current;
      const activeEdges = updatedEdges || edgesRef.current;

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

      const services: ServiceSchema[] = activeNodes
        .filter((n) => !["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"].includes(n.type || ""))
        .map((node) => ({
          name: node.data?.label ?? node.id,
          category: categoryMap[node.type ?? ""] ?? "backend",
          description: `Visual node representing ${node.data?.label ?? node.id}.`,
        }));

      onTopologyChange(
        activeNodes as unknown as NodeSchema[],
        activeEdges as unknown as EdgeSchema[],
        services
      );
    },
    [onTopologyChange]
  );

  // ── React Flow event handlers ──────────────────────────────────────────────
  const handleNodesChange = useCallback(
    (changes: any) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        
        const hasRemoval = changes.some((c: any) => c.type === "remove");
        if (hasRemoval) {
          setTimeout(() => triggerParentSync(next, edgesRef.current), 0);
        }

        const hasDimensions = changes.some((c: any) => c.type === "dimensions");
        if (hasDimensions) {
          if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
          resizeTimeoutRef.current = setTimeout(() => {
            triggerParentSync(next, edgesRef.current);
          }, 500);
        }

        return next;
      });
    },
    [setNodes, triggerParentSync]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        const hasRemoval = changes.some((c: any) => c.type === "remove");
        if (hasRemoval) {
          setTimeout(() => triggerParentSync(nodesRef.current, next), 0);
        }
        return next;
      });
    },
    [setEdges, triggerParentSync]
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setNodes((nds) => {
        const isGroupNode = ["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"].includes(node.type || "");
        
        let targetParentType: string | undefined = undefined;
        if (node.type === "SubnetGroupNode") {
          targetParentType = "VNetGroupNode";
        } else if (node.type === "VNetGroupNode") {
          targetParentType = "ResourceGroupNode";
        } else if (node.type === "ResourceGroupNode") {
          targetParentType = "RegionGroupNode";
        } else if (!isGroupNode) {
          targetParentType = "SubnetGroupNode";
        }

        const getAbsolutePosition = (n: Node, allNodes: Node[]): { x: number; y: number } => {
          let x = n.position.x;
          let y = n.position.y;
          let pId = n.parentNode;
          while (pId) {
            const p = allNodes.find((parent) => parent.id === pId);
            if (!p) break;
            x += p.position.x;
            y += p.position.y;
            pId = p.parentNode;
          }
          return { x, y };
        };

        const absPos = getAbsolutePosition(node, nds);
        let newParentNodeId: string | undefined = undefined;

        if (targetParentType) {
          const targetParent = nds.find((n) => {
            if (n.id === node.id) return false;
            if (n.type !== targetParentType) return false;
            
            const parentAbsPos = getAbsolutePosition(n, nds);
            const w = n.style?.width || n.data?.width || 300;
            const h = n.style?.height || n.data?.height || 200;
            
            return absPos.x >= parentAbsPos.x && absPos.x <= parentAbsPos.x + Number(w) &&
                   absPos.y >= parentAbsPos.y && absPos.y <= parentAbsPos.y + Number(h);
          });

          if (targetParent) {
            newParentNodeId = targetParent.id;
          }
        }

        const parentAbs = newParentNodeId 
          ? getAbsolutePosition(nds.find((n) => n.id === newParentNodeId)!, nds) 
          : { x: 0, y: 0 };

        const next = nds.map((n) => {
          if (n.id === node.id) {
            const nextData = { ...n.data };
            if (newParentNodeId && (newParentNodeId.startsWith("subnet-") || newParentNodeId.startsWith("snet-"))) {
              nextData.subnet = newParentNodeId;
            } else if (!newParentNodeId) {
              nextData.subnet = "";
            }
            return {
              ...n,
              parentNode: newParentNodeId,
              data: nextData,
              position: {
                x: absPos.x - parentAbs.x,
                y: absPos.y - parentAbs.y,
              },
            };
          }
          return n;
        });

        setTimeout(() => triggerParentSync(next, edgesRef.current), 0);
        return next;
      });
    },
    [triggerParentSync]
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
        setTimeout(() => triggerParentSync(nodesRef.current, next), 0);
        return next;
      });
    },
    [triggerParentSync]
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
        RegionGroupNode: "Region: East US",
        ResourceGroupNode: "Resource Group: rg-production",
        VNetGroupNode: "Virtual Network (VNet): 10.0.0.0/16",
        SubnetGroupNode: "Subnet Zone (10.0.1.0/24)",
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
      
      // Determine hierarchical parenting based on the dropped type
      let parentNodeId: string | undefined = undefined;
      let targetParentType: string | undefined = undefined;
      
      const isGroupNode = ["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"].includes(type);
      
      if (type === "SubnetGroupNode") {
        targetParentType = "VNetGroupNode";
      } else if (type === "VNetGroupNode") {
        targetParentType = "ResourceGroupNode";
      } else if (type === "ResourceGroupNode") {
        targetParentType = "RegionGroupNode";
      } else if (!isGroupNode) {
        targetParentType = "SubnetGroupNode";
      }

      if (targetParentType) {
        const targetParent = nodes.find((n) => {
          if (n.type !== targetParentType) return false;
          const width = n.style?.width || n.data?.width || 300;
          const height = n.style?.height || n.data?.height || 200;
          const nx = n.position.x;
          const ny = n.position.y;
          
          return position.x >= nx && position.x <= nx + Number(width) &&
                 position.y >= ny && position.y <= ny + Number(height);
        });

        if (targetParent) {
          parentNodeId = targetParent.id;
          position.x = position.x - targetParent.position.x;
          position.y = position.y - targetParent.position.y;
        }
      }

      let style: any = undefined;
      if (type === "RegionGroupNode") {
        style = { width: 1000, height: 800 };
      } else if (type === "ResourceGroupNode") {
        style = { width: 900, height: 700 };
      } else if (type === "VNetGroupNode") {
        style = { width: 800, height: 600 };
      } else if (type === "SubnetGroupNode") {
        style = { width: 350, height: 250 };
      }

      const newNode: Node = {
        id,
        type,
        parentNode: parentNodeId,
        data: { label: labelMap[type] ?? "New Resource" },
        position,
        style,
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
      <div className="flex-grow w-full relative animate-fade-in">
        {/* ── Left Collapsible Node Palette ────────────────────────────────────── */}
        <div 
          className={`absolute top-4 left-4 z-20 w-64 bg-[#05070d]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 flex flex-col max-h-[85%] overflow-hidden ${
            isPaletteOpen ? "translate-x-0 opacity-100" : "-translate-x-72 opacity-0 pointer-events-none"
          }`}
        >
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold font-mono text-cyan-400 uppercase tracking-widest">
              Resource Palette
            </span>
            <button 
              onClick={() => setIsPaletteOpen(false)}
              className="text-[9px] font-mono text-slate-400 hover:text-white border border-white/10 px-1.5 py-0.5 rounded bg-white/5"
            >
              Hide
            </button>
          </div>

          <div className="p-3 overflow-y-auto space-y-4 max-h-[400px] custom-scrollbar">
            {/* Section: Containers */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-bold font-mono text-slate-500 uppercase tracking-wider block">
                Network Containers
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "RegionGroupNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-indigo-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cloud Region</span>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "ResourceGroupNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-emerald-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resource Group</span>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "VNetGroupNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-[#0d111c]"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Virtual Network (VNet)</span>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "SubnetGroupNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-slate-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  <span>Subnet Zone</span>
                </div>
              </div>
            </div>

            {/* Section: Services */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-bold font-mono text-slate-500 uppercase tracking-wider block">
                Cloud Compute & Ingress
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "GatewayNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Application Gateway</span>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "FrontendNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Static Web App</span>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "BackendNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>Container App Compute</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[8px] font-bold font-mono text-slate-500 uppercase tracking-wider block">
                Storage & Databases
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "DatabaseNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Relational Database</span>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "CacheNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Cpu className="w-3.5 h-3.5 text-red-400" />
                  <span>Redis Session Cache</span>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "StorageNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Blob Storage Account</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[8px] font-bold font-mono text-slate-500 uppercase tracking-wider block">
                Security & Monitoring
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "SecurityNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Key className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Key Vault Secrets</span>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, "MonitoringNode")}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#090b11] border border-white/5 hover:border-cyan-500/30 cursor-grab transition-all text-[10px] font-mono text-slate-300 active:cursor-grabbing hover:bg-white/5"
                >
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Log Telemetry Monitor</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Button to re-open palette */}
        {!isPaletteOpen && (
          <button 
            onClick={() => setIsPaletteOpen(true)}
            className="absolute top-4 left-4 z-20 bg-[#05070d]/95 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 hover:text-white transition shadow-lg flex items-center gap-1 hover:bg-white/5"
          >
            <Plus className="w-3 h-3 text-cyan-400" /> Show Palette
          </button>
        )}

        <ReactFlow
          nodes={nodesWithListeners}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
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
