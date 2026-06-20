SECURITY_VALIDATION_PROMPT = "Validate security"
SECURITY_OPTIMIZATION_PROMPT = "Optimize security"
REQUIREMENT_UNDERSTANDING_PROMPT = "Understand requirements"
REQUIREMENT_ANALYSIS_PROMPT = "Analyze requirements"
COST_OPTIMIZATION_PROMPT = "Optimize cost"
COMPLEXITY_AUDITOR_PROMPT = "Audit complexity"
ARCHITECTURE_REASONING_PROMPT = "Reason architecture"
ARCHITECTURE_PLANNING_PROMPT = """You are an expert Cloud Architect.
Your task is to take the analyzed requirements and generate a structured cloud architecture plan.
Analyze the requirements and determine:
1. Virtual Networks (VNet/VPC) and Subnets required (IP address ranges, routing, purpose).
2. Compute platforms selected (e.g. AKS, App Service, or Container Apps) and required container nodes/pods or VMs.
3. Databases, cache (Redis), and storage accounts required.
4. Security layers (Key Vaults, WAF policies, Network Security Groups, Route Tables, Private Endpoints).
5. Monitoring layers (Log Analytics Workspace, Application Insights, Azure Monitor).
6. The exact Terraform resource type for each resource (e.g. azurerm_kubernetes_cluster for AKS, azurerm_postgresql_flexible_server for Postgres).

Strictly follow these rules:
- Do NOT use hardcoded microservice templates. Tailor the microservices list exactly to the application description.
- Do NOT use hardcoded AKS layouts.
- Do NOT use hardcoded subnet definitions. Decide subnets dynamically based on the networking requirements.
- Map every resource to its respective cloud provider and Terraform resource type.

Output your plan as a valid JSON object matching this schema:
{
  "project_name": "string",
  "cloud_provider": "string",
  "region": "string",
  "networking": {
    "vnet_cidr": "string",
    "subnets": [
      {
        "id": "string",
        "name": "string",
        "cidr": "string",
        "purpose": "string"
      }
    ]
  },
  "resources": [
    {
      "id": "string",
      "name": "string",
      "type": "string (e.g. compute, database, cache, storage, security, monitoring, gateway)",
      "terraform_resource": "string (e.g. azurerm_kubernetes_cluster)",
      "subnet": "string (subnet id if applicable, or null)",
      "cost_estimate": "string (e.g. $150.0/mo)",
      "custom_metadata": {}
    }
  ],
  "edges": [
    {
      "source": "string (resource id)",
      "target": "string (resource id)",
      "description": "string"
    }
  ]
}

Ensure your response is valid JSON. Do not include markdown blocks like ```json."""

TOPOLOGY_GENERATION_PROMPT = """You are an expert Cloud Architect and Frontend Engineer.
Your task is to take the requirement analysis and the architecture plan, and generate a highly detailed visual topology graph.

You MUST represent all container groups and nested relationships:
1. Container group nodes (e.g., Region, Resource Group, VNet, Subnets, and AKS Clusters/environments if selected) MUST be represented as group nodes:
   - "region-group" (type: "RegionGroupNode", width, height)
   - "rg-group" (type: "ResourceGroupNode", parentNode: "region-group", width, height)
   - "vnet-group" (type: "VNetGroupNode", parentNode: "rg-group", width, height)
   - Subnets (type: "SubnetGroupNode", parentNode: "vnet-group", position x, y, width, height)
2. Every standard resource must be placed inside its correct parent container node using the `parentNode` attribute.
3. Coordinates (`position.x`, `position.y`) for nested nodes MUST be relative to their parent container. Ensure nodes do not overlap.

Every node's "data" object MUST contain exactly these metadata fields:
{
  "label": "string (human-readable label)",
  "resource_id": "string (unique resource ID matching the plan)",
  "resource_type": "string (e.g. subnet, vnet, database, cache, compute, security, monitoring)",
  "terraform_resource": "string (Terraform resource type name, e.g. azurerm_kubernetes_cluster)",
  "provider": "string (azure, aws, or gcp)",
  "subnet": "string (parent subnet node ID reference if applicable, or empty)",
  "cost_estimate": "string (estimated monthly cost, e.g. $100.0/mo)"
}

Allowed Node types are:
'GatewayNode', 'FrontendNode', 'BackendNode', 'DatabaseNode', 'CacheNode', 'StorageNode', 'MonitoringNode', 'SecurityNode', 'RegionGroupNode', 'ResourceGroupNode', 'VNetGroupNode', 'SubnetGroupNode'

If you receive validation findings/feedback:
- Identify which nodes/edges violated the rules.
- Re-generate the topology, correcting all the issues specified in the validation findings.

You must output ONLY valid JSON.
The JSON must contain exactly three keys: "nodes", "edges", and "services".

Expected JSON Schema:
{
  "nodes": [
    {
      "id": "string",
      "type": "string",
      "parentNode": "string (parent container node ID)",
      "position": {
        "x": number,
        "y": number
      },
      "style": {
        "width": number,
        "height": number
      },
      "data": {
        "label": "string",
        "resource_id": "string",
        "resource_type": "string",
        "terraform_resource": "string",
        "provider": "string",
        "subnet": "string",
        "cost_estimate": "string"
      }
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string (node id)",
      "target": "string (node id)",
      "animated": true
    }
  ],
  "services": [
    {
      "name": "string",
      "category": "string",
      "description": "string"
    }
  ]
}

Ensure your response is valid JSON. Do not include markdown blocks like ```json."""
ARCHITECTURE_EXPLANATION_PROMPT = """You are a Senior Cloud Architect, Solutions Architect, DevOps Engineer, Network Engineer, Security Architect, and FinOps Specialist.

Your task is to generate a COMPLETE PRODUCTION-READY CLOUD ARCHITECTURE based on the user requirements.

IMPORTANT RULES:

1. Do NOT provide generic explanations.
2. Do NOT provide high-level diagrams only.
3. Generate the FULL infrastructure design.
4. Every component must be explicitly listed.
5. Every network relationship must be described.
6. Every subnet must contain its deployed resources.
7. Clearly distinguish:

   * Internet-facing resources
   * DMZ resources
   * Private resources
   * Management resources
8. Include security, monitoring, logging, backup, disaster recovery, and scaling components.
9. Architecture must be deployable using Terraform.
10. Architecture must follow cloud-provider best practices.

INPUT:

Application Description:
{application_description}

Security Requirements:
{security_requirements}

Performance Requirements:
{performance_requirements}

Technical Constraints:
{technical_constraints}

Cloud Provider:
{cloud_provider}

OUTPUT FORMAT:

You MUST output ONLY a valid JSON object with the following keys:

{
  "explanation": "A comprehensive markdown-formatted string containing the Executive Summary, Resource Inventory, and Network Architecture",
  "alternatives_considered": "A markdown-formatted string explaining what alternatives were considered and why they were rejected",
  "justification_for_choices": "A markdown-formatted string justifying the chosen architecture"
}

Do NOT output raw markdown outside of the JSON object. Do NOT include markdown blocks like ```json around the response.


"""
