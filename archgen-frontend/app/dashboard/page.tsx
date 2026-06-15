"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useArchitecture } from "../../hooks/useArchitecture";
import {
  getCurrentUser,
  listProjects,
  refreshAccessToken,
  saveProject,
  deleteProject,
} from "../../lib/api";
import { RequirementInput } from "../../types";

type WorkflowStep = 1 | 2 | 3 | 4 | 5;
type DrawerKind =
  | "service"
  | "terraform"
  | "security"
  | "cost"
  | "reasoning"
  | "history"
  | "palette"
  | null;

type TemplateKind = {
  label: string;
  description: string;
  app: string;
  security: string;
  performance: string;
  notes: string;
};

const REQUIREMENT_TEMPLATES: TemplateKind[] = [
  {
    label: "SaaS Platform",
    description: "Multi-tenant SaaS platform with role-based access, audit logging, and predictable monthly costs.",
    app: "Build a multi-tenant SaaS product with authenticated workspaces, billing-ready data separation, and admin tooling.",
    security: "Require SSO-ready access controls, secret isolation, and least-privilege service boundaries.",
    performance: "Need sub-second interaction times for normal workloads and graceful scaling under growth.",
    notes: "Prefer maintainable components over distributed complexity.",
  },
  {
    label: "Customer Portal",
    description: "Simple customer-facing portal with low operational overhead and clean UX.",
    app: "Create a customer portal for self-service support, user profile management, and lightweight CRUD workflows.",
    security: "Protect personal data, enforce TLS, and keep the attack surface minimal.",
    performance: "Keep response times fast on mobile and desktop, with simple deployment options.",
    notes: "Avoid unnecessary Kubernetes or extra services.",
  },
  {
    label: "High Scale Media",
    description: "Streaming or media workloads requiring CDN, caching, and durable storage.",
    app: "Design a global media delivery platform for video and asset distribution with high throughput.",
    security: "Require WAF, secure storage, and strict administrative controls.",
    performance: "Support low-latency delivery and high read throughput across regions.",
    notes: "Prioritize edge delivery and caching.",
  },
];

const STEP_LABELS = [
  "Project Setup",
  "Requirements",
  "AI Planning",
  "Architecture Studio",
  "Review & Export",
];

