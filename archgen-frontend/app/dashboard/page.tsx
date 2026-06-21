"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Download,
  DollarSign,
  Edit3,
  FileCode,
  FolderOpen,
  Globe,
  History,
  Layers,
  Lock,
  LogOut,
  Menu,
  MoonStar,
  Plus,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings2,
  Shield,
  Sparkles,
  SquareStack,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Minimize2,
  Cpu,
  HardDrive,
  Key,
  Activity,
  LayoutGrid,
  ClipboardList,
  Package,
  TerminalSquare,
  AlertTriangle,
} from "lucide-react";

import ArchitectureCanvas from "../../components/ArchitectureCanvas";
import ArchitectureExplanationPanel from "../../components/ArchitectureExplanationPanel";
import CostPanel from "../../components/CostPanel";
import ErrorBoundary from "../../components/ErrorBoundary";
import LoadingScreen from "../../components/LoadingScreen";
import SecurityPanel from "../../components/SecurityPanel";
import ServiceConfigPanel from "../../components/ServiceConfigPanel";
import TerraformPanel from "../../components/TerraformPanel";
import WarningPanel from "../../components/WarningPanel";
import RequirementForm from "../../components/RequirementForm";
import { useArchitecture } from "../../hooks/useArchitecture";
import {
  getCurrentUser,
  listProjects,
  refreshAccessToken,
  saveProject,
  deleteProject,
} from "../../lib/api";
import { RequirementInput, NodeSchema } from "../../types";

type SidebarTab = "dashboard" | "generator" | "studio" | "projects" | "templates" | "terraform" | "validation" | "cost" | "settings";

const PRESETS = [
  {
    title: "SaaS Platform",
    desc: "Multi-tenant SaaS with container cluster routing, SQL storage replica and caching.",
    provider: "azure",
    budget: "1200",
    scale: "100k users",
    descText: "Autonomous multi-tenant enterprise app with strict network separation, secret vaults, read replication, and CDN."
  },
  {
    title: "Banking System",
    desc: "PCI DSS compliant vault protection, zero public ingress endpoints, and replica mirrors.",
    provider: "azure",
    budget: "3500",
    scale: "500k users",
    descText: "Secure transaction backend with HSM key vaults, database private links, DDoS shield, and application node pools."
  },
  {
    title: "E-Commerce Stack",
    desc: "Global CDN delivery, microservices autoscaling pools, Redis caching, and asset storage.",
    provider: "aws",
    budget: "1800",
    scale: "1m users",
    descText: "High-throughput retail backend with edge routing, distributed caches, and cloud database replicas."
  }
];

