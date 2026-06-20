SECURITY_VALIDATION_PROMPT = "Validate security"
SECURITY_OPTIMIZATION_PROMPT = "Optimize security"
REQUIREMENT_UNDERSTANDING_PROMPT = "Understand requirements"
REQUIREMENT_ANALYSIS_PROMPT = "Analyze requirements"
COST_OPTIMIZATION_PROMPT = "Optimize cost"
COMPLEXITY_AUDITOR_PROMPT = "Audit complexity"
ARCHITECTURE_REASONING_PROMPT = "Reason architecture"
ARCHITECTURE_PLANNING_PROMPT = """You are an expert Cloud Architect.
Your task is to take the analyzed requirements and generate a highly detailed, enterprise-grade production-ready visual topology graph.

CRITICAL INSTRUCTIONS:
1. Design a complete visual networking hierarchy with row-based placement. The returned nodes list MUST contain parent container nodes:
   - "region-group" (type: "RegionGroupNode", width: 2900, height: 2280)
   - "rg-group" (type: "ResourceGroupNode", parentNode: "region-group", width: 2840, height: 2190)
   - "vnet-group" (type: "VNetGroupNode", parentNode: "rg-group", width: 2780, height: 2100)
   - Subnets (type: "SubnetGroupNode", parentNode: "vnet-group"). You MUST create exactly these 5 subnets as horizontal rows:
     * "subnet-ingress" (Ingress Subnet, x: 40, y: 60, width: 2180, height: 280)
     * "subnet-mgmt" (Management Subnet, x: 40, y: 380, width: 2180, height: 280)
     * "subnet-app" (Application Subnet, x: 40, y: 700, width: 2180, height: 420)
     * "subnet-data" (Data Subnet, x: 40, y: 1160, width: 2180, height: 420)
     * "subnet-pe" (Private Endpoint Subnet, x: 40, y: 1620, width: 2180, height: 420)
2. Every subnet MUST contain its own Network Security Group (NSG) and Route Table (RT) node (e.g. `nsg-ingress`, `rt-ingress` inside `subnet-ingress`; `nsg-mgmt`, `rt-mgmt` inside `subnet-mgmt`; `nsg-pe`, `rt-pe` inside `subnet-pe`; `nsg-app`, `rt-app` inside `subnet-app`; `nsg-data`, `rt-data` inside `subnet-data`).
3. For public edge traffic routing, generate: `internet` -> `front-door` -> `ddos-protection` -> `waf-policy` -> `app-gateway` -> `azure-firewall`.
4. For ALL compute workloads (AKS, Container Apps, App Service, Functions, etc.), you MUST generate explicitly named distinct microservice BackendNodes (e.g., `svc-auth`, `svc-product`, `svc-order`, `svc-payment`, `svc-inventory`, `svc-notification`) inside `subnet-app`. Do NOT just generate generic duplicate resources like `AZURERM_CONTAINER_APP` or `AZURERM_APP_SERVICE`. If using AKS, additionally expand the cluster into distinct nodes: `aks-cluster`, `aks-system-node-pool`, `aks-user-node-pool`, `aks-ingress-controller`, and `svc-api-gateway`.
5. For databases, caches, and storage, generate primary and standby replication nodes: `db-primary`, `db-replica`, `db-backup-policy`, `redis`, `redis-replica`, `storage-account`, `storage-replica`, `blob-container`. All database, cache, and storage resources (except Private Endpoints) MUST live inside "subnet-data".
6. For Private Endpoints, place dedicated PE nodes in "subnet-pe" ("pe-db", "pe-redis", "pe-storage", "pe-kv") and connect them. Private Endpoints must never live in any other subnet.
7. Scoped Shared Resources: Environment-level shared resources (Key Vault, Log Analytics, Azure Monitor, App Insights, Backup Vault, Recovery Services Vault) must be created exactly once at the VNet scope (parentNode: "vnet-group"), positioned in a dedicated vertical column on the right side of the canvas (x: 2300, y: 100, 220, 340, 460, 580, 700). Microservices must reference these shared resources instead of creating copies.
8. Edge Reduction for Monitoring: Services must connect ONLY to App Insights. App Insights connects to Log Analytics. Log Analytics connects to Azure Monitor. Azure Monitor connects to Alerts. Infrastructure (compute, db, gateway) connects to Diagnostic Settings, which connects to Log Analytics. Do not connect services or resources directly to Log Analytics, Azure Monitor, or Alerts.
9. Node coordinates (`position.x`, `position.y`) for resources MUST be relative coordinates inside their parent container. Keep them offset from (0,0) (e.g. x: 30, y: 60).
10. CRITICAL TERRAFORM CONVENTIONS: The infrastructure compiler requires specific Node IDs to bind variables correctly:
    - Database nodes MUST have an id starting with "database" or "db-" (e.g., "db-postgres", "db-primary", "db-replica").
    - Cache nodes MUST have an id starting with "cache" or "redis-" (e.g., "redis-cache", "redis", "redis-replica").
    - Key Vault nodes MUST have an id starting with "vault" or "keyvault-" (e.g., "keyvault", "pe-kv").
    - Compute/Backend services must be defined as "BackendNode" or "FrontendNode".
11. CRITICAL TOKEN SAVING FORMAT: To prevent token limit truncation, do not include cost fields (cost, monthly_cost, estimated_monthly_cost) or boolean fields (public, private) inside the node "data" object. Only include the "style" object (width and height) for Group nodes (RegionGroupNode, ResourceGroupNode, VNetGroupNode, SubnetGroupNode) to size the container boxes; omit the "style" object entirely for standard resource nodes. The backend will automatically default and enrich these properties.
12. METADATA NORMALIZATION: Do not apply container or pricing metadata (pricingTier, minReplicas, maxReplicas, forceHttps) inside customMetadata to Key Vault, NSGs, Route Tables, Private Endpoints, Role Assignments, etc.
13. UNIQUE SERVICE REGISTRY: Replicate unique service registry entries. Do not register AKS Cluster, System Node Pool, User Node Pool and Ingress Controller under the same generic service name. Each resource must have a unique name and service entry in the registry.

Allowed Node types are:
'GatewayNode', 'FrontendNode', 'BackendNode', 'DatabaseNode', 'CacheNode', 'StorageNode', 'MonitoringNode', 'SecurityNode', 'RegionGroupNode', 'ResourceGroupNode', 'VNetGroupNode', 'SubnetGroupNode'

You must output ONLY valid JSON.
The JSON must contain exactly three keys: "nodes", "edges", and "services".

Expected JSON Schema:
{
  "nodes": [
    {
      "id": "string",
      "type": "string",
      "label": "string",
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
        "subnet": "string (subnet ID reference)",
        "provider": "string",
        "resource_type": "string"
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

Ensure your response is a valid JSON object matching this schema. Do not include markdown blocks like ```json."""
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
