"use client";

import { useState, useCallback, useRef } from "react";
import { RequirementInput, ArchitectureResponse, TerraformResponse, NodeSchema, EdgeSchema, ServiceSchema } from "../types";
import { 
  generateArchitecture, generateTerraform, validateSecurity, optimizeCost, explainArchitecture, aiAssistRefactor 
} from "../lib/api";

export function useArchitecture() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [architecture, setArchitecture] = useState<ArchitectureResponse | null>(null);
  const [terraform, setTerraform] = useState<TerraformResponse | null>(null);
  const [tfLoading, setTfLoading] = useState<boolean>(false);
  
  // Workflow approval state
  const [isApproved, setIsApproved] = useState<boolean>(false);

  // Command History Stacks for Undo / Redo operations (Figma style)
  const historyStack = useRef<Array<{ nodes: NodeSchema[]; edges: EdgeSchema[]; services: ServiceSchema[] }>>([]);
  const redoStack = useRef<Array<{ nodes: NodeSchema[]; edges: EdgeSchema[]; services: ServiceSchema[] }>>([]);

  // Store active debounce timers
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hclSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to enrich nodes with Draw.io service types and cost badges
  const enrichNodeData = useCallback((nodes: NodeSchema[]): NodeSchema[] => {
    if (!nodes) return [];
    return nodes.map((node) => {
      if (!node) return node;
      const data = node.data || {};
      const meta = (data as any).customMetadata || {};
      const pricingTier = meta.pricingTier || "Standard";

      let cost = data.cost || "~$25/mo";
      let typeSubText = data.typeSubText || "azurerm_resource";

      const isGeneric = !typeSubText || 
        typeSubText === "azurerm_resource" || 
        typeSubText === "resource" || 
        typeSubText === "" ||
        ["gateway", "frontend", "backend", "database", "cache", "storage", "security", "monitoring",
         "gatewaynode", "frontendnode", "backendnode", "databasenode", "cachenode", "storagenode", "securitynode", "monitoringnode"].includes(typeSubText.toLowerCase());

      switch (node.type) {
        case "GatewayNode":
          cost = pricingTier === "Premium" ? "~$120/mo" : pricingTier === "Standard" ? "~$60/mo" : "~$25/mo";
          if (isGeneric) typeSubText = "azurerm_application_gateway";
          break;
        case "FrontendNode":
          cost = "~$30/mo";
          if (isGeneric) typeSubText = "azurerm_static_web_app";
          break;
        case "BackendNode":
          cost = pricingTier === "Premium" ? "~$150/mo" : pricingTier === "Standard" ? "~$75/mo" : "~$30/mo";
          if (isGeneric) typeSubText = "azurerm_container_app";
          break;
        case "DatabaseNode":
          cost = pricingTier === "Premium" ? "~$240/mo" : pricingTier === "Standard" ? "~$115/mo" : "~$45/mo";
          if (isGeneric) typeSubText = "azurerm_postgresql_flexible_server";
          break;
        case "CacheNode":
          cost = pricingTier === "Premium" ? "~$90/mo" : pricingTier === "Standard" ? "~$45/mo" : "~$15/mo";
          if (isGeneric) typeSubText = "azurerm_redis_cache";
          break;
        case "StorageNode":
          cost = "~$25/mo";
          if (isGeneric) typeSubText = "azurerm_storage_account";
          break;
        case "SecurityNode":
          cost = "~$15/mo";
          if (isGeneric) typeSubText = "azurerm_key_vault";
          break;
        case "MonitoringNode":
          cost = "~$20/mo";
          if (isGeneric) typeSubText = "azurerm_log_analytics_workspace";
          break;
      }

      const isGroupNode = ["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"].includes(node.type || "");
      const customMetadata = isGroupNode ? undefined : {
        pricingTier,
        minReplicas: meta.minReplicas || "1",
        maxReplicas: meta.maxReplicas || "5",
        forceHttps: meta.forceHttps !== undefined ? meta.forceHttps : true,
        subnetName: meta.subnetName || "subnet-default"
      };

      return {
        ...node,
        data: {
          ...data,
          cost,
          typeSubText,
          ...(customMetadata ? { customMetadata } : {})
        },
      };
    });
  }, []);

  // Saves current visual graph onto the history stack before making any change
  const pushToHistory = useCallback((nodes: NodeSchema[], edges: EdgeSchema[], services: ServiceSchema[]) => {
    const clone = JSON.parse(JSON.stringify({ nodes, edges, services }));
    historyStack.current.push(clone);
    if (historyStack.current.length > 50) {
      historyStack.current.shift();
    }
    redoStack.current = [];
  }, []);

  // Restores a historical layout state
  const undo = useCallback(() => {
    if (!architecture || historyStack.current.length === 0) return;
    
    const current = JSON.parse(JSON.stringify({
      nodes: architecture.nodes,
      edges: architecture.edges,
      services: architecture.services
    }));
    redoStack.current.push(current);

    const prev = historyStack.current.pop()!;
    const enrichedNodes = enrichNodeData(prev.nodes);

    setArchitecture(prevArch => {
      if (!prevArch) return null;
      return {
        ...prevArch,
        nodes: enrichedNodes,
        edges: prev.edges,
        services: prev.services
      };
    });

    if (isApproved) {
      syncCanvasWithBackend(enrichedNodes, prev.edges, prev.services, architecture.cloud_provider);
    }
  }, [architecture, isApproved, enrichNodeData]);

  // Redos a popped layout state
  const redo = useCallback(() => {
    if (!architecture || redoStack.current.length === 0) return;

    const current = JSON.parse(JSON.stringify({
      nodes: architecture.nodes,
      edges: architecture.edges,
      services: architecture.services
    }));
    historyStack.current.push(current);

    const next = redoStack.current.pop()!;
    const enrichedNodes = enrichNodeData(next.nodes);

    setArchitecture(prevArch => {
      if (!prevArch) return null;
      return {
        ...prevArch,
        nodes: enrichedNodes,
        edges: next.edges,
        services: next.services
      };
    });

    if (isApproved) {
      syncCanvasWithBackend(enrichedNodes, next.edges, next.services, architecture.cloud_provider);
    }
  }, [architecture, isApproved, enrichNodeData]);

  // Generates complete initial architecture topology
  const triggerGenerate = useCallback(async (input: RequirementInput) => {
    setLoading(true);
    setError(null);
    setIsApproved(false);
    setTerraform(null);
    historyStack.current = [];
    redoStack.current = [];
    try {
      const data = await generateArchitecture(input);
      const enrichedNodes = enrichNodeData(data.nodes);
      
      setArchitecture({
        ...data,
        nodes: enrichedNodes,
      });
    } catch (err: any) {
      setError(err.message || "Failed to trigger multi-agent pipeline");
    } finally {
      setLoading(false);
    }
  }, [enrichNodeData]);

  // Compiles HCL and gathers analysis once approved
  const approveArchitecture = useCallback(async (architectureOverride?: ArchitectureResponse | null, forceRegenerate?: boolean) => {
    const activeArchitecture = architectureOverride ?? architecture;
    if (!activeArchitecture) return;
    setIsApproved(true);
    setTfLoading(true);
    setError(null);
    try {
      const tfPromise = generateTerraform({
        nodes: activeArchitecture.nodes,
        edges: activeArchitecture.edges,
        services: activeArchitecture.services,
        cloud_provider: activeArchitecture.cloud_provider,
        force_regenerate: forceRegenerate
      });
      const securityPromise = validateSecurity(activeArchitecture.nodes, activeArchitecture.services);
      const costPromise = optimizeCost(activeArchitecture.nodes, activeArchitecture.services);
      const explanationPromise = explainArchitecture(activeArchitecture.nodes, activeArchitecture.services);

      const [tfData, securityData, costData, explanationData] = await Promise.all([
        tfPromise, securityPromise, costPromise, explanationPromise
      ]);

      setTerraform(tfData);

      setArchitecture(prev => {
        if (!prev) return null;
        return {
          ...prev,
          cost_estimate: parseFloat(costData.estimated_monthly_cost || 120.0),
          cost_breakdown: costData.cost_breakdown || [],
          optimization_recommendations: costData.optimization_recommendations || [],
          security_score: parseInt(securityData.security_score || 85),
          security_findings: securityData.security_findings || [],
          compliance_checks: securityData.compliance_checks || [],
          explanation: explanationData.explanation || "",
          alternatives_considered: explanationData.alternatives_considered || "",
          justification_for_choices: explanationData.justification_for_choices || ""
        };
      });
    } catch (err: any) {
      setError("Failed compiling infrastructure configurations: " + err.message);
    } finally {
      setTfLoading(false);
    }
  }, [architecture]);

  // Reset workspace / Blank Canvas creation
  const regenerateArchitecture = useCallback(() => {
    setArchitecture({
      nodes: [],
      edges: [],
      services: [],
      cloud_provider: "azure",
      cost_estimate: 0.0,
      cost_breakdown: [],
      optimization_recommendations: [],
      complexity_score: 10,
      operational_overhead_score: 5,
      overengineered: false,
      warnings: [],
      security_score: 95,
      security_findings: [],
      compliance_checks: [],
      explanation: "Blank Canvas workspace initialized successfully.",
      alternatives_considered: "N/A",
      justification_for_choices: "Manual visual composition.",
      terraform_modules: []
    });
    setTerraform(null);
    setIsApproved(false);
    setError(null);
    historyStack.current = [];
    redoStack.current = [];
  }, []);

  // Triggers live synchronization for HCL and audits
  const syncCanvasWithBackend = useCallback(async (
    currentNodes: NodeSchema[], 
    currentEdges: EdgeSchema[], 
    currentServices: ServiceSchema[],
    provider: string
  ) => {
    setTfLoading(true);
    try {
      const tfPromise = generateTerraform({
        nodes: currentNodes,
        edges: currentEdges,
        services: currentServices,
        cloud_provider: provider
      });
      const securityPromise = validateSecurity(currentNodes, currentServices);
      const costPromise = optimizeCost(currentNodes, currentServices);
      const explanationPromise = explainArchitecture(currentNodes, currentServices);

      const [tfData, securityData, costData, explanationData] = await Promise.all([
        tfPromise, securityPromise, costPromise, explanationPromise
      ]);

      setTerraform(tfData);

      setArchitecture(prev => {
        if (!prev) return null;
        return {
          ...prev,
          cost_estimate: parseFloat(costData.estimated_monthly_cost || 120.0),
          cost_breakdown: costData.cost_breakdown || [],
          optimization_recommendations: costData.optimization_recommendations || [],
          security_score: parseInt(securityData.security_score || 85),
          security_findings: securityData.security_findings || [],
          compliance_checks: securityData.compliance_checks || [],
          explanation: explanationData.explanation || "",
          alternatives_considered: explanationData.alternatives_considered || "",
          justification_for_choices: explanationData.justification_for_choices || ""
        };
      });
    } catch (err) {
      console.error("Live HCL recalculation failure:", err);
    } finally {
      setTfLoading(false);
    }
  }, []);

  // Triggered on visual modifications inside React Flow editor
  const updateLocalTopology = useCallback(async (
    newNodes: NodeSchema[], 
    newEdges: EdgeSchema[], 
    newServices: ServiceSchema[]
  ) => {
    if (!architecture) return;
    
    try {
      // Save state onto history stack first!
      pushToHistory(architecture.nodes || [], architecture.edges || [], architecture.services || []);

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      const enrichedNewNodes = enrichNodeData(newNodes || []);

      const updatedArch = {
        ...architecture,
        nodes: enrichedNewNodes,
        edges: newEdges || [],
        services: newServices || []
      };
      setArchitecture(updatedArch);
      
      if (isApproved) {
        syncTimeoutRef.current = setTimeout(() => {
          syncCanvasWithBackend(enrichedNewNodes, newEdges || [], newServices || [], architecture.cloud_provider);
        }, 800);
      }
    } catch (err) {
      console.error("Error updating local topology:", err);
    }
  }, [architecture, isApproved, enrichNodeData, pushToHistory, syncCanvasWithBackend]);

  // Bi-directional Synchronization: Parse HCL changes and apply them back to the Canvas
  const handleHclCodeChange = useCallback((newCode: string, tab: "main" | "variables" | "outputs" | "tfvars") => {
    if (!architecture || !terraform) return;
    
    // Update local terraform block state first
    const updatedTf = { ...terraform };
    if (tab === "main") updatedTf.main_tf = newCode;
    if (tab === "variables") updatedTf.variables_tf = newCode;
    if (tab === "outputs") updatedTf.outputs_tf = newCode;
    if (tab === "tfvars") updatedTf.terraform_tfvars = newCode;
    setTerraform(updatedTf);

    // Debounce canvas sync updates to prevent layout freeze during typing
    if (hclSyncTimeoutRef.current) {
      clearTimeout(hclSyncTimeoutRef.current);
    }

    hclSyncTimeoutRef.current = setTimeout(() => {
      let canvasModified = false;
      const nextNodes = architecture.nodes.map((node) => {
        const nextNode = { ...node };
        const label = (node.data.label || "").toLowerCase();
        const nodeId = (node.id || "").toLowerCase();

        // 1. Detect AKS Node/Instance count changes in HCL code
        if (node.type === "BackendNode" && label.includes("aks")) {
          const countMatch = newCode.match(/node_count\s*=\s*(\d+)/) || newCode.match(/capacity\s*=\s*(\d+)/);
          if (countMatch) {
            const countVal = countMatch[1];
            const meta = (nextNode.data as any).customMetadata || {};
            if (meta.maxReplicas !== countVal) {
              nextNode.data = {
                ...nextNode.data,
                label: `AKS Cluster (${countVal} Nodes)`,
                customMetadata: { ...meta, maxReplicas: countVal }
              };
              canvasModified = true;
            }
          }
        }

        // 2. Detect PostgreSQL flexible server pricing tier changes
        if (node.type === "DatabaseNode" && label.includes("postgres")) {
          const skuMatch = newCode.match(/sku_name\s*=\s*"([^"]+)"/);
          if (skuMatch) {
            const skuVal = skuMatch[1];
            const meta = (nextNode.data as any).customMetadata || {};
            const derivedTier = skuVal.includes("GP_") ? "Premium" : skuVal.includes("B_") ? "Basic" : "Standard";
            if (meta.pricingTier !== derivedTier) {
              nextNode.data = {
                ...nextNode.data,
                cost: derivedTier === "Premium" ? "~$240/mo" : derivedTier === "Basic" ? "~$45/mo" : "~$115/mo",
                customMetadata: { ...meta, pricingTier: derivedTier }
              };
              canvasModified = true;
            }
          }
        }

        // 3. Detect VNet CIDR changes (address_space = ["X.X.X.X/Y"])
        if (node.type === "VNetGroupNode" || nodeId === "vnet-group") {
          const vnetCidrMatch = newCode.match(/address_space\s*=\s*\["([^"]+)"\]/);
          if (vnetCidrMatch) {
            const newCidr = vnetCidrMatch[1];
            const currentLabel = nextNode.data.label || "";
            if (!currentLabel.includes(newCidr)) {
              nextNode.data = {
                ...nextNode.data,
                label: `Virtual Network (VPC): ${newCidr}`
              };
              canvasModified = true;
            }
          }
        }

        // 4. Detect Subnet CIDR changes (address_prefixes = ["X.X.X.X/Y"])
        if (node.type === "SubnetGroupNode" && nodeId.startsWith("subnet-")) {
          const subnetPattern = new RegExp(
            `resource\\s+"azurerm_subnet"\\s+"[^"]*${nodeId.replace(/-/g, "")}[^"]*"[\\s\\S]*?address_prefixes\\s*=\\s*\\["([^"]+)"\\]`,
            "i"
          );
          const subnetMatch = newCode.match(subnetPattern);
          if (subnetMatch) {
            const newCidr = subnetMatch[1];
            const currentLabel = nextNode.data.label || "";
            if (!currentLabel.includes(newCidr)) {
              const subnetName = nodeId.replace("subnet-", "");
              const displayName = subnetName.charAt(0).toUpperCase() + subnetName.slice(1);
              nextNode.data = {
                ...nextNode.data,
                label: `${displayName} Subnet (${newCidr})`
              };
              canvasModified = true;
            }
          }
        }

        // 5. Detect VM size / SKU tier changes for backend compute nodes
        if (node.type === "BackendNode" && (label.includes("aks") || label.includes("cluster") || label.includes("pool"))) {
          const vmSizeMatch = newCode.match(/vm_size\s*=\s*"([^"]+)"/);
          if (vmSizeMatch) {
            const vmSize = vmSizeMatch[1];
            const meta = (nextNode.data as any).customMetadata || {};
            const derivedTier = vmSize.includes("D8") || vmSize.includes("D4") ? "Premium" : vmSize.includes("B2") ? "Basic" : "Standard";
            if (meta.pricingTier !== derivedTier) {
              nextNode.data = {
                ...nextNode.data,
                customMetadata: { ...meta, pricingTier: derivedTier }
              };
              canvasModified = true;
            }
          }
        }

        // 6. Detect Redis capacity / SKU changes
        if (node.type === "CacheNode" && label.includes("redis")) {
          const redisSkuMatch = newCode.match(/sku_name\s*=\s*"(Premium|Standard|Basic)"/i);
          if (redisSkuMatch) {
            const redisTier = redisSkuMatch[1];
            const meta = (nextNode.data as any).customMetadata || {};
            if (meta.pricingTier !== redisTier) {
              nextNode.data = {
                ...nextNode.data,
                cost: redisTier === "Premium" ? "~$90/mo" : redisTier === "Basic" ? "~$15/mo" : "~$45/mo",
                customMetadata: { ...meta, pricingTier: redisTier }
              };
              canvasModified = true;
            }
          }
        }

        // 7. Detect min/max replicas changes (Container Apps, HPA)
        if (node.type === "BackendNode" && nodeId.startsWith("svc-")) {
          const minReplicasMatch = newCode.match(/min_replicas\s*=\s*(\d+)/);
          const maxReplicasMatch = newCode.match(/max_replicas\s*=\s*(\d+)/);
          if (minReplicasMatch || maxReplicasMatch) {
            const meta = (nextNode.data as any).customMetadata || {};
            let changed = false;
            const newMeta = { ...meta };
            if (minReplicasMatch && newMeta.minReplicas !== minReplicasMatch[1]) {
              newMeta.minReplicas = minReplicasMatch[1];
              changed = true;
            }
            if (maxReplicasMatch && newMeta.maxReplicas !== maxReplicasMatch[1]) {
              newMeta.maxReplicas = maxReplicasMatch[1];
              changed = true;
            }
            if (changed) {
              nextNode.data = {
                ...nextNode.data,
                customMetadata: newMeta
              };
              canvasModified = true;
            }
          }
        }

        return nextNode;
      });

      if (canvasModified) {
        setArchitecture({
          ...architecture,
          nodes: nextNodes
        });
        
        // Re-validate details to update scores and cost optimization recommendations
        validateSecurity(nextNodes, architecture.services).then((securityData) => {
          optimizeCost(nextNodes, architecture.services).then((costData) => {
            setArchitecture(prev => {
              if (!prev) return null;
              return {
                ...prev,
                cost_estimate: parseFloat(costData.estimated_monthly_cost || 120.0),
                cost_breakdown: costData.cost_breakdown || [],
                optimization_recommendations: costData.optimization_recommendations || [],
                security_score: parseInt(securityData.security_score || 85),
                security_findings: securityData.security_findings || [],
                compliance_checks: securityData.compliance_checks || []
              };
            });
          });
        });
      }
    }, 1000);
  }, [architecture, terraform]);

  // Triggers AI Refactoring of the active layout graph (Figma cloud-AI style)
  const triggerAiAssist = useCallback(async (action: string) => {
    if (!architecture) return;
    setTfLoading(true);
    try {
      pushToHistory(architecture.nodes, architecture.edges, architecture.services);
      
      const result = await aiAssistRefactor(
        architecture.nodes,
        architecture.edges,
        architecture.services,
        action
      );
      
      const enrichedNodes = enrichNodeData(result.nodes);
      
      setArchitecture(prev => {
        if (!prev) return null;
        return {
          ...prev,
          nodes: enrichedNodes,
          edges: result.edges,
          services: result.services
        };
      });

      await syncCanvasWithBackend(enrichedNodes, result.edges, result.services, architecture.cloud_provider);
      
    } catch (err: any) {
      setError("AI-Assist refactoring failed: " + err.message);
    } finally {
      setTfLoading(false);
    }
  }, [architecture, enrichNodeData, pushToHistory, syncCanvasWithBackend]);

  return {
    loading,
    tfLoading,
    error,
    architecture,
    terraform,
    isApproved,
    triggerGenerate,
    approveArchitecture,
    regenerateArchitecture,
    loadArchitecture: setArchitecture,
    updateLocalTopology,
    undo,
    redo,
    triggerAiAssist,
    handleHclCodeChange,
  };
}
export type UseArchitectureReturn = ReturnType<typeof useArchitecture>;