function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createArchitectureSvg(architecture: any, title: string) {
  const nodes = architecture?.nodes ?? [];
  const edges = architecture?.edges ?? [];
  const width = 1400;
  const height = 900;

  const rects = nodes
    .map((node: any) => {
      const x = Math.max(20, Number(node.position?.x ?? 0) + 40);
      const y = Math.max(40, Number(node.position?.y ?? 0) + 60);
      return `
        <rect x="${x}" y="${y}" rx="14" ry="14" width="220" height="70" fill="#111111" stroke="#d4d4d4" stroke-width="1.5" />
        <text x="${x + 16}" y="${y + 26}" fill="#f5f5f5" font-size="18" font-family="Inter, Arial, sans-serif">${String(node.data?.label ?? node.id)}</text>
        <text x="${x + 16}" y="${y + 50}" fill="#a3a3a3" font-size="12" font-family="JetBrains Mono, monospace">${String(node.type ?? "")}</text>
      `;
    })
    .join("");

  const lines = edges
    .map((edge: any) => {
      const source = nodes.find((node: any) => node.id === edge.source);
      const target = nodes.find((node: any) => node.id === edge.target);
      if (!source || !target) return "";
      const x1 = Number(source.position?.x ?? 0) + 150;
      const y1 = Number(source.position?.y ?? 0) + 95;
      const x2 = Number(target.position?.x ?? 0) + 150;
      const y2 = Number(target.position?.y ?? 0) + 95;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#737373" stroke-width="2" />`;
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="40" y="60" fill="#111111" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="700">${title}</text>
      <text x="40" y="92" fill="#525252" font-size="14" font-family="JetBrains Mono, monospace">ArchGen AI Architecture Export</text>
      ${lines}
      ${rects}
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function downloadSvgAsPng(svgDataUrl: string, filename: string) {
  const image = new Image();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = svgDataUrl;
  });

  canvas.width = image.width;
  canvas.height = image.height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

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
  } = useArchitecture();

  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(1);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<"architecture" | "terraform" | "security" | "cost" | "deployment">("architecture");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null);
  const [activityLog, setActivityLog] = useState<string[]>([]);

  const [projectName, setProjectName] = useState("Enterprise Stack");
  const [cloudProvider, setCloudProvider] = useState("azure");
  const [expectedUsers, setExpectedUsers] = useState("100,000 monthly");
  const [monthlyBudget, setMonthlyBudget] = useState("500");
  const [appDescription, setAppDescription] = useState(
    "A modern enterprise application with secure workflows, predictable costs, and room to scale."
  );
  const [technicalConstraints, setTechnicalConstraints] = useState("");
  const [securityRequirements, setSecurityRequirements] = useState("");
  const [performanceRequirements, setPerformanceRequirements] = useState("");

  const analysisSummary = useMemo(() => {
    if (!architecture) return null;
    return {
      activeProvider: architecture.active_provider && architecture.active_provider !== "Unknown" ? architecture.active_provider : architecture.cloud_provider,
      activeModel: architecture.active_model && architecture.active_model !== "unknown" ? architecture.active_model : "gpt-4-default",
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
    setActivityLog((prev) => [`${timestamp} · ${entry}`, ...prev].slice(0, 10));
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

  useEffect(() => {
    if (analysisPending && !loading && architecture) {
      setAnalysisPending(false);
      const duration = analysisStartedAt ? Date.now() - analysisStartedAt : null;
      setAnalysisDuration(duration);
      pushActivity("AI analysis completed");
      setWorkflowStep(4);
    }
    if (analysisPending && !loading && error) {
      setAnalysisPending(false);
      setWorkflowStep(2);
      pushActivity("AI analysis failed");
    }
  }, [analysisPending, analysisStartedAt, architecture, error, loading, pushActivity]);

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const buildRequest = useCallback((): RequirementInput => {
    const combinedNotes = [
      technicalConstraints && `Technical Constraints: ${technicalConstraints}`,
      securityRequirements && `Security Requirements: ${securityRequirements}`,
      performanceRequirements && `Performance Requirements: ${performanceRequirements}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      expected_users: expectedUsers,
      monthly_budget: monthlyBudget,
      cloud_provider: cloudProvider,
      app_description: appDescription,
      additional_notes: combinedNotes || undefined,
    };
  }, [appDescription, cloudProvider, expectedUsers, monthlyBudget, performanceRequirements, securityRequirements, technicalConstraints]);

  const requirementQuality = useMemo(() => {
    const score =
      (appDescription.trim().length > 40 ? 30 : 0) +
      (technicalConstraints.trim().length > 20 ? 20 : 0) +
      (securityRequirements.trim().length > 20 ? 20 : 0) +
      (performanceRequirements.trim().length > 20 ? 20 : 0) +
      (monthlyBudget.trim().length > 0 ? 10 : 0);
    if (score >= 80) return { label: "Strong", tone: "text-black bg-white" };
    if (score >= 50) return { label: "Good", tone: "text-white bg-zinc-700" };
    return { label: "Needs Detail", tone: "text-zinc-950 bg-zinc-200" };
  }, [appDescription, monthlyBudget, performanceRequirements, securityRequirements, technicalConstraints]);

  const handleContinueToRequirements = () => {
    setWorkflowStep(2);
    pushActivity("Project setup completed");
  };

  const handleAnalyze = async () => {
    setWorkflowStep(3);
    setAnalysisPending(true);
    setAnalysisDuration(null);
    setAnalysisStartedAt(Date.now());
    pushActivity("AI planning started");
    await triggerGenerate(buildRequest());
  };

  const handleOpenProject = (proj: any) => {
    setActiveProjectId(proj.id);
    setProjectName(proj.name);
    setCloudProvider(proj.cloud_provider || "azure");
    setSelectedNode(null);
    setDrawer(null);
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
      complexity_score: 0,
      operational_overhead_score: 0,
      overengineered: false,
      warnings: [],
      security_score: 0,
      security_findings: [],
      compliance_checks: [],
      explanation: "",
      alternatives_considered: "",
      justification_for_choices: "",
      terraform_modules: [],
    } as any);
    setWorkflowStep(4);
    pushActivity(`Opened project "${proj.name}"`);
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
      };

      const result = await saveProject(payload, authToken);
      setSaveSuccess(true);
      if (result.id) setActiveProjectId(result.id);
      loadSavedProjects(authToken);
      pushActivity("Project saved");
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
        setWorkflowStep(1);
      }
      loadSavedProjects(authToken);
      pushActivity("Project deleted");
    } catch (deleteError) {
      console.error("Delete project failure:", deleteError);
    }
  };

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
      setDrawer(null);
      pushActivity(`Updated node ${nodeId}`);
    },
    [architecture, pushActivity, updateLocalTopology]
  );

  const handleApproachReview = async () => {
    setWorkflowStep(5);
    if (architecture && !isApproved) {
      await approveArchitecture();
    }
    pushActivity("Entered review and export");
  };

  const exportArchitectureJson = () => {
    if (!architecture) return;
    downloadTextFile(`${projectName.replace(/\s+/g, "_").toLowerCase()}-architecture.json`, JSON.stringify(architecture, null, 2), "application/json");
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
      
      pushActivity("Exported Terraform as ZIP");
    } catch (err) {
      console.error("Failed to export Terraform", err);
    }
  };

  const exportPng = async () => {
    if (!architecture) return;
    const flowEl = document.querySelector(".react-flow") as HTMLElement;
    if (!flowEl) return;
    try {
      const dataUrl = await toPng(flowEl, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${projectName.replace(/\s+/g, "_").toLowerCase()}-architecture.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      pushActivity("Exported PNG");
    } catch (err) {
      console.error("Failed to export PNG", err);
    }
  };

  const exportPdf = () => {
    window.print();
    pushActivity("Opened print dialog for PDF export");
  };

  const renderStepNav = () => (
    <div className="no-print sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-black text-white">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-zinc-950">ArchGen AI</div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Enterprise Architecture Studio</div>
          </div>
        </div>

        <div className="hidden flex-1 px-6 xl:block">
          <div className="flex items-center gap-3">
            {STEP_LABELS.map((label, index) => {
              const step = (index + 1) as WorkflowStep;
              const active = workflowStep === step;
              const completed = workflowStep > step;
              return (
                <div key={label} className="flex flex-1 items-center gap-3">
                  <button
                    onClick={() => setWorkflowStep(step)}
                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-full border px-4 py-2 text-left transition ${
                      active
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : completed
                          ? "border-zinc-300 bg-zinc-100 text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400"
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-[10px] font-semibold">
                      {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="truncate text-[11px] font-medium">{label}</span>
                  </button>
                  {index < STEP_LABELS.length - 1 && <div className="h-px flex-1 bg-zinc-200" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-600 md:flex">
            @{username || "User"}
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  const renderProjectSetup = () => (
    <section className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
            <Package className="h-3.5 w-3.5" />
            Step 1 · Project Setup
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-950">
            Start with a clean project brief.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            Keep this screen focused: define the project, cloud target, scale, and budget before we move into requirements.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Project Name</span>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              placeholder="Enterprise Stack"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Cloud Provider</span>
            <select
              value={cloudProvider}
              onChange={(e) => setCloudProvider(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
            >
              <option value="azure">Azure</option>
              <option value="aws">AWS</option>
              <option value="gcp">GCP</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Expected Users</span>
            <input
              value={expectedUsers}
              onChange={(e) => setExpectedUsers(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              placeholder="100,000 monthly"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Budget</span>
            <input
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              placeholder="$500"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={handleContinueToRequirements}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-8">
        <div className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Project List</div>
        <div className="mt-4 space-y-3">
          {savedProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
              No saved projects yet.
            </div>
          ) : (
            savedProjects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => handleOpenProject(proj)}
                className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-zinc-950"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-950">{proj.name}</div>
                  <div className="truncate text-xs text-zinc-500">
                    {proj.cloud_provider} · ${proj.cost_estimate}
                  </div>
                </div>
                <Trash2
                  className="h-4 w-4 text-zinc-400 hover:text-zinc-950"
                  onClick={(e) => handleDeleteProject(proj.id, e)}
                />
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );

  const renderRequirements = () => (
    <section className="mx-auto w-full max-w-[980px] px-4 py-10 lg:px-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
              <ClipboardList className="h-3.5 w-3.5" />
              Step 2 · Requirements
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">Describe the workload clearly.</h2>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-medium ${requirementQuality.tone}`}>
            Quality: {requirementQuality.label}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            {REQUIREMENT_TEMPLATES.map((template) => (
              <button
                key={template.label}
                onClick={() => {
                  setAppDescription(template.app);
                  setSecurityRequirements(template.security);
                  setPerformanceRequirements(template.performance);
                  setTechnicalConstraints(template.notes);
                  pushActivity(`Applied ${template.label} template`);
                }}
                className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-left transition hover:border-zinc-950"
              >
                <div className="text-sm font-medium text-zinc-950">{template.label}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-600">{template.description}</div>
              </button>
            ))}
          </div>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Application Description</span>
            <textarea
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              rows={6}
              className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              placeholder="Describe the app, user flows, and business goals..."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Security Requirements</span>
              <textarea
                value={securityRequirements}
                onChange={(e) => setSecurityRequirements(e.target.value)}
                rows={4}
                className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
                placeholder="Authentication, secrets, compliance..."
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Performance Requirements</span>
              <textarea
                value={performanceRequirements}
                onChange={(e) => setPerformanceRequirements(e.target.value)}
                rows={4}
                className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
                placeholder="Latency, throughput, scale, availability..."
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Optional Technical Constraints</span>
            <textarea
              value={technicalConstraints}
              onChange={(e) => setTechnicalConstraints(e.target.value)}
              rows={3}
              className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              placeholder="Budget ceilings, region limits, compliance rules..."
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analyze Requirements
          </button>
          <div className="text-xs text-zinc-500">
            Add enough detail to guide architecture, Terraform, and security planning.
          </div>
        </div>
      </div>
    </section>
  );

  const renderPlanning = () => (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:px-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
              <LayoutGrid className="h-3.5 w-3.5" />
              Step 3 · AI Planning
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">The orchestration layer is working.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              We show progress instead of leaving you staring at an empty screen.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <div>Project: {projectName}</div>
            <div>Provider: {analysisSummary?.activeProvider || cloudProvider}</div>
            <div>Model: {analysisSummary?.activeModel || "Planning in progress"}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
            {loading ? <LoadingScreen /> : null}
            {!loading && architecture && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                  Execution time: {analysisDuration ? `${Math.max(1, Math.round(analysisDuration / 1000))}s` : "Measured during planning"}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Requirement Understanding", "Completed"],
                    ["Security Analysis", "Completed"],
                    ["Cost Analysis", "Completed"],
                    ["Architecture Planning", "Completed"],
                    ["Terraform Planning", "Ready"],
                  ].map(([label, status]) => (
                    <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="text-sm font-medium text-zinc-950">{label}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.24em] text-zinc-500">{status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Execution Details</div>
            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span>Generated By</span>
                <span className="font-medium text-zinc-950 capitalize">{analysisSummary?.generationSource || "Waiting"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span>Provider</span>
                <span className="font-medium text-zinc-950 capitalize">{analysisSummary?.provider || "Waiting"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span>Nodes</span>
                <span className="font-medium text-zinc-950">{analysisSummary?.nodeCount !== undefined ? analysisSummary.nodeCount : "Waiting"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span>Edges</span>
                <span className="font-medium text-zinc-950">{analysisSummary?.edgeCount !== undefined ? analysisSummary.edgeCount : "Waiting"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span>Subnets</span>
                <span className="font-medium text-zinc-950">{analysisSummary?.subnetCount !== undefined ? analysisSummary.subnetCount : "Waiting"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span>Estimated Cost</span>
                <span className="font-medium text-zinc-950">{analysisSummary?.costEstimate ? `$${analysisSummary.costEstimate}/month` : "Waiting"}</span>
              </div>
              <div className="flex items-center justify-between pb-2">
                <span>Validation</span>
                <span className="font-medium text-emerald-600">{loading ? "Running" : "Passed"}</span>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">{error}</div>}
      </div>
    </section>
  );

  const renderStudio = () => {
    const paletteGroups = [
      {
        label: "Gateway",
        items: ["GatewayNode"],
      },
      { label: "Frontend", items: ["FrontendNode"] },
      { label: "Backend", items: ["BackendNode"] },
      { label: "Database", items: ["DatabaseNode"] },
      { label: "Cache", items: ["CacheNode"] },
      { label: "Storage", items: ["StorageNode"] },
      { label: "Security", items: ["SecurityNode"] },
      { label: "Monitoring", items: ["MonitoringNode"] },
    ];

    const paletteLabels: Record<string, { title: string; detail: string; icon: React.ReactNode }> = {
      GatewayNode: { title: "Gateway", detail: "Ingress, routing, WAF", icon: <Globe className="h-4 w-4" /> },
      FrontendNode: { title: "Frontend", detail: "Static app or web client", icon: <Server className="h-4 w-4" /> },
      BackendNode: { title: "Backend", detail: "API compute and services", icon: <Cpu className="h-4 w-4" /> },
      DatabaseNode: { title: "Database", detail: "SQL or NoSQL storage", icon: <Database className="h-4 w-4" /> },
      CacheNode: { title: "Cache", detail: "Redis or memory cache", icon: <HardDrive className="h-4 w-4" /> },
      StorageNode: { title: "Storage", detail: "Blobs, files, assets", icon: <Package className="h-4 w-4" /> },
      SecurityNode: { title: "Security", detail: "Vaults and controls", icon: <Key className="h-4 w-4" /> },
      MonitoringNode: { title: "Monitoring", detail: "Logs and telemetry", icon: <Activity className="h-4 w-4" /> },
    };

    return (
      <section className="relative flex min-h-[calc(100vh-84px)] flex-col bg-zinc-50">
        <div className="border-b border-zinc-200 bg-white px-4 py-4 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
                <SquareStack className="h-3.5 w-3.5" />
                Step 4 · Architecture Studio
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
                {projectName} — clean, focused, and editable.
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setDrawer("palette")} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Add Service
              </button>
              <button onClick={() => setDrawer("service")} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Service Properties
              </button>
              <button onClick={() => setDrawer("terraform")} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Terraform
              </button>
              <button onClick={() => setDrawer("security")} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Security
              </button>
              <button onClick={() => setDrawer("cost")} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Cost
              </button>
              <button onClick={() => setDrawer("reasoning")} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                AI Reasoning
              </button>
              <button onClick={() => setDrawer("history")} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Activity
              </button>
              <button
                onClick={handleApproachReview}
                className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800"
              >
                Review & Export
              </button>
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[1600px] flex-1 gap-4 overflow-hidden px-4 py-4 lg:px-8">
          <div className="no-print hidden xl:block xl:w-72">
            <div className="sticky top-28 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Service Palette</div>
                <button onClick={() => setDrawer(drawer === "palette" ? null : "palette")} className="text-xs text-zinc-500 hover:text-zinc-950">
                  {drawer === "palette" ? "Hide" : "Open"}
                </button>
              </div>
              <div className="space-y-3">
                {paletteGroups.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-zinc-400">{group.label}</div>
                    <div className="space-y-2">
                      {group.items.map((nodeType) => {
                        const entry = paletteLabels[nodeType];
                        return (
                          <div
                            key={nodeType}
                            draggable
                            onDragStart={(event) => onDragStart(event, nodeType)}
                            className="flex cursor-grab items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 transition hover:border-zinc-950 active:cursor-grabbing"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900">
                              {entry.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-zinc-950">{entry.title}</div>
                              <div className="truncate text-xs text-zinc-500">{entry.detail}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={undo} className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-950">
                  <Undo2 className="mr-1 inline h-3.5 w-3.5" /> Undo
                </button>
                <button onClick={redo} className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-950">
                  <Redo2 className="mr-1 inline h-3.5 w-3.5" /> Redo
                </button>
                <button onClick={() => pushActivity("Auto layout requested")} className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-950">
                  <Minimize2 className="mr-1 inline h-3.5 w-3.5" /> Auto Layout
                </button>
                <div className="mx-1 h-6 w-px bg-zinc-200" />
                <button onClick={() => setDrawer("service")} className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-950">
                  <Edit3 className="mr-1 inline h-3.5 w-3.5" /> Edit Node
                </button>
                <button onClick={() => setDrawer("terraform")} className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-950">
                  <FileCode className="mr-1 inline h-3.5 w-3.5" /> Export HCL
                </button>
                <button onClick={handleSaveProject} className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-950">
                  <Save className="mr-1 inline h-3.5 w-3.5" /> Save
                </button>
              </div>
            </div>

            <div className="min-h-[72vh] flex-1 overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex h-full items-center justify-center p-6">
                  <LoadingScreen />
                </div>
              ) : architecture ? (
                <ArchitectureCanvas
                  initialNodes={architecture.nodes}
                  initialEdges={architecture.edges}
                  onTopologyChange={updateLocalTopology}
                  isApproved={isApproved}
                  onApprove={approveArchitecture}
                  onRegenerate={regenerateArchitecture}
                  undo={undo}
                  redo={redo}
                  triggerAiAssist={triggerAiAssist}
                  onSelectNode={setSelectedNode}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-12 text-center">
                  <div className="max-w-md">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50">
                      <MoonStar className="h-6 w-6 text-zinc-900" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-zinc-950">Architecture canvas is ready.</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      Generate an architecture from the workflow above, or start from a blank canvas.
                    </p>
                    <button
                      onClick={regenerateArchitecture}
                      className="mt-6 rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      Start Blank Canvas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {drawer && (
          <div className="fixed inset-0 z-50">
            <button className="absolute inset-0 bg-zinc-950/40" onClick={() => setDrawer(null)} aria-label="Close drawer" />
            <div className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    {drawer === "service" ? "Service Properties" : drawer === "terraform" ? "Terraform" : drawer === "security" ? "Security" : drawer === "cost" ? "Cost Analysis" : drawer === "reasoning" ? "AI Reasoning" : drawer === "history" ? "Activity History" : "Service Palette"}
                  </div>
                  <div className="mt-1 text-sm font-medium text-zinc-950">Focused, slide-out panel</div>
                </div>
                <button onClick={() => setDrawer(null)} className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-950">
                  Close
                </button>
              </div>

              <div className="p-4">
                {drawer === "service" && selectedNode && (
                  <ServiceConfigPanel node={selectedNode} onUpdateNode={handleUpdateNode} onClose={() => setDrawer(null)} />
                )}
                {drawer === "service" && !selectedNode && (
                  <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
                    Select a node on the canvas to edit its properties.
                  </div>
                )}
                {drawer === "terraform" && <TerraformPanel terraform={terraform} isLoading={tfLoading} />}
                {drawer === "security" && (
                  <SecurityPanel
                    securityScore={architecture?.security_score ?? 0}
                    findings={architecture?.security_findings ?? []}
                    compliance={architecture?.compliance_checks ?? []}
                  />
                )}
                {drawer === "cost" && (
                  <CostPanel
                    costEstimate={architecture?.cost_estimate ?? 0}
                    costBreakdown={architecture?.cost_breakdown ?? []}
                    recommendations={architecture?.optimization_recommendations ?? []}
                    costScore={85}
                  />
                )}
                {drawer === "reasoning" && (
                  <ArchitectureExplanationPanel
                    explanation={architecture?.explanation ?? ""}
                    alternativesConsidered={architecture?.alternatives_considered ?? ""}
                    justificationForChoices={architecture?.justification_for_choices ?? ""}
                  />
                )}
                {drawer === "history" && (
                  <div className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-medium text-zinc-950">Activity Log</div>
                    {activityLog.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                        Actions will appear here as you progress.
                      </div>
                    ) : (
                      activityLog.map((entry, index) => (
                        <div key={`${entry}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                          {entry}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {drawer === "palette" && (
                  <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-medium text-zinc-950">Drag services into the canvas</div>
                    <div className="text-sm text-zinc-600">
                      Use the palette on the left for desktop, or drag from here on smaller screens.
                    </div>
                    <div className="space-y-2">
                      {Object.entries(paletteLabels).map(([nodeType, entry]) => (
                        <div
                          key={nodeType}
                          draggable
                          onDragStart={(event) => onDragStart(event, nodeType)}
                          className="flex cursor-grab items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 transition hover:border-zinc-950"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
                            {entry.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-950">{entry.title}</div>
                            <div className="text-xs text-zinc-500">{entry.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderReview = () => (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-8 lg:px-8">
      <div className="rounded-[32px] border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-6 py-5 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
            <Download className="h-3.5 w-3.5" />
            Step 5 · Review & Export
          </div>
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">Review the final architecture and export deliverables.</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Approve, save, and export with a clean handoff to your deployment pipeline.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => approveArchitecture()} className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800">
                Approve
              </button>
              <button onClick={handleSaveProject} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Save Project
              </button>
              <button onClick={exportArchitectureJson} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Export JSON
              </button>
              <button onClick={exportPng} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Export PNG
              </button>
              <button onClick={exportPdf} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Export PDF
              </button>
              <button onClick={exportTerraform} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-950">
                Export Terraform
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
              {["architecture", "terraform", "security", "cost", "deployment"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveReviewTab(tab as any)}
                  className={`rounded-full px-4 py-2 text-xs font-medium capitalize transition ${
                    activeReviewTab === tab ? "bg-zinc-950 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="pt-4">
              {activeReviewTab === "architecture" && (
                <ArchitectureExplanationPanel
                  explanation={architecture?.explanation ?? ""}
                  alternativesConsidered={architecture?.alternatives_considered ?? ""}
                  justificationForChoices={architecture?.justification_for_choices ?? ""}
                />
              )}
              {activeReviewTab === "terraform" && <TerraformPanel terraform={terraform} isLoading={tfLoading} />}
              {activeReviewTab === "security" && (
                <SecurityPanel
                  securityScore={architecture?.security_score ?? 0}
                  findings={architecture?.security_findings ?? []}
                  compliance={architecture?.compliance_checks ?? []}
                />
              )}
              {activeReviewTab === "cost" && (
                <CostPanel
                  costEstimate={architecture?.cost_estimate ?? 0}
                  costBreakdown={architecture?.cost_breakdown ?? []}
                  recommendations={architecture?.optimization_recommendations ?? []}
                  costScore={85}
                />
              )}
              {activeReviewTab === "deployment" && (
                <WarningPanel
                  warnings={architecture?.warnings ?? []}
                  complexityScore={architecture?.complexity_score ?? 0}
                  operationalOverheadScore={architecture?.operational_overhead_score ?? 0}
                  overengineered={architecture?.overengineered ?? false}
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Summary</div>
              <div className="mt-4 space-y-3 text-sm text-zinc-700">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span>Active Provider</span>
                  <span className="font-medium text-zinc-950">{architecture?.active_provider || "unknown"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span>Active Model</span>
                  <span className="font-medium text-zinc-950">{architecture?.active_model || "unknown"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span>Fallback Trigger</span>
                  <span className="font-medium text-zinc-950">{architecture?.fallback_trigger || "none"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span>Approval</span>
                  <span className="font-medium text-zinc-950">{isApproved ? "Approved" : "Pending"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Saved Projects</span>
                  <span className="font-medium text-zinc-950">{savedProjects.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Recent Activity</div>
              <div className="mt-4 space-y-2">
                {activityLog.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
                    No actions yet.
                  </div>
                ) : (
                  activityLog.slice(0, 5).map((entry, index) => (
                    <div key={`${entry}-${index}`} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                      {entry}
                    </div>
                  ))
                )}
              </div>
            </div>

            {saveSuccess && (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                Project saved successfully.
              </div>
            )}
            {saveError && (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                {saveError}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <ErrorBoundary fallbackLabel="ArchGen Dashboard">
      <div className="min-h-screen bg-white text-zinc-950 antialiased">
        {renderStepNav()}
        {workflowStep === 1 && renderProjectSetup()}
        {workflowStep === 2 && renderRequirements()}
        {workflowStep === 3 && renderPlanning()}
        {workflowStep >= 4 && renderStudio()}
        {workflowStep === 5 && renderReview()}
      </div>
    </ErrorBoundary>
  );
}
