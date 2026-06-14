from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class RequirementInput(BaseModel):
    app_description: str
    expected_users: str
    monthly_budget: str
    cloud_provider: str
    additional_notes: Optional[str] = None

class ArchitectureResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    services: List[Dict[str, Any]]
    cloud_provider: str
    active_provider: str
    active_model: str
    fallback_trigger: str
    cost_estimate: float
    cost_breakdown: List[Any]
    optimization_recommendations: List[Any]
    complexity_score: int
    operational_overhead_score: int
    overengineered: bool
    warnings: List[Any]
    security_score: int
    security_findings: List[Any]
    compliance_checks: List[Any]
    explanation: str
    alternatives_considered: str
    justification_for_choices: str
    terraform_modules: List[str]
    execution_time_ms: int
    generation_source: Optional[str] = "deterministic+ollama"
    provider: Optional[str] = "azure"
    node_count: Optional[int] = 0
    edge_count: Optional[int] = 0
    subnet_count: Optional[int] = 0

class NodeModel(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]
    position: Optional[Dict[str, Any]] = None

class EdgeModel(BaseModel):
    id: str
    source: str
    target: str
    animated: Optional[bool] = False

class ServiceModel(BaseModel):
    name: str
    category: str
    description: str

class TerraformRequest(BaseModel):
    nodes: List[NodeModel]
    edges: List[EdgeModel]
    services: List[ServiceModel]
    cloud_provider: str

class TerraformResponse(BaseModel):
    main_tf: str
    variables_tf: str
    outputs_tf: str
    terraform_tfvars: str
    instructions: str

class AiAssistRequest(BaseModel):
    nodes: List[NodeModel]
    edges: List[EdgeModel]
    services: List[ServiceModel]
    action: str