export default function DashboardPage() {
  const router = useRouter();

  const {
    loading,
    tfLoading,
    error,
    architecture,
    terraform,
    isApproved,
    triggerGenerate,
    approveArchitecture,
    regenerateArchitecture,
    loadArchitecture,
    updateLocalTopology,
    undo,
    redo,
    triggerAiAssist,
    handleHclCodeChange,
  } = useArchitecture();

  const [activeTab, setActiveTab] = useState<SidebarTab>("studio");
  const [activeReviewTab, setActiveReviewTab] = useState<"properties" | "terraform" | "validation">("properties");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const [projectVersions, setProjectVersions] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Toast System State & Refs
  const [toasts, setToasts] = useState<Array<{ id: string; type: "success" | "info" | "warning" | "error"; title: string; message: string }>>([]);
  const lastProcessedArchId = useRef<string | null>(null);
  const lastProcessedTf = useRef<string | null>(null);

  const showToast = useCallback((type: "success" | "info" | "warning" | "error", title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 60000);
  }, []);

  // Monitor architecture changes to display live/fallback/mock toast status
  useEffect(() => {
    if (!architecture) {
      lastProcessedArchId.current = null;
      return;
    }
    const fingerprint = `${architecture.cloud_provider}-${architecture.nodes.length}-${architecture.active_provider}-${architecture.active_model}`;
    if (lastProcessedArchId.current === fingerprint) return;
    lastProcessedArchId.current = fingerprint;

    const providerName = (architecture.active_provider || "").toLowerCase();
    const modelName = architecture.active_model || "Deterministic";

    if (providerName === "mock") {
      showToast("info", "Mock Architecture Loaded", "Loaded mock resource nodes. AI agents are mocked.");
    } else if (providerName === "deterministic" || providerName === "fallback") {
      showToast("warning", "Fallback Architecture Rendered", "AI agents timed out or failed. Compiled using deterministic layout rules.");
    } else if (providerName) {
      showToast("success", "Live AI Architecture Generated", `Successfully generated cloud topology using Live ${architecture.active_provider} (${modelName}).`);
    }
  }, [architecture, showToast]);

  // Monitor terraform HCL changes to display success toast
  useEffect(() => {
    if (!terraform) {
      lastProcessedTf.current = null;
      return;
    }
    const fingerprint = `${terraform.main_tf.length}-${terraform.variables_tf.length}`;
    if (lastProcessedTf.current === fingerprint) return;
    lastProcessedTf.current = fingerprint;

    showToast("success", "Terraform HCL Compiled", "Multi-file Jinja2 templates rendered successfully based on visual node properties.");
  }, [terraform, showToast]);

  // Monitor compilation or infrastructure errors to display toasts
  useEffect(() => {
    if (error) {
      showToast("error", "Infrastructure Error", error);
    }
  }, [error, showToast]);

  // Requirement Config State
  const [projectName, setProjectName] = useState("Enterprise Stack");
  const [cloudProvider, setCloudProvider] = useState("azure");
  const [expectedUsers, setExpectedUsers] = useState("100,000 monthly");
  const [monthlyBudget, setMonthlyBudget] = useState("500");
  const [appDescription, setAppDescription] = useState(
    "A modern enterprise application with secure workflows, predictable costs, and room to scale."
  );
  const [region, setRegion] = useState("East US");
  const [workloadType, setWorkloadType] = useState("SaaS Platform");
  const [availabilityTarget, setAvailabilityTarget] = useState("99.99%");
  const [rto, setRto] = useState("4 hours");
  const [rpo, setRpo] = useState("1 hour");

  const analysisSummary = useMemo(() => {
    if (!architecture) return null;
    return {
      activeProvider: architecture.active_provider || architecture.cloud_provider,
      activeModel: architecture.active_model || "gpt-4-default",
      fallbackTrigger: architecture.fallback_trigger || "none",
      executionTimeMs: architecture.execution_time_ms || 0,
      generationSource: architecture.generation_source || "deterministic+ollama",
      nodeCount: architecture.node_count || 0,
      edgeCount: architecture.edge_count || 0,
      subnetCount: architecture.subnet_count || 0,
      provider: architecture.provider || architecture.cloud_provider,
      costEstimate: architecture.cost_estimate || 0
    };
  }, [architecture]);

  const pushActivity = useCallback((entry: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setActivityLog((prev) => [`${timestamp} · ${entry}`, ...prev].slice(0, 15));
  }, []);

  const loadSavedProjects = useCallback(async (token: string) => {
    try {
      const projects = await listProjects(token);
      setSavedProjects(projects);
    } catch (loadError) {
      console.error("Failed to load projects", loadError);
    }
  }, []);

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem("archgen_auth_token");
      const refreshToken = localStorage.getItem("archgen_refresh_token");
      const cachedUser = localStorage.getItem("archgen_username");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const user = await getCurrentUser(token);
        setAuthToken(token);
        setUsername(user.username || cachedUser || "User");
        loadSavedProjects(token);
      } catch {
        if (refreshToken) {
          try {
            const newToken = await refreshAccessToken(refreshToken);
            localStorage.setItem("archgen_auth_token", newToken);
            const user = await getCurrentUser(newToken);
            setAuthToken(newToken);
            setUsername(user.username || cachedUser || "User");
            loadSavedProjects(newToken);
            return;
          } catch (refreshError) {
            console.error("Session refresh failed", refreshError);
          }
        }

        localStorage.removeItem("archgen_auth_token");
        localStorage.removeItem("archgen_refresh_token");
        localStorage.removeItem("archgen_username");
        router.push("/login");
      }
    };

    validateSession();
  }, [loadSavedProjects, router]);

  const handleWizardSubmit = async (formData: RequirementInput) => {
    setProjectName(formData.projectName || formData.application_type || "Enterprise Stack");
    setCloudProvider(formData.cloud_provider);
    setExpectedUsers(formData.expected_users);
    setMonthlyBudget(formData.monthly_budget);
    setAppDescription(formData.app_description);
    setRegion(formData.region || "East US");
    setWorkloadType(formData.application_type || "SaaS Platform");
    setAvailabilityTarget(formData.availability_target || "99.99%");
    setRto(formData.rto || "4 hours");
    setRpo(formData.rpo || "1 hour");
    
    pushActivity("AI planning started using fallback chain");
    await triggerGenerate(formData);
    pushActivity("AI planning completed successfully");
    setActiveTab("studio");
  };

  const handleOpenProject = (proj: any) => {
    setActiveProjectId(proj.id);
    setProjectName(proj.name);
    setCloudProvider(proj.cloud_provider || "azure");
    setSelectedNode(null);
    setRegion(proj.region || (proj.cloud_provider === "aws" ? "us-east-1" : "East US"));
    setWorkloadType(proj.workload_type || "SaaS Platform");
    setAvailabilityTarget(proj.availability_target || "99.99%");
    setRto(proj.rto || "4 hours");
    setRpo(proj.rpo || "1 hour");
    loadArchitecture({
      nodes: proj.nodes,
      edges: proj.edges,
      services: proj.services,
      cloud_provider: proj.cloud_provider || "azure",
      active_provider: proj.active_provider,
      active_model: proj.active_model,
      fallback_trigger: proj.fallback_trigger,
      cost_estimate: proj.cost_estimate || 0,
      cost_breakdown: [],
      optimization_recommendations: [],
      complexity_score: 45,
      operational_overhead_score: 30,
      overengineered: false,
      warnings: [],
      security_score: 85,
      security_findings: [],
      compliance_checks: [],
      explanation: "Restored from database cache.",
      alternatives_considered: "N/A",
      justification_for_choices: "Manual visual composition.",
      terraform_modules: [],
    } as any);
    setActiveTab("studio");
    pushActivity(`Opened project "${proj.name}"`);
    loadProjectVersions(proj.id);
  };

  const handleSaveProject = async () => {
    if (!architecture || !authToken) return;
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        id: activeProjectId || undefined,
        name: projectName,
        nodes: architecture.nodes,
        edges: architecture.edges,
        services: architecture.services,
        cloud_provider: architecture.cloud_provider,
        cost_estimate: architecture.cost_estimate,
        region: region,
        workload_type: workloadType,
        availability_target: availabilityTarget,
        rto: rto,
        rpo: rpo,
      };

      const result = await saveProject(payload, authToken);
      setSaveSuccess(true);
      if (result.id) {
        setActiveProjectId(result.id);
        loadProjectVersions(result.id);
      } else if (activeProjectId) {
        loadProjectVersions(activeProjectId);
      }
      loadSavedProjects(authToken);
      pushActivity("Project saved successfully");
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (saveProjectError: any) {
      setSaveError(saveProjectError.message || "Failed to save project");
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authToken) return;
    try {
      await deleteProject(projectId, authToken);
      if (activeProjectId === projectId) {
        regenerateArchitecture();
        setActiveProjectId(null);
      }
      loadSavedProjects(authToken);
      pushActivity("Project deleted");
    } catch (deleteError) {
      console.error("Delete project failure:", deleteError);
    }
  };

  const loadProjectVersions = useCallback(async (projId?: string) => {
    const id = projId || activeProjectId;
    if (!id || !authToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/projects/${id}/versions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjectVersions(data);
      }
    } catch (err) {
      console.error("Failed to load project versions", err);
    }
  }, [activeProjectId, authToken]);

  const handleRollback = async (versionId: string) => {
    if (!activeProjectId || !authToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/projects/${activeProjectId}/versions/${versionId}/rollback`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        pushActivity(`Rolled back project to version ${versionId}`);
        // Reload project
        const projectRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/projects/${activeProjectId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (projectRes.ok) {
          const proj = await projectRes.json();
          setRegion(proj.region || (proj.cloud_provider === "aws" ? "us-east-1" : "East US"));
          setWorkloadType(proj.workload_type || "SaaS Platform");
          setAvailabilityTarget(proj.availability_target || "99.99%");
          setRto(proj.rto || "4 hours");
          setRpo(proj.rpo || "1 hour");
          loadArchitecture({
            nodes: proj.nodes,
            edges: proj.edges,
            services: proj.services,
            cloud_provider: proj.cloud_provider || "azure",
            active_provider: proj.active_provider,
            active_model: proj.active_model,
            fallback_trigger: proj.fallback_trigger,
            cost_estimate: proj.cost_estimate || 0,
            cost_breakdown: [],
            optimization_recommendations: [],
            complexity_score: 45,
            operational_overhead_score: 30,
            overengineered: false,
            warnings: [],
            security_score: 85,
            security_findings: [],
            compliance_checks: [],
            explanation: "Restored from database cache snapshot.",
            alternatives_considered: "N/A",
            justification_for_choices: "Manual visual composition.",
            terraform_modules: [],
          } as any);
        }
        loadProjectVersions(activeProjectId);
      }
    } catch (err) {
      console.error("Rollback failed", err);
    }
  };

  const handleApprove = useCallback(async () => {
    pushActivity("Approving architecture design...");
    try {
      await approveArchitecture();
      pushActivity("Validation complete. Terraform HCL compiled successfully.");
      setActiveTab("terraform");
    } catch (err: any) {
      pushActivity(`Approval failed: ${err.message}`);
    }
  }, [approveArchitecture, pushActivity]);

  const handleForceRegenerate = useCallback(async () => {
    pushActivity("Force regenerating HCL (bypassing drift check)...");
    try {
      await approveArchitecture(null, true);
      pushActivity("Terraform HCL forced regeneration successful.");
      showToast("success", "Infrastructure Regenerated", "Terraform configurations compiled successfully, ignoring drift.");
    } catch (err: any) {
      pushActivity(`Force regeneration failed: ${err.message}`);
    }
  }, [approveArchitecture, pushActivity, showToast]);

  const handleLogout = () => {
    localStorage.removeItem("archgen_auth_token");
    localStorage.removeItem("archgen_refresh_token");
    localStorage.removeItem("archgen_username");
    router.push("/login");
  };

  const handleUpdateNode = useCallback(
    (nodeId: string, updatedData: any) => {
      if (!architecture) return;
      const nextNodes = architecture.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updatedData,
              },
            }
          : node
      );
      updateLocalTopology(nextNodes, architecture.edges, architecture.services);
      setSelectedNode(null);
      pushActivity(`Updated properties of node ${nodeId}`);
    },
    [architecture, pushActivity, updateLocalTopology]
  );

  const exportArchitectureJson = () => {
    if (!architecture) return;
    const jsonStr = JSON.stringify(architecture, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    saveAs(blob, `${projectName.replace(/\s+/g, "_").toLowerCase()}-architecture.json`);
    pushActivity("Exported architecture JSON");
  };

  const exportTerraform = async () => {
    if (!terraform) return;
    try {
      const zip = new JSZip();
      zip.file("main.tf", terraform.main_tf || "");
      zip.file("variables.tf", terraform.variables_tf || "");
      zip.file("outputs.tf", terraform.outputs_tf || "");
      zip.file("terraform.tfvars", terraform.terraform_tfvars || "");
      if (terraform.instructions) {
        zip.file("README.md", terraform.instructions);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${projectName.replace(/\s+/g, "_").toLowerCase()}-terraform.zip`);
      pushActivity("Exported Terraform ZIP package");
    } catch (err) {
      console.error("Failed to export Terraform", err);
    }
  };

  const exportPng = async () => {
    const flowEl = document.querySelector(".react-flow") as HTMLElement;
    if (!flowEl) return;
    try {
      const dataUrl = await toPng(flowEl, { backgroundColor: "#0b0f19", pixelRatio: 2 });
      saveAs(dataUrl, `${projectName.replace(/\s+/g, "_").toLowerCase()}-architecture.png`);
      pushActivity("Exported high-res PNG diagram");
    } catch (err) {
      console.error("Failed to export PNG", err);
    }
  };

  const exportPdf = () => {
    window.print();
    pushActivity("Opened printer document context");
  };

  // --- RENDERING TABS ---
  const renderDashboardTab = () => (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Cloud Architecture Studio</h1>
          <p className="text-sm text-slate-400 mt-1">Status report of provisioning nodes, security compliance and workspaces.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={regenerateArchitecture} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono rounded-lg transition shadow-neon-blue">
            Create New Stack
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Total Saved projects</span>
          <span className="text-4xl font-extrabold text-white mt-4">{savedProjects.length}</span>
          <span className="text-xs text-slate-500 mt-2">Provisioned inside secure MongoDB cluster</span>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Active Architecture Nodes</span>
          <span className="text-4xl font-extrabold text-cyan-400 mt-4">{architecture?.nodes.length || 0}</span>
          <span className="text-xs text-slate-500 mt-2">Visually rendered inside canvas viewport</span>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Security Audit Score</span>
          <span className="text-4xl font-extrabold text-emerald-400 mt-4">{architecture?.security_score || 85}/100</span>
          <span className="text-xs text-slate-500 mt-2">Compliance checks passing standard gates</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" /> Recent Workspaces
          </h2>
          <div className="space-y-3">
            {savedProjects.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono">No active projects found. Use Architecture Studio to create one.</p>
            ) : (
              savedProjects.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-950/40 border border-white/5 hover:border-cyan-500/20 transition cursor-pointer" onClick={() => handleOpenProject(p)}>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-200 block truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5 block">{p.cloud_provider} · ${p.cost_estimate || 0}/mo</span>
                  </div>
                  <button onClick={(e) => handleDeleteProject(p.id, e)} className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-rose-400 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" /> Platform Event Telemetry
          </h2>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {activityLog.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono">Activity logs are empty.</p>
            ) : (
              activityLog.map((log, i) => (
                <div key={i} className="text-[10px] font-mono text-slate-400 p-2 rounded bg-white/5 border border-white/5">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Architecture Blueprint Templates</h1>
        <p className="text-sm text-slate-400 mt-1">Pre-configured design blueprints aligned with standard cloud enterprise benchmarks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRESETS.map((p) => (
          <div key={p.title} className="glass-card p-6 rounded-3xl flex flex-col justify-between hover:border-cyan-500/20 transition-all group">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">{p.provider} · {p.scale}</span>
              <h3 className="text-base font-bold text-white mt-2 group-hover:text-cyan-400 transition-colors">{p.title}</h3>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">{p.desc}</p>
            </div>
            <button
              onClick={() => {
                setProjectName(p.title);
                setAppDescription(p.descText);
                setCloudProvider(p.provider);
                setMonthlyBudget(p.budget);
                setExpectedUsers(p.scale);
                setWorkloadType(p.title);
                setActiveTab("studio");
                pushActivity(`Applied ${p.title} blueprint template`);
              }}
              className="mt-6 w-full py-2 bg-white/5 hover:bg-cyan-500 hover:text-slate-950 font-bold text-xs font-mono rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-1.5"
            >
              Configure Template <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGeneratorTab = () => (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Requirements Collection Wizard</h1>
        <p className="text-sm text-slate-400 mt-1">Specify networking boundaries, workload compute configurations, and security protocols to compile your cloud canvas.</p>
      </div>
      <div className="glass-card rounded-3xl p-2 shadow-2xl">
        <RequirementForm onSubmit={handleWizardSubmit} isLoading={loading} />
      </div>
    </div>
  );

  const renderStudioTab = () => (
    <div className="h-full flex flex-col min-h-[calc(100vh-80px)]">
      {/* Studio Header Toolbar */}
      <div className="border-b border-white/5 bg-[#070b13] px-6 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono uppercase tracking-widest">
              Active Studio Canvas
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mt-2 flex items-center gap-2">
              {projectName} 
              <span className="text-xs font-mono text-slate-400 font-normal uppercase">({cloudProvider})</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleSaveProject} className="px-3.5 py-2 bg-[#0d111d] hover:bg-[#1e293b] border border-white/10 text-slate-200 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5">
              <Save className="w-4 h-4" /> Save Project
            </button>
            {activeProjectId && (
              <button 
                onClick={() => {
                  setIsHistoryOpen(!isHistoryOpen);
                  setSelectedNode(null);
                }} 
                className={`px-3.5 py-2 border text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 ${
                  isHistoryOpen 
                    ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" 
                    : "bg-[#0d111d] hover:bg-[#1e293b] border-white/10 text-slate-200"
                }`}
              >
                <History className="w-4 h-4" /> Snapshots
              </button>
            )}
            <button onClick={exportArchitectureJson} className="px-3.5 py-2 bg-[#0d111d] hover:bg-[#1e293b] border border-white/10 text-slate-200 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5">
              <Download className="w-4 h-4" /> JSON
            </button>
            <button onClick={exportPng} className="px-3.5 py-2 bg-[#0d111d] hover:bg-[#1e293b] border border-white/10 text-slate-200 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5">
              <Download className="w-4 h-4" /> PNG
            </button>
            <button onClick={exportTerraform} className="px-3.5 py-2 bg-[#0d111d] hover:bg-[#1e293b] border border-white/10 text-slate-200 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5">
              <FileCode className="w-4 h-4" /> HCL ZIP
            </button>
          </div>
        </div>
      </div>

      {/* Main Full-Screen Workspace */}
      <div className="flex-1 flex relative overflow-hidden min-h-[500px]">
        {/* Center: React Flow Interactive Canvas */}
        <div className="flex-grow relative bg-[#0b0f19] flex flex-col overflow-hidden">
          <ArchitectureCanvas
            key={architecture ? `${architecture.cloud_provider}-${architecture.execution_time_ms}` : "empty"}
            initialNodes={architecture?.nodes || []}
            initialEdges={architecture?.edges || []}
            onTopologyChange={updateLocalTopology}
            isApproved={isApproved}
            onApprove={handleApprove}
            onRegenerate={regenerateArchitecture}
            undo={undo}
            redo={redo}
            triggerAiAssist={triggerAiAssist}
            onSelectNode={(node) => {
              setSelectedNode(node);
              setIsHistoryOpen(false);
            }}
          />
        </div>

        {/* Collapsible Slide-Over Right Drawer: Properties / History */}
        <div 
          className={`absolute top-0 right-0 h-full w-96 bg-[#05070d]/95 border-l border-white/5 z-30 flex flex-col overflow-y-auto transition-transform duration-300 shadow-2xl backdrop-blur-xl ${
            (selectedNode || isHistoryOpen) ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest">
              {selectedNode ? "Resource Configurations" : "Version Snapshots"}
            </span>
            <button 
              onClick={() => {
                setSelectedNode(null);
                setIsHistoryOpen(false);
              }} 
              className="text-[10px] font-mono text-slate-400 hover:text-white border border-white/10 px-2 py-0.5 rounded bg-white/5"
            >
              Close Drawer
            </button>
          </div>

          <div className="p-5 flex-grow">
            {selectedNode ? (
              <ServiceConfigPanel 
                node={selectedNode} 
                onUpdateNode={handleUpdateNode} 
                onClose={() => setSelectedNode(null)} 
              />
            ) : isHistoryOpen ? (
              <div className="space-y-4">
                {activeProjectId && projectVersions.length > 0 ? (
                  <div className="space-y-3 font-mono text-[10px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block">Workspace Snapshots</span>
                    <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
                      {projectVersions.map((v) => (
                        <div key={v.version_id} className="flex justify-between items-center p-3 rounded-lg bg-slate-950/40 border border-white/5">
                          <div>
                            <span className="text-cyan-400 font-bold block">{v.version_id}</span>
                            <span className="text-[8px] text-slate-500 block">
                              {new Date(v.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-300 font-bold">${v.cost_estimate}/mo</span>
                            <button 
                              onClick={() => {
                                handleRollback(v.version_id);
                                setIsHistoryOpen(false);
                              }} 
                              className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 font-mono text-[9px] rounded border border-cyan-500/30 transition"
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                    <h4 className="text-xs font-bold text-slate-300">No Snapshots Found</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Version snapshots are created automatically when you click "Save Project".</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom Panel: AI Review Console */}
      <div className="no-print border-t border-white/5 bg-[#05070c] z-20">
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <TerminalSquare className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              AI Review & Insights Console
            </span>
          </div>
          <button
            onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
            className="text-[10px] font-mono text-slate-400 hover:text-white"
          >
            {isConsoleExpanded ? "Collapse" : "Expand Console"}
          </button>
        </div>

        {isConsoleExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 max-h-48 overflow-y-auto">
            {/* Security Insights */}
            <div className="space-y-2 border-r border-white/5 pr-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Security Insights
              </span>
              <div className="text-xs space-y-1.5 text-slate-300 font-mono">
                {architecture?.security_findings.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">No critical security issues resolved.</p>
                ) : (
                  architecture?.security_findings.slice(0, 3).map((f: any, i: number) => (
                    <div key={i} className="flex gap-1.5 items-start text-[10px]">
                      <span className="text-rose-500">•</span>
                      <p>{f.description || f}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* FinOps cost insights */}
            <div className="space-y-2 border-r border-white/5 pr-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> FinOps Cost Optimization
              </span>
              <div className="text-xs space-y-1.5 text-slate-300 font-mono">
                {architecture?.optimization_recommendations.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">No FinOps suggestions resolved.</p>
                ) : (
                  architecture?.optimization_recommendations.slice(0, 3).map((r: any, i: number) => (
                    <div key={i} className="flex gap-1.5 items-start text-[10px]">
                      <span className="text-cyan-500">•</span>
                      <p>{r}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Performance & Scale insights */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Scale & Availability
              </span>
              <div className="text-xs space-y-1.5 text-slate-300 font-mono">
                <div className="flex gap-1.5 items-start text-[10px]">
                  <span className="text-purple-500">•</span>
                  <p>Target Availability: {availabilityTarget || "99.99%"}</p>
                </div>
                <div className="flex gap-1.5 items-start text-[10px]">
                  <span className="text-purple-500">•</span>
                  <p>RTO Constraint: {rto || "4h"} / RPO Constraint: {rpo || "1h"}</p>
                </div>
                <div className="flex gap-1.5 items-start text-[10px]">
                  <span className="text-purple-500">•</span>
                  <p>Architecture classification: {workloadType || "SaaS Platform"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderProjectsTab = () => (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Project Workspaces Repository</h1>
        <p className="text-sm text-slate-400 mt-1">Review saved architecture templates, budgets, and node configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {savedProjects.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl text-center border-dashed col-span-2">
            <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-300">No saved projects found</h3>
            <p className="text-xs text-slate-500 mt-1">Use Architecture Studio to generate and save your stack.</p>
          </div>
        ) : (
          savedProjects.map((p) => (
            <div key={p.id} className="glass-card p-6 rounded-3xl border border-white/5 hover:border-cyan-500/20 transition cursor-pointer" onClick={() => handleOpenProject(p)}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-200 block truncate">{p.name}</h3>
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mt-1">{p.cloud_provider} · ${p.cost_estimate || 0}/mo</span>
                </div>
                <button onClick={(e) => handleDeleteProject(p.id, e)} className="p-2 bg-white/5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-4 flex gap-2">
                <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-slate-300 font-mono">Nodes: {p.nodes.length}</span>
                <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-slate-300 font-mono">Edges: {p.edges.length}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderValidationTab = () => {
    // Extract terraform drift warnings (prefixed with "Terraform Drift:")
    const tfDriftWarnings = (terraform?.warnings ?? []).filter(w => w.includes("Terraform Drift"));
    // Extract AI advisory recommendations from optimization_recommendations
    const aiAdvisories = (architecture?.optimization_recommendations ?? []).filter((r: string) => r.startsWith("Advisory:"));

    return (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Validation Center</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time networking CIDR overlap checks, compliance reports, Terraform drift analysis, and security findings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SecurityPanel
          securityScore={architecture?.security_score ?? 85}
          findings={architecture?.security_findings ?? []}
          compliance={architecture?.compliance_checks ?? []}
        />
        <WarningPanel
          warnings={architecture?.warnings ?? []}
          complexityScore={architecture?.complexity_score ?? 45}
          operationalOverheadScore={architecture?.operational_overhead_score ?? 30}
          overengineered={architecture?.overengineered ?? false}
        />
      </div>

      {/* Terraform Drift Validation */}
      {tfDriftWarnings.length > 0 && (
        <div className="glass-card p-5 rounded-3xl border border-amber-500/20">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-3">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-300">Terraform Drift Warnings ({tfDriftWarnings.length})</h2>
          </div>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
            {tfDriftWarnings.map((w, i) => (
              <div key={`tf-drift-${i}`} className="flex gap-2 text-[10px] font-mono text-amber-200 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-2xl">
                <span className="shrink-0 text-amber-400">⚠</span>
                <p className="leading-normal">{w.replace("Terraform Drift: ", "")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Advisory Recommendations */}
      {aiAdvisories.length > 0 && (
        <div className="glass-card p-5 rounded-3xl border border-violet-500/20">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-3">
            <svg className="w-4 h-4 text-violet-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-300">AI Validation Agent ({aiAdvisories.length})</h2>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {aiAdvisories.map((r: string, i: number) => (
              <div key={`ai-adv-${i}`} className="flex gap-2 text-[10px] font-mono text-violet-200 bg-violet-500/5 border border-violet-500/10 p-2.5 rounded-2xl">
                <span className="shrink-0 text-violet-400">💡</span>
                <p className="leading-normal">{r.replace("Advisory: ", "")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderCostTab = () => (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Cost & FinOps Analysis</h1>
        <p className="text-sm text-slate-400 mt-1">Monthly billing breakdowns and proactive resource sizing recommendations.</p>
      </div>

      <div className="glass-card p-6 rounded-3xl max-w-3xl">
        <CostPanel
          costEstimate={architecture?.cost_estimate ?? 0}
          costBreakdown={architecture?.cost_breakdown ?? []}
          recommendations={architecture?.optimization_recommendations ?? []}
          costScore={85}
        />
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Configurations</h1>
        <p className="text-sm text-slate-400 mt-1">Configure OpenAI/DeepSeek provider APIs, caching, and account preferences.</p>
      </div>

      <div className="glass-card p-6 rounded-3xl max-w-2xl space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <div>
            <span className="text-sm font-semibold text-slate-200 block">AI Fallback Engine</span>
            <span className="text-xs text-slate-400 mt-0.5">Prioritized fallback when OpenAI fails</span>
          </div>
          <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-xs font-mono">
            OpenAI → DeepSeek → Ollama
          </span>
        </div>

        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <div>
            <span className="text-sm font-semibold text-slate-200 block">Active Model In-Use</span>
            <span className="text-xs text-slate-400 mt-0.5">Selected processing LLM for agentic planning</span>
          </div>
          <span className="px-3 py-1 bg-white/5 border border-white/10 text-slate-300 rounded-full text-xs font-mono">
            Gemini 3.5 Flash (Medium)
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm font-semibold text-slate-200 block">Workspace DB Cache</span>
            <span className="text-xs text-slate-400 mt-0.5">Cache generated visual diagrams in MongoDB</span>
          </div>
          <span className="text-emerald-400 text-xs font-mono font-bold">Enabled</span>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallbackLabel="ArchGen Dashboard">
      <div className="min-h-screen bg-[#080b11] text-slate-100 antialiased flex">
        {/* Left Navigation Sidebar */}
        <aside className="no-print w-64 border-r border-white/5 bg-[#05070d] flex flex-col justify-between shrink-0 select-none">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-neon-blue">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-extrabold tracking-tight text-white block">ArchGen Studio</span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 block">Version 2.0.0</span>
              </div>
            </div>

            <nav className="mt-8 space-y-1">
              {[
                { tab: "dashboard", label: "Dashboard", icon: <LayoutGrid className="w-4 h-4" /> },
                { tab: "generator", label: "Requirements Wizard", icon: <Sparkles className="w-4 h-4 text-cyan-400" /> },
                { tab: "templates", label: "Blueprint Templates", icon: <Package className="w-4 h-4" /> },
                { tab: "studio", label: "Architecture Studio", icon: <SquareStack className="w-4 h-4" /> },
                { tab: "terraform", label: "Terraform Code", icon: <FileCode className="w-4 h-4" /> },
                { tab: "validation", label: "Validation Center", icon: <Shield className="w-4 h-4" /> },
                { tab: "cost", label: "Cost Analysis", icon: <DollarSign className="w-4 h-4" /> },
                { tab: "projects", label: "Saved Projects", icon: <FolderOpen className="w-4 h-4" /> },
                { tab: "settings", label: "Settings", icon: <Settings2 className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab as SidebarTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all ${
                    activeTab === item.tab
                      ? "bg-cyan-500/10 text-cyan-400 font-bold border-l-2 border-cyan-500"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 border-t border-white/5 flex flex-col gap-3">
            <div className="text-[10px] font-mono text-slate-500 truncate">
              User: @{username || "User"}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 border border-white/10 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col overflow-x-hidden">
          {/* Top Info Header */}
          <header className="no-print border-b border-white/5 bg-[#05070d] px-6 py-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-mono text-slate-400">
                Active Provider: <span className="text-white capitalize">{analysisSummary?.activeProvider || "azure"}</span>
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Region: {region} · Stack count: {architecture?.nodes.length || 0}
            </div>
          </header>

          {/* Tab Content rendering */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "dashboard" && renderDashboardTab()}
            {activeTab === "generator" && renderGeneratorTab()}
            {activeTab === "studio" && renderStudioTab()}
            {activeTab === "projects" && renderProjectsTab()}
            {activeTab === "templates" && renderTemplatesTab()}
            {activeTab === "terraform" && (
              <div className="w-full h-[calc(100vh-140px)] glass-card p-6 rounded-3xl flex flex-col">
                <div className="mb-4">
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    <FileCode className="w-6 h-6 text-cyan-400" /> Terraform Infrastructure Workspace
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">Bi-directional synchronization actively links changes in variables to canvas resources.</p>
                </div>
                <div className="flex-1 min-h-0">
                  <TerraformPanel 
                    terraform={terraform} 
                    isLoading={tfLoading} 
                    onCodeChange={handleHclCodeChange} 
                    error={error}
                    onForceRegenerate={handleForceRegenerate}
                  />
                </div>
              </div>
            )}
            {activeTab === "validation" && renderValidationTab()}
            {activeTab === "cost" && renderCostTab()}
            {activeTab === "settings" && renderSettingsTab()}
          </div>
        </main>
      </div>
      
      {/* Premium Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let borderClass = "border-cyan-500/30 shadow-cyan-500/5";
          let iconColor = "text-cyan-400";
          if (t.type === "success") {
            borderClass = "border-emerald-500/30 shadow-emerald-500/5";
            iconColor = "text-emerald-400";
          } else if (t.type === "warning") {
            borderClass = "border-amber-500/30 shadow-amber-500/5";
            iconColor = "text-amber-400";
          } else if (t.type === "error") {
            borderClass = "border-rose-500/30 shadow-rose-500/5";
            iconColor = "text-rose-400";
          }
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex gap-3 p-4 rounded-xl bg-slate-950/95 border ${borderClass} shadow-xl backdrop-blur-md animate-fade-in`}
            >
              <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                {t.type === "success" && <CheckCircle2 className="w-5 h-5" />}
                {t.type === "info" && <Sparkles className="w-5 h-5" />}
                {t.type === "warning" && <AlertTriangle className="w-5 h-5" />}
                {t.type === "error" && <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white leading-normal font-mono uppercase tracking-wider">{t.title}</h4>
                <p className="text-[10px] text-slate-400 leading-normal mt-0.5 font-mono">{t.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-slate-400 hover:text-white hover:bg-white/10 shrink-0 font-bold font-sans text-xs p-1.5 rounded transition-all ml-auto flex items-center justify-center self-start"
                title="Dismiss notification"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ErrorBoundary>
  );
}
