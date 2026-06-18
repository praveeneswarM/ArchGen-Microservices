"use client";

import React, { useState } from "react";
import { RequirementInput } from "../types";
import { 
  Play, Sparkles, Terminal, Sliders, Cloud, DollarSign, Users, 
  FileText, Shield, Cpu, Database, Activity, Network, ArrowRight, ArrowLeft 
} from "lucide-react";

interface RequirementFormProps {
  onSubmit: (data: RequirementInput) => void;
  isLoading: boolean;
}

export default function RequirementForm({ onSubmit, isLoading }: RequirementFormProps) {
  const [step, setStep] = useState(1);
  
  // Advanced Wizard State
  const [appName, setAppName] = useState("Enterprise Stack");
  const [appDescription, setAppDescription] = useState(
    "A scalable SaaS platform with authenticated tenant workspaces, highly secure data boundaries, and global load balancing."
  );
  const [workloadType, setWorkloadType] = useState("SaaS Platform");
  const [cloudProvider, setCloudProvider] = useState("azure");
  
  // Networking Section
  const [region, setRegion] = useState("East US");
  const [resourceGroup, setResourceGroup] = useState("rg-production");
  const [vnetCIDR, setVnetCIDR] = useState("10.0.0.0/16");
  const [additionalVNets, setAdditionalVNets] = useState("");
  const [selectedSubnets, setSelectedSubnets] = useState({
    ingress: true,
    application: true,
    data: true,
    management: true,
    privateEndpoint: true,
  });
  
  // Compute Section
  const [computeType, setComputeType] = useState("AKS");
  
  // Data Section
  const [dataType, setDataType] = useState("PostgreSQL");
  const [hasStorageAccount, setHasStorageAccount] = useState(true);
  const [hasRedis, setHasRedis] = useState(true);
  
  // Security Section
  const [hasWAF, setHasWAF] = useState(true);
  const [hasFirewall, setHasFirewall] = useState(true);
  const [hasKeyVault, setHasKeyVault] = useState(true);
  const [hasManagedIdentity, setHasManagedIdentity] = useState(true);
  const [hasDDoS, setHasDDoS] = useState(false);
  const [compliance, setCompliance] = useState("SOC2");
  
  // Monitoring Section
  const [monitoring, setMonitoring] = useState({
    azureMonitor: true,
    logAnalytics: true,
    appInsights: true,
    alerts: true,
    backupVault: true,
  });
  
  // Cost & SLA Section
  const [monthlyBudget, setMonthlyBudget] = useState("1200");
  const [expectedUsers, setExpectedUsers] = useState("100,000 monthly");
  const [availabilityTarget, setAvailabilityTarget] = useState("99.99%");
  const [rto, setRto] = useState("4 hours");
  const [rpo, setRpo] = useState("1 hour");

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 5));
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct rich technical details into additional_notes
    const subnetDetails = [
      selectedSubnets.ingress && "Ingress: 10.0.1.0/24",
      selectedSubnets.application && "Application: 10.0.2.0/24",
      selectedSubnets.data && "Data: 10.0.3.0/24",
      selectedSubnets.management && "Management: 10.0.4.0/24",
      selectedSubnets.privateEndpoint && "Private Endpoint: 10.0.5.0/24",
    ].filter(Boolean).join(", ");

    const monitoringDetails = Object.entries(monitoring)
      .filter(([_, active]) => active)
      .map(([key]) => key)
      .join(", ");

    const structuredNotes = `
[Architecture Brief]
Name: ${appName}
Workload Type: ${workloadType}
Region: ${region}
Resource Group: ${resourceGroup}
Primary VNet: ${vnetCIDR}
Additional VNets: ${additionalVNets || "None"}
Subnets: ${subnetDetails}
Compute: ${computeType}
Database: ${dataType}
Security Features: WAF=${hasWAF}, Firewall=${hasFirewall}, Key Vault=${hasKeyVault}, Managed Identity=${hasManagedIdentity}, DDoS=${hasDDoS}
Compliance Standards: ${compliance}
Monitoring Stack: ${monitoringDetails}
Availability Target: ${availabilityTarget}
RTO Target: ${rto}
RPO Target: ${rpo}
    `.trim();

    onSubmit({
      app_description: appDescription,
      expected_users: expectedUsers,
      monthly_budget: monthlyBudget,
      cloud_provider: cloudProvider,
      additional_notes: structuredNotes,
      application_type: workloadType,
      scalability_preference: expectedUsers,
      security_level: compliance,
      database_type: dataType,
      projectName: appName,
      region: region,
      availability_target: availabilityTarget,
      rto: rto,
      rpo: rpo,
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
              <FileText className="w-4 h-4 text-cyan-400" /> Application Details
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enterprise Stack"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Workload Profile</label>
              <select
                value={workloadType}
                onChange={(e) => setWorkloadType(e.target.value)}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="SaaS Platform">SaaS Platform</option>
                <option value="Banking System">Banking System</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Healthcare">Healthcare</option>
                <option value="IoT Platform">IoT Platform</option>
                <option value="AI SaaS">AI SaaS</option>
                <option value="Streaming Platform">Streaming Platform</option>
                <option value="ERP System">ERP System</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Application Description</label>
              <textarea
                value={appDescription}
                onChange={(e) => setAppDescription(e.target.value)}
                rows={4}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-normal font-sans"
                placeholder="Describe your workload, users flows, database triggers..."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <Network className="w-4 h-4 text-cyan-400" /> Networking Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Cloud Provider</label>
                <select
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="azure">Azure</option>
                  <option value="aws">AWS</option>
                  <option value="gcp">GCP</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Deployment Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="East US">East US</option>
                  <option value="Central India">Central India</option>
                  <option value="West Europe">West Europe</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Resource Group Name</label>
                <input
                  type="text"
                  value={resourceGroup}
                  onChange={(e) => setResourceGroup(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  placeholder="rg-production"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">VNet IP Address Space</label>
                <input
                  type="text"
                  value={vnetCIDR}
                  onChange={(e) => setVnetCIDR(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  placeholder="10.0.0.0/16"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Additional VNets (Optional CIDR List)</label>
              <input
                type="text"
                value={additionalVNets}
                onChange={(e) => setAdditionalVNets(e.target.value)}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                placeholder="10.1.0.0/16, 10.2.0.0/16"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">Provision Subnet Zones</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(selectedSubnets).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setSelectedSubnets((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-slate-700 bg-[#0b0f19] text-cyan-500 focus:ring-0"
                    />
                    <span className="capitalize text-slate-300">
                      {key.replace(/([A-Z])/g, " $1")} Subnet
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Compute & Data Layers
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Compute Services</label>
              <select
                value={computeType}
                onChange={(e) => setComputeType(e.target.value)}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="AKS">AKS (Azure Kubernetes Service)</option>
                <option value="VMSS">VMSS (Virtual Machine Scale Set)</option>
                <option value="App Service">App Service (PaaS)</option>
                <option value="Azure Functions">Azure Functions (Serverless)</option>
                <option value="Container Apps">Container Apps (Microservices)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Database Core Engine</label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="PostgreSQL">PostgreSQL (Flexible Server)</option>
                <option value="MySQL">MySQL (Flexible Server)</option>
                <option value="MongoDB">MongoDB Atlas (NoSQL)</option>
                <option value="CosmosDB">CosmosDB (Multi-Model API)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30 text-xs">
                <input
                  type="checkbox"
                  checked={hasStorageAccount}
                  onChange={(e) => setHasStorageAccount(e.target.checked)}
                  className="rounded border-slate-700 bg-[#0b0f19] text-cyan-500"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-200">Blob Storage Account</span>
                  <span className="text-[10px] text-slate-400">Add cloud asset hosting bucket</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30 text-xs">
                <input
                  type="checkbox"
                  checked={hasRedis}
                  onChange={(e) => setHasRedis(e.target.checked)}
                  className="rounded border-slate-700 bg-[#0b0f19] text-cyan-500"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-200">Redis Cache Engine</span>
                  <span className="text-[10px] text-slate-400">High-speed session storage</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-cyan-400" /> Security & Monitoring
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30">
                <input type="checkbox" checked={hasWAF} onChange={(e) => setHasWAF(e.target.checked)} className="rounded text-cyan-500" />
                <span className="text-slate-300">WAF (Web Application Firewall)</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30">
                <input type="checkbox" checked={hasFirewall} onChange={(e) => setHasFirewall(e.target.checked)} className="rounded text-cyan-500" />
                <span className="text-slate-300">Network Firewall</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30">
                <input type="checkbox" checked={hasKeyVault} onChange={(e) => setHasKeyVault(e.target.checked)} className="rounded text-cyan-500" />
                <span className="text-slate-300">Azure Key Vault</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30">
                <input type="checkbox" checked={hasManagedIdentity} onChange={(e) => setHasManagedIdentity(e.target.checked)} className="rounded text-cyan-500" />
                <span className="text-slate-300">Managed Identity (IAM)</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30 col-span-2">
                <input type="checkbox" checked={hasDDoS} onChange={(e) => setHasDDoS(e.target.checked)} className="rounded text-cyan-500" />
                <span className="text-slate-300">Azure DDoS Volumetric Protection Plan</span>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Compliance Standards</label>
              <select
                value={compliance}
                onChange={(e) => setCompliance(e.target.value)}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="SOC2">SOC2 Type II</option>
                <option value="PCI DSS">PCI DSS Compliance (Banking-level)</option>
                <option value="HIPAA">HIPAA Compliance (Healthcare)</option>
                <option value="ISO27001">ISO 27001 Standard</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">Monitoring & Recovery Vaults</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(monitoring).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5 cursor-pointer hover:border-cyan-500/30">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setMonitoring((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-slate-700 bg-[#0b0f19] text-cyan-500 focus:ring-0"
                    />
                    <span className="capitalize text-slate-300">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-cyan-400" /> Cost Constraints & SLA Targets
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Monthly Budget Limit ($)</label>
                <input
                  type="text"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  placeholder="1200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Expected User Load</label>
                <input
                  type="text"
                  value={expectedUsers}
                  onChange={(e) => setExpectedUsers(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  placeholder="100,000 monthly"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Target Availability SLA</label>
              <select
                value={availabilityTarget}
                onChange={(e) => setAvailabilityTarget(e.target.value)}
                className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="99.9%">99.9% (Standard SLA)</option>
                <option value="99.99%">99.99% (High Availability - Multi-Zone)</option>
                <option value="99.999%">99.999% (Mission Critical - Multi-Region)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">RTO (Recovery Time Objective)</label>
                <input
                  type="text"
                  value={rto}
                  onChange={(e) => setRto(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  placeholder="4 hours"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">RPO (Recovery Point Objective)</label>
                <input
                  type="text"
                  value={rpo}
                  onChange={(e) => setRpo(e.target.value)}
                  className="bg-[#0b0f19] border border-white/10 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  placeholder="1 hour"
                />
              </div>
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
