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
    return nodes.map((node) => {
      let cost = node.data.cost || "~$25/mo";
      let typeSubText = node.data.typeSubText || "azurerm_resource";

      switch (node.type) {
        case "GatewayNode":
          cost = "~$60/mo";
          typeSubText = "azurerm_application_gateway";
          break;
        case "FrontendNode":
          cost = "~$30/mo";
          typeSubText = "azurerm_static_web_app";
          break;
        case "BackendNode":
          cost = "~$75/mo";
          typeSubText = "azurerm_container_app";
          break;
        case "DatabaseNode":
          cost = "~$115/mo";
          typeSubText = "azurerm_postgresql_flexible_server";
          break;
        case "CacheNode":
          cost = "~$45/mo";
          typeSubText = "azurerm_redis_cache";
          break;
        case "StorageNode":
          cost = "~$25/mo";
          typeSubText = "azurerm_storage_account";
          break;
        case "SecurityNode":
          cost = "~$15/mo";
          typeSubText = "azurerm_key_vault";
          break;
        case "MonitoringNode":
          cost = "~$20/mo";
          typeSubText = "azurerm_log_analytics_workspace";
          break;
      }

      return {
        ...node,
        data: {
          ...node.data,
          cost,
          typeSubText,
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
  const approveArchitecture = useCallback(async (architectureOverride?: ArchitectureResponse | null) => {
    const activeArchitecture = architectureOverride ?? architecture;
    if (!activeArchitecture) return;
    setIsApproved(true);
    setTfLoading(true);
    try {
      const tfPromise = generateTerraform({
        nodes: activeArchitecture.nodes,
        edges: activeArchitecture.edges,
        services: activeArchitecture.services,
        cloud_provider: activeArchitecture.cloud_provider
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
    
    // Save state onto history stack first!
    pushToHistory(architecture.nodes, architecture.edges, architecture.services);

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    const enrichedNewNodes = enrichNodeData(newNodes);

    const updatedArch = {
      ...architecture,
      nodes: enrichedNewNodes,
      edges: newEdges,
      services: newServices
    };
    setArchitecture(updatedArch);
    
    if (isApproved) {
      syncTimeoutRef.current = setTimeout(() => {
        syncCanvasWithBackend(enrichedNewNodes, newEdges, newServices, architecture.cloud_provider);
      }, 800);
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
