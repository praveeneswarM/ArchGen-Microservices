export interface RequirementInput {
  expected_users: string;
  monthly_budget: string;
  cloud_provider: string;
  app_description: string;
  additional_notes?: string;
  application_type?: string;
  scalability_preference?: string;
  security_level?: string;
  database_type?: string;
  projectName?: string;
  region?: string;
  availability_target?: string;
  rto?: string;
  rpo?: string;
  resourceGroup?: string;
  vnetCIDR?: string;
  computeType?: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  status?: string;
  cost?: string;
  typeSubText?: string;
  onLabelChange?: (id: string, label: string) => void;
  id?: string;
  provider?: string;
  customMetadata?: Record<string, any>;
  resource_id?: string;
  resource_type?: string;
  terraform_resource?: string;
  subnet?: string;
  cost_estimate?: string;
  estimated_monthly_cost?: number;
  public?: boolean;
  private?: boolean;
}

export interface NodeSchema {
  id: string;
  type: string;
  data: NodeData;
  position: NodePosition;
  draggableLocked?: boolean;
  selected?: boolean;
}

export interface EdgeSchema {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface ServiceSchema {
  name: string;
  category: string;
  description: string;
}

export interface CostBreakdownItem {
  service: string;
  cost: number;
  reason: string;
}

export interface SecurityFinding {
  severity: "Low" | "Medium" | "High";
  description: string;
  remediation: string;
}

export interface ComplianceCheck {
  standard: string;
  status: string;
  notes: string;
}

export interface ArchitectureResponse {
  nodes: NodeSchema[];
  edges: EdgeSchema[];
  services: ServiceSchema[];
  cloud_provider: string;
  active_provider?: string;
  active_model?: string;
  fallback_trigger?: string;
  cost_estimate: number;
  cost_breakdown: CostBreakdownItem[];
  optimization_recommendations: string[];
  complexity_score: number;
  operational_overhead_score: number;
  overengineered: boolean;
  warnings: string[];
  security_score: number;
  security_findings: SecurityFinding[];
  compliance_checks: ComplianceCheck[];
  explanation: string;
  alternatives_considered: string;
  justification_for_choices: string;
  terraform_modules?: string[];
  execution_time_ms?: number;
  generation_source?: string;
  provider?: string;
  node_count?: number;
  edge_count?: number;
  subnet_count?: number;
}

export interface TerraformRequest {
  nodes: NodeSchema[];
  edges: EdgeSchema[];
  services: ServiceSchema[];
  cloud_provider: string;
  force_regenerate?: boolean;
}

export interface TerraformResponse {
  main_tf: string;
  variables_tf: string;
  outputs_tf: string;
  terraform_tfvars: string;
  instructions: string;
  warnings?: string[];
}
