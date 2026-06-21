"use client";

import React, { useState } from "react";
import { RequirementInput } from "../types";
import { 
  Play, Sparkles, Terminal, Sliders, Cloud, DollarSign, Users, 
  FileText, Shield, Cpu, Database, Activity, Network, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, Info
} from "lucide-react";

const regionOptions: Record<string, Array<{ value: string; label: string }>> = {
  azure: [
    { value: "East US", label: "East US" },
    { value: "Central India", label: "Central India" },
    { value: "West Europe", label: "West Europe" },
  ],
  aws: [
    { value: "us-east-1", label: "US East (N. Virginia)" },
    { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
    { value: "eu-west-1", label: "Europe (Ireland)" },
  ],
  gcp: [
    { value: "us-east1", label: "us-east1 (South Carolina)" },
    { value: "asia-south1", label: "asia-south1 (Mumbai)" },
    { value: "europe-west1", label: "europe-west1 (Belgium)" },
  ],
  "let ai decide": [
    { value: "East US", label: "East US / us-east-1" },
  ]
};

const computeOptions: Record<string, Array<{ value: string; label: string }>> = {
  azure: [
    { value: "Let AI Decide", label: "Let AI Decide" },
    { value: "AKS", label: "AKS (Azure Kubernetes Service)" },
    { value: "App Service", label: "App Service (PaaS)" },
    { value: "Container Apps", label: "Container Apps (Microservices)" },
  ],
  aws: [
    { value: "Let AI Decide", label: "Let AI Decide" },
    { value: "AKS", label: "EKS (Amazon Elastic Kubernetes Service)" },
    { value: "App Service", label: "Elastic Beanstalk (PaaS)" },
    { value: "Container Apps", label: "Amazon ECS / Fargate (Microservices)" },
  ],
  gcp: [
    { value: "Let AI Decide", label: "Let AI Decide" },
    { value: "AKS", label: "GKE (Google Kubernetes Engine)" },
    { value: "App Service", label: "App Engine (PaaS)" },
    { value: "Container Apps", label: "Cloud Run (Microservices)" },
  ],
  "let ai decide": [
    { value: "Let AI Decide", label: "Let AI Decide" },
    { value: "AKS", label: "Kubernetes Engine" },
    { value: "App Service", label: "App Web Services" },
    { value: "Container Apps", label: "Containerized Workloads" },
  ]
};

const databaseOptions: Record<string, Array<{ value: string; label: string }>> = {
  azure: [
    { value: "Let AI Decide", label: "Let AI Decide" },
    { value: "PostgreSQL", label: "PostgreSQL (Flexible Server)" },
    { value: "MySQL", label: "MySQL (Flexible Server)" },
    { value: "MongoDB", label: "MongoDB Atlas (NoSQL)" },
    { value: "CosmosDB", label: "CosmosDB (Multi-Model API)" },
  ],
  aws: [
    { value: "Let AI Decide", label: "Let AI Decide" },
    { value: "PostgreSQL", label: "Amazon RDS for PostgreSQL" },
    { value: "MySQL", label: "Amazon RDS for MySQL" },
    { value: "MongoDB", label: "MongoDB Atlas on AWS" },
    { value: "CosmosDB", label: "Amazon DynamoDB (NoSQL)" },
  ],
  gcp: [
    { value: "Let AI Decide", label: "Let AI Decide" },
    { value: "PostgreSQL", label: "Cloud SQL for PostgreSQL" },
    { value: "MySQL", label: "Cloud SQL for MySQL" },
    { value: "MongoDB", label: "MongoDB Atlas on GCP" },
    { value: "CosmosDB", label: "Cloud Firestore / Bigtable" },
  ],
  "let ai decide": [
    { value: "Let AI Decide", label: "Let AI Decide" },
    { value: "PostgreSQL", label: "PostgreSQL" },
    { value: "MySQL", label: "MySQL" },
    { value: "MongoDB", label: "MongoDB Atlas" },
    { value: "CosmosDB", label: "NoSQL DB (Dynamo/Cosmos/Firestore)" },
  ]
};

interface RequirementFormProps {
  onSubmit: (data: RequirementInput) => void;
  isLoading: boolean;
}

export default function RequirementForm({ onSubmit, isLoading }: RequirementFormProps) {
  const [step, setStep] = useState(1);
  
  // V2 Form State variables
  // Step 1: Application Information
  const [appName, setAppName] = useState("Enterprise Stack");
  const [workloadType, setWorkloadType] = useState("SaaS");
  const [appDescription, setAppDescription] = useState(
    "A multi-tenant SaaS platform with authentication, file uploads, reporting dashboards, notifications, audit logs, and third-party integrations."
  );

  // Step 2: Scale & Business Requirements
  const [expectedUsers, setExpectedUsers] = useState("10K–100K");
  const [trafficProfile, setTrafficProfile] = useState("Medium");
  const [growthExpectation, setGrowthExpectation] = useState("Moderate");
  const [availabilityTarget, setAvailabilityTarget] = useState("High Availability");

  // Step 3: Budget & Compliance
  const [budget, setBudget] = useState("Small Business");
  const [complianceList, setComplianceList] = useState<string[]>(["SOC2"]);
  const [dataSensitivity, setDataSensitivity] = useState("Medium");

  // Step 4: Technology Preferences
  const [cloudProvider, setCloudProvider] = useState("azure");
  const [computeType, setComputeType] = useState("Let AI Decide");
  const [dataType, setDataType] = useState("Let AI Decide");
  const [cache, setCache] = useState("Let AI Decide");

  // Step 5: Strategy
  const [architectureGoal, setArchitectureGoal] = useState("Balanced");
  const [aiDecisionLevel, setAiDecisionLevel] = useState("Full AI Control");

  // Advanced settings (default: Hidden)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [region, setRegion] = useState("East US");
  const [resourceGroup, setResourceGroup] = useState("rg-production");
  const [vnetCIDR, setVnetCIDR] = useState("10.0.0.0/16");
  const [additionalVNets, setAdditionalVNets] = useState("");

  const [hasWAF, setHasWAF] = useState(true);
  const [hasFirewall, setHasFirewall] = useState(true);
  const [hasKeyVault, setHasKeyVault] = useState(true);
  const [hasManagedIdentity, setHasManagedIdentity] = useState(true);
  const [hasDDoS, setHasDDoS] = useState(false);
  const [monitoring, setMonitoring] = useState({
    azureMonitor: true,
    logAnalytics: true,
    appInsights: true,
    alerts: true,
    backupVault: true,
  });
  const [rto, setRto] = useState("4 hours");
  const [rpo, setRpo] = useState("1 hour");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleProviderChange = (provider: string) => {
    setCloudProvider(provider);
    const defaults = regionOptions[provider];
    if (defaults && defaults.length > 0) {
      setRegion(defaults[0].value);
    }
  };

  const handleComplianceToggle = (std: string) => {
    if (complianceList.includes(std)) {
      setComplianceList((prev) => prev.filter((item) => item !== std));
    } else {
      setComplianceList((prev) => [...prev, std]);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!appName.trim() || appName.trim().length < 3) {
        newErrors.appName = "Application name must be at least 3 characters.";
      }
      if (!appDescription.trim() || appDescription.trim().length < 15) {
        newErrors.appDescription = "Application description must be at least 15 characters to provide adequate context for AI agents.";
      }
    }

    if (showAdvanced) {
      if (!resourceGroup.trim() || !/^[a-zA-Z0-9-_]+$/.test(resourceGroup)) {
        newErrors.resourceGroup = "Resource group name must contain only alphanumeric characters, hyphens, or underscores.";
      }
      const cidrPattern = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]{1,2}$/;
      if (!vnetCIDR.trim() || !cidrPattern.test(vnetCIDR)) {
        newErrors.vnetCIDR = "Must be a valid VNet IP CIDR block (e.g. 10.0.0.0/16).";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handlePrev = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;
    
    // Let AI decide subnets dynamically
    const subnetDetails = "Let AI Decide dynamically based on workload";

    const monitoringDetails = Object.entries(monitoring)
      .filter(([_, active]) => active)
      .map(([key]) => key)
      .join(", ");

    const structuredNotes = `
[Architecture Brief - ArchGen V2]
Name: ${appName}
Application Type: ${workloadType}
Scale & Load: expectedUsers=${expectedUsers}, trafficProfile=${trafficProfile}, growthExpectation=${growthExpectation}
Availability Requirement: ${availabilityTarget}
Budget Level: ${budget}
Compliance Requirements: ${complianceList.join(", ")}
Data Sensitivity: ${dataSensitivity}
Technology Preferences:
  Cloud: ${cloudProvider}
  Compute Platform: ${computeType}
  Database: ${dataType}
  Cache: ${cache}
Architecture Goal: ${architectureGoal}
AI Decision Level: ${aiDecisionLevel}
Advanced Settings Applied: ${showAdvanced}
Region: ${region}
Resource Group: ${resourceGroup}
Primary VNet: ${vnetCIDR}
Additional VNets: ${additionalVNets || "None"}
Subnets: ${subnetDetails}
Security: WAF=${hasWAF}, Firewall=${hasFirewall}, Key Vault=${hasKeyVault}, Managed Identity=${hasManagedIdentity}, DDoS=${hasDDoS}
Monitoring: ${monitoringDetails}
RTO: ${rto}
RPO: ${rpo}
    `.trim();

    let numericBudget = "1000";
    if (budget === "Startup") numericBudget = "200";
    else if (budget === "Small Business") numericBudget = "1000";
    else if (budget === "Enterprise") numericBudget = "5000";
    else if (budget === "Unlimited") numericBudget = "50000";

    onSubmit({
      app_description: appDescription,
      expected_users: expectedUsers,
      monthly_budget: numericBudget,
      cloud_provider: cloudProvider === "let ai decide" || cloudProvider === "Let AI Decide" ? "azure" : cloudProvider,
      additional_notes: structuredNotes,
      application_type: workloadType,
      scalability_preference: expectedUsers,
      security_level: complianceList.join(", "),
      database_type: dataType === "Let AI Decide" ? "PostgreSQL" : dataType,
      projectName: appName,
      region: region,
      availability_target: availabilityTarget,
      rto: rto,
      rpo: rpo,
      resourceGroup: resourceGroup,
      vnetCIDR: vnetCIDR,
      computeType: computeType === "Let AI Decide" ? "AKS" : computeType,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
      {/* Wizard Steps indicator */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Requirements Wizard
          </span>
        </div>
        <div className="text-xs font-mono text-cyan-400">Step {step} of 5</div>
      </div>

      {/* Steps Visual Progress */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              s <= step ? "bg-cyan-500 shadow-neon-blue" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto pr-1 mb-6">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-cyan-400" /> 1. Application Information
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className={`bg-[#0b0f19] border ${errors.appName ? "border-rose-500 focus:border-rose-500" : "border-white/10 focus:border-cyan-500"} px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors`}
                placeholder="Enterprise Stack"
              />
              {errors.appName && (
                <span className="text-rose-400 text-[10px] font-mono mt-0.5">{errors.appName}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Application Type</label>
              <select
                value={workloadType}
                onChange={(e) => setWorkloadType(e.target.value)}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="SaaS">SaaS Platform</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Banking">Banking</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Insurance">Insurance</option>
                <option value="Streaming">Streaming</option>
                <option value="IoT">IoT Platform</option>
                <option value="AI Platform">AI Platform</option>
                <option value="Enterprise Internal Tool">Enterprise Internal Tool</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Application Description</label>
              <textarea
                value={appDescription}
                onChange={(e) => setAppDescription(e.target.value)}
                rows={5}
                className={`bg-[#0b0f19] border ${errors.appDescription ? "border-rose-500 focus:border-rose-500" : "border-white/10 focus:border-cyan-500"} px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none transition-colors resize-none leading-normal font-sans`}
                placeholder="Describe your workload, users flows, security constraints, databases..."
              />
              {errors.appDescription && (
                <span className="text-rose-400 text-[10px] font-mono mt-0.5">{errors.appDescription}</span>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-cyan-400" /> 2. Scale & Business Requirements
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Expected Users</label>
                <select
                  value={expectedUsers}
                  onChange={(e) => setExpectedUsers(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="<1K">&lt;1K Users</option>
                  <option value="1K–10K">1K–10K Users</option>
                  <option value="10K–100K">10K–100K Users</option>
                  <option value="100K+">100K+ Users</option>
                  <option value="Custom">Custom Scale</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Traffic Profile</label>
                <select
                  value={trafficProfile}
                  onChange={(e) => setTrafficProfile(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Low">Low Traffic (Quiet workloads)</option>
                  <option value="Medium">Medium Traffic (Typical SaaS)</option>
                  <option value="High">High Traffic (Scaling platform)</option>
                  <option value="Extreme">Extreme Traffic (High concurrency)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Growth Expectation</label>
                <select
                  value={growthExpectation}
                  onChange={(e) => setGrowthExpectation(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Stable">Stable Growth</option>
                  <option value="Moderate">Moderate Scaling</option>
                  <option value="Rapid">Rapid / Hyper Growth</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Availability Requirement</label>
                <select
                  value={availabilityTarget}
                  onChange={(e) => setAvailabilityTarget(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Standard">Standard (99.9% uptime)</option>
                  <option value="High Availability">High Availability (99.99% multi-zone)</option>
                  <option value="Mission Critical">Mission Critical (99.999% multi-region)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-cyan-400" /> 3. Budget & Compliance
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Budget Profile</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Startup">Startup Tier (Min cost, Basic SLAs)</option>
                  <option value="Small Business">Small Business Tier (Balanced cost/HA)</option>
                  <option value="Enterprise">Enterprise Tier (Premium services, High security)</option>
                  <option value="Unlimited">Unlimited / High Scale</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Data Sensitivity</label>
                <select
                  value={dataSensitivity}
                  onChange={(e) => setDataSensitivity(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Low">Low (Public catalog/docs)</option>
                  <option value="Medium">Medium (User accounts, logs)</option>
                  <option value="High">High (PII, user passwords)</option>
                  <option value="Critical">Critical (Financial data, health vault)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">Compliance Standards (Multi-Select)</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["SOC2", "HIPAA", "PCI DSS", "GDPR", "ISO27001"].map((std) => (
                  <label
                    key={std}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      complianceList.includes(std)
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-300"
                        : "bg-white/5 border-white/5 hover:border-white/20 text-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={complianceList.includes(std)}
                      onChange={() => handleComplianceToggle(std)}
                      className="hidden"
                    />
                    <span className="font-semibold">{std}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> 4. Technology Preferences
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Cloud Provider</label>
                <select
                  value={cloudProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="let ai decide">Let AI Decide</option>
                  <option value="azure">Azure</option>
                  <option value="aws">AWS</option>
                  <option value="gcp">GCP</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Compute Platform</label>
                <select
                  value={computeType}
                  onChange={(e) => setComputeType(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {(computeOptions[cloudProvider] || computeOptions["let ai decide"]).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Database Core</label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {(databaseOptions[cloudProvider] || databaseOptions["let ai decide"]).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Cache Tier</label>
                <select
                  value={cache}
                  onChange={(e) => setCache(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Let AI Decide">Let AI Decide</option>
                  <option value="Redis">Redis Cache</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> 5. Architecture Strategy
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Architecture Goal</label>
                <select
                  value={architectureGoal}
                  onChange={(e) => setArchitectureGoal(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Cost Optimized">Cost Optimized (Minimize footprint)</option>
                  <option value="Balanced">Balanced (Standard enterprise profile)</option>
                  <option value="Performance Optimized">Performance Optimized (Low latency)</option>
                  <option value="Enterprise Grade">Enterprise Grade (HA + Strict Compliance)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">AI Decision Level</label>
                <select
                  value={aiDecisionLevel}
                  onChange={(e) => setAiDecisionLevel(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Full AI Control">Full AI Control (AI designs all layers)</option>
                  <option value="Guided AI">Guided AI (AI respects technology bounds)</option>
                  <option value="Manual Override">Manual Override (Strict requirements lock)</option>
                </select>
              </div>
            </div>

            {/* Advanced Settings Collapsible Toggle */}
            <div className="mt-4 border border-white/5 rounded-xl bg-[#0b0f19]/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 text-xs text-slate-300 font-mono transition-colors focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-cyan-400" />
                  Advanced Settings (Optional Network Isolation)
                </span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showAdvanced && (
                <div className="p-4 border-t border-white/5 space-y-4 bg-slate-950/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-medium font-mono">Deployment Region</label>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="bg-[#0b0f19] border border-white/10 px-2 py-1.5 rounded text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                      >
                        {(regionOptions[cloudProvider] || regionOptions.azure).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-medium font-mono">Resource Group</label>
                      <input
                        type="text"
                        value={resourceGroup}
                        onChange={(e) => setResourceGroup(e.target.value)}
                        className={`bg-[#0b0f19] border ${errors.resourceGroup ? "border-rose-500" : "border-white/10"} px-2 py-1.5 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500`}
                        placeholder="rg-production"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-medium font-mono">VNet CIDR Block</label>
                      <input
                        type="text"
                        value={vnetCIDR}
                        onChange={(e) => setVnetCIDR(e.target.value)}
                        className={`bg-[#0b0f19] border ${errors.vnetCIDR ? "border-rose-500" : "border-white/10"} px-2 py-1.5 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500`}
                        placeholder="10.0.0.0/16"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-medium font-mono">Additional VNets</label>
                      <input
                        type="text"
                        value={additionalVNets}
                        onChange={(e) => setAdditionalVNets(e.target.value)}
                        className="bg-[#0b0f19] border border-white/10 px-2 py-1.5 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                        placeholder="10.1.0.0/16"
                      />
                    </div>
                  </div>



                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/5 pt-3">
                    <label className="flex items-center gap-1.5 p-1.5 rounded bg-white/5 border border-white/5 cursor-pointer">
                      <input type="checkbox" checked={hasWAF} onChange={(e) => setHasWAF(e.target.checked)} className="rounded text-cyan-500" />
                      <span className="text-slate-300">WAF Policy</span>
                    </label>
                    <label className="flex items-center gap-1.5 p-1.5 rounded bg-white/5 border border-white/5 cursor-pointer">
                      <input type="checkbox" checked={hasFirewall} onChange={(e) => setHasFirewall(e.target.checked)} className="rounded text-cyan-500" />
                      <span className="text-slate-300">Network Firewall</span>
                    </label>
                    <label className="flex items-center gap-1.5 p-1.5 rounded bg-white/5 border border-white/5 cursor-pointer">
                      <input type="checkbox" checked={hasKeyVault} onChange={(e) => setHasKeyVault(e.target.checked)} className="rounded text-cyan-500" />
                      <span className="text-slate-300">Secrets Vault</span>
                    </label>
                    <label className="flex items-center gap-1.5 p-1.5 rounded bg-white/5 border border-white/5 cursor-pointer">
                      <input type="checkbox" checked={hasManagedIdentity} onChange={(e) => setHasManagedIdentity(e.target.checked)} className="rounded text-cyan-500" />
                      <span className="text-slate-300">Managed Identity</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3 text-[10px] font-mono">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 font-medium">RTO Target</label>
                      <input
                        type="text"
                        value={rto}
                        onChange={(e) => setRto(e.target.value)}
                        className="bg-[#0b0f19] border border-white/10 px-2 py-1 rounded text-slate-200 focus:outline-none"
                        placeholder="4 hours"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 font-medium">RPO Target</label>
                      <input
                        type="text"
                        value={rpo}
                        onChange={(e) => setRpo(e.target.value)}
                        className="bg-[#0b0f19] border border-white/10 px-2 py-1 rounded text-slate-200 focus:outline-none"
                        placeholder="1 hour"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-mono transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono transition flex items-center gap-1.5 ml-auto shadow-neon-blue"
          >
            Next <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white text-xs font-mono font-bold transition flex items-center gap-2 shadow-neon-indigo disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Deploying Agents...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run Agentic Architect</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Console details */}
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-1 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>Active fallback chain: OpenAI → DeepSeek → Ollama</span>
        </div>
      </div>
    </div>
  );
}
