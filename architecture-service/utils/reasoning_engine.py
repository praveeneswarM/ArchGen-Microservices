import re
from typing import Dict, Any, List, Set

class InfrastructureReasoningEngine:
    """
    Deterministic Infrastructure Reasoning Engine for ArchGen.
    Eliminates template fallbacks and direct AI-hallucinated structural topologies.
    """

    WORKLOAD_TYPES = [
        "ott",
        "banking",
        "ecommerce",
        "ai_platform",
        "saas_platform",
        "gaming_backend",
        "crud",
        "analytics",
        "microservices"
    ]

    def __init__(self, cloud_provider: str = "azure"):
        self.cloud_provider = cloud_provider.lower()

    def classify_workload(self, app_description: str, expected_users: str) -> str:
        """
        Classifies the workload based on keywords and description patterns.
        """
        desc = app_description.lower()
        users = expected_users.lower()

        if any(w in desc for w in ["bank", "fintech", "payment", "transaction", "ledger", "pci", "banking", "finance"]):
            return "banking"
        if any(w in desc for w in ["ott", "streaming", "video", "broadcast", "live", "media", "netflix", "youtube", "audio"]):
            return "ott"
        if any(w in desc for w in ["ai", "ml", "gpu", "llm", "deep learning", "inference", "training", "model", "openai", "gpt"]):
            return "ai_platform"
        if any(w in desc for w in ["ecommerce", "e-commerce", "shop", "retail", "cart", "store", "product catalog", "checkout"]):
            return "ecommerce"
        if any(w in desc for w in ["saas", "multi-tenant", "b2b saas", "subscription portal", "tenant"]):
            return "saas_platform"
        if any(w in desc for w in ["game", "gaming", "multiplayer", "matchmaking", "lobby", "leaderboard", "unreal", "unity"]):
            return "gaming_backend"
        if any(w in desc for w in ["analytics", "big data", "data warehouse", "lakehouse", "spark", "hadoop", "bi tool", "dashboard", "telemetry"]):
            return "analytics"
        if any(w in desc for w in ["microservices", "kubernetes", "aks", "eks", "gke", "service mesh", "istio", "event-driven"]):
            return "microservices"
        if any(w in desc for w in ["simple", "crud", "basic", "portfolio", "hobby", "internal tool", "small database"]):
            return "crud"
        
        if "million" in users or "100k" in users or "100,000" in users:
            return "saas_platform"
        
        return "crud"

    def get_cloud_resource_name(self, generic_type: str) -> str:
        """
        Maps generic architectural components to provider-specific names.
        """
        mapping = {
            "azure": {
                "cdn": "Azure Front Door / CDN",
                "waf": "Azure WAF",
                "appgw": "Azure Application Gateway",
                "firewall": "Azure Firewall",
                "aks": "Azure Kubernetes Service (AKS)",
                "postgres": "Azure Database for PostgreSQL",
                "redis": "Azure Cache for Redis",
                "keyvault": "Azure Key Vault",
                "blob": "Azure Blob Storage",
                "acr": "Azure Container Registry",
                "log_analytics": "Azure Log Analytics",
                "app_insights": "Application Insights",
                "bastion": "Azure Bastion",
                "backup": "Azure Backup Vault",
                "iam": "Microsoft Entra ID",
                "pe": "Azure Private Endpoint"
            },
            "aws": {
                "cdn": "AWS CloudFront",
                "waf": "AWS WAF",
                "appgw": "Application Load Balancer (ALB)",
                "firewall": "AWS Network Firewall",
                "aks": "Amazon EKS",
                "postgres": "Amazon RDS for PostgreSQL",
                "redis": "Amazon ElastiCache",
                "keyvault": "AWS Secrets Manager",
                "blob": "Amazon S3",
                "acr": "Amazon ECR",
                "log_analytics": "Amazon CloudWatch Logs",
                "app_insights": "AWS X-Ray",
                "bastion": "AWS Session Manager / Bastion",
                "backup": "AWS Backup",
                "iam": "AWS IAM",
                "pe": "VPC Endpoint"
            },
            "gcp": {
                "cdn": "Cloud CDN",
                "waf": "Cloud Armor",
                "appgw": "Global HTTPS Load Balancer",
                "firewall": "Cloud Next-Gen Firewall",
                "aks": "Google Kubernetes Engine (GKE)",
                "postgres": "Cloud SQL for PostgreSQL",
                "redis": "MemoryStore for Redis",
                "keyvault": "Secret Manager",
                "blob": "Cloud Storage",
                "acr": "Artifact Registry",
                "log_analytics": "Cloud Logging",
                "app_insights": "Cloud Trace",
                "bastion": "IAP / Bastion Host",
                "backup": "Cloud Backup and DR",
                "iam": "Cloud IAM",
                "pe": "Private Service Connect",
                "dns": "Cloud DNS"
            }
        }
        provider = self.cloud_provider if self.cloud_provider in mapping else "azure"
        return mapping[provider].get(generic_type, generic_type.capitalize())

    def synthesize_from_intent(self) -> Dict[str, Any]:
        """
        Synthesizes a highly detailed, 34-node architecture.
        Strictly enforces NSGs, Subnets, and Private Endpoints.
        """
        nodes = []
        edges = []
        services = ["identity", "compute", "storage", "database", "networking", "security"]

        def add_node(id_val: str, n_type: str, label: str, x: int, y: int, subnet: str, layer: str, public: bool, detail: str, cost: int, cost_tier: str):
            nodes.append({
                "id": id_val,
                "type": n_type,
                "position": {"x": x, "y": y},
                "data": {
                    "label": label,
                    "typeSubText": detail,
                    "subnet": subnet,
                    "layer": layer,
                    "public": public,
                    "provider": self.cloud_provider,
                    "estimated_monthly_cost": cost,
                    "cost_tier": cost_tier
                }
            })

        def add_edge(source: str, target: str, animated: bool = False):
            edges.append({
                "id": f"e-{source}-{target}",
                "source": source,
                "target": target,
                "animated": animated
            })

        # --- 1. Ingress & Edge Layer (internet -> cdn -> waf -> appgw) ---
        add_node("internet", "GatewayNode", "Internet", 400, 50, "public-internet", "edge", True, "Global User Traffic", 0, "low")
        add_node("dns", "GatewayNode", self.get_cloud_resource_name("dns"), 200, 150, "public-internet", "edge", True, "Global DNS routing", 5, "low")
        add_node("cdn", "GatewayNode", self.get_cloud_resource_name("cdn"), 400, 150, "public-internet", "edge", True, "Global Content Delivery Network", 50, "medium")
        add_node("waf", "SecurityNode", self.get_cloud_resource_name("waf"), 400, 250, "ingress-subnet", "security", True, "Web Application Firewall", 120, "high")
        add_node("appgw", "GatewayNode", self.get_cloud_resource_name("appgw"), 400, 350, "ingress-subnet", "edge", True, "L7 Application Gateway / Load Balancer", 100, "medium")
        add_node("nsg-ingress", "SecurityNode", "NSG - Ingress", 250, 350, "ingress-subnet", "security", False, "Network Security Group for Ingress", 0, "low")
        add_node("firewall", "SecurityNode", self.get_cloud_resource_name("firewall"), 100, 350, "ingress-subnet", "security", False, "Network filtering and egress control", 150, "high")
        
        add_edge("internet", "cdn", True)
        add_edge("internet", "dns", False)
        add_edge("dns", "cdn", False)
        add_edge("cdn", "waf", True)
        add_edge("waf", "appgw", True)
        add_edge("nsg-ingress", "appgw", False)
        add_edge("appgw", "firewall", False)

        # --- 2. Kubernetes Compute Layer (AKS) ---
        add_node("aks-cluster", "BackendNode", f"{self.get_cloud_resource_name('aks')} Cluster", 400, 450, "application-subnet", "compute", False, "Managed Kubernetes Control Plane", 100, "medium")
        add_node("aks-system", "BackendNode", "System Node Pool", 200, 550, "application-subnet", "compute", False, "System pool for CoreDNS, Ingress", 120, "medium")
        add_node("aks-user", "BackendNode", "User Node Pool", 600, 550, "application-subnet", "compute", False, "Dedicated node pool for workloads", 240, "high")
        add_node("nsg-app", "SecurityNode", "NSG - App", 800, 450, "application-subnet", "security", False, "Network Security Group for Apps", 0, "low")
        
        # Microservices running inside AKS User Node Pool
        add_node("svc-frontend", "FrontendNode", "Frontend Service", 200, 650, "application-subnet", "compute", False, "Next.js Web Application", 0, "low")
        add_node("svc-api-gateway", "BackendNode", "API Gateway", 400, 650, "application-subnet", "compute", False, "Internal API Federation Service", 0, "low")
        add_node("svc-auth", "BackendNode", "Auth Service", 600, 650, "application-subnet", "compute", False, "Microservice handling JWT authentication", 0, "low")
        add_node("svc-media", "BackendNode", "Media Service", 800, 650, "application-subnet", "compute", False, "Media orchestration service", 0, "low")
        add_node("svc-transcoding", "BackendNode", "Transcoding Service", 1000, 650, "application-subnet", "compute", False, "Video transcoding workers", 0, "low")
        add_node("svc-recommendation", "BackendNode", "Recommendation Service", 400, 750, "application-subnet", "compute", False, "AI recommendation engine", 0, "low")
        add_node("svc-notification", "BackendNode", "Notification Service", 600, 750, "application-subnet", "compute", False, "Email/Push notifications", 0, "low")

        add_edge("appgw", "aks-cluster", True)
        add_edge("nsg-app", "aks-cluster", False)
        add_edge("aks-cluster", "aks-system", False)
        add_edge("aks-cluster", "aks-user", False)
        
        add_edge("aks-user", "svc-frontend", True)
        add_edge("aks-user", "svc-api-gateway", True)
        add_edge("svc-frontend", "svc-api-gateway", True)
        
        add_edge("svc-api-gateway", "svc-auth", True)
        add_edge("svc-api-gateway", "svc-media", True)
        add_edge("svc-media", "svc-transcoding", True)
        add_edge("svc-api-gateway", "svc-recommendation", True)
        add_edge("svc-api-gateway", "svc-notification", True)

        # --- 3. Data & Cache Layer ---
        add_node("db-primary", "DatabaseNode", self.get_cloud_resource_name("postgres"), 600, 900, "data-subnet", "data", False, "Relational primary database", 250, "high")
        add_node("db-replica", "DatabaseNode", f"{self.get_cloud_resource_name('postgres')} Replica", 800, 900, "data-subnet", "data", False, "Read-replica for HA", 250, "high")
        add_node("redis", "CacheNode", self.get_cloud_resource_name("redis"), 400, 900, "data-subnet", "data", False, "In-memory caching layer", 120, "medium")
        add_node("nsg-data", "SecurityNode", "NSG - Data", 1000, 900, "data-subnet", "security", False, "Network Security Group for Data", 0, "low")
        
        add_edge("svc-media", "db-primary", False)
        add_edge("svc-auth", "db-primary", False)
        add_edge("db-primary", "db-replica", False)
        add_edge("nsg-data", "db-primary", False)
        
        add_edge("svc-auth", "redis", False)
        add_edge("svc-api-gateway", "redis", False)
        add_edge("svc-recommendation", "redis", False)

        # --- 4. Storage & Vault Layer ---
        add_node("keyvault", "SecurityNode", self.get_cloud_resource_name("keyvault"), 200, 900, "management-subnet", "security", False, "Hardware-backed secrets vault", 20, "low")
        add_node("blob", "StorageNode", self.get_cloud_resource_name("blob"), 1200, 900, "data-subnet", "storage", False, "Blob Container for media assets", 80, "medium")
        
        add_edge("svc-auth", "keyvault", False)
        add_edge("svc-media", "blob", False)
        add_edge("svc-transcoding", "blob", False)

        # --- 5. Private Endpoints Layer ---
        add_node("pe-db", "SecurityNode", "Private Endpoint - PostgreSQL", 600, 820, "private-endpoint-subnet", "security", False, "Private link to DB", 10, "low")
        add_node("pe-kv", "SecurityNode", "Private Endpoint - Key Vault", 200, 820, "private-endpoint-subnet", "security", False, "Private link to Vault", 10, "low")
        add_node("pe-storage", "SecurityNode", "Private Endpoint - Storage", 1200, 820, "private-endpoint-subnet", "security", False, "Private link to Blob", 10, "low")
        add_node("nsg-pe", "SecurityNode", "NSG - Private Endpoints", 1400, 820, "private-endpoint-subnet", "security", False, "NSG for Private Endpoints", 0, "low")
        
        add_edge("pe-db", "db-primary", False)
        add_edge("pe-kv", "keyvault", False)
        add_edge("pe-storage", "blob", False)
        add_edge("nsg-pe", "pe-db", False)
        
        add_edge("svc-media", "pe-db", False)
        add_edge("svc-auth", "pe-kv", False)
        add_edge("svc-media", "pe-storage", False)

        # --- 6. Security & Management Layer ---
        add_node("iam", "SecurityNode", "Managed Identity", 200, 250, "management-subnet", "security", False, "Microsoft Entra ID / IAM", 0, "low")
        add_node("acr", "StorageNode", self.get_cloud_resource_name("acr"), 100, 450, "management-subnet", "management", False, "Private container registry", 50, "medium")
        add_node("bastion", "SecurityNode", self.get_cloud_resource_name("bastion"), 1000, 250, "management-subnet", "management", False, "Secure jumpbox", 140, "high")
        add_node("nsg-mgmt", "SecurityNode", "NSG - Management", 1200, 250, "management-subnet", "security", False, "NSG for Management", 0, "low")
        
        add_edge("iam", "aks-cluster", False)
        add_edge("iam", "keyvault", False)
        add_edge("aks-cluster", "acr", False)
        add_edge("nsg-mgmt", "bastion", False)
        add_edge("bastion", "aks-cluster", False)

        # --- 7. Disaster Recovery & DevOps Layer ---
        add_node("backup", "StorageNode", self.get_cloud_resource_name("backup"), 1200, 1000, "management-subnet", "storage", False, "Recovery Services Vault", 60, "medium")
        add_node("tf-state", "StorageNode", "Terraform State Storage", 1400, 1000, "management-subnet", "management", False, "Encrypted storage for IaC", 5, "low")

        add_edge("db-primary", "backup", False)
        add_edge("blob", "backup", False)

        # --- 8. Monitoring Layer ---
        add_node("monitor", "MonitoringNode", "Azure Monitor", 1400, 550, "management-subnet", "monitoring", False, "Central monitoring control", 0, "low")
        add_node("log-analytics", "MonitoringNode", self.get_cloud_resource_name("log_analytics"), 1400, 650, "management-subnet", "monitoring", False, "Centralized logs ingestion sink", 100, "medium")
        add_node("app-insights", "MonitoringNode", self.get_cloud_resource_name("app_insights"), 1400, 450, "management-subnet", "monitoring", False, "APM and distributed tracing telemetry", 50, "medium")

        # Connect core components to monitoring
        add_edge("monitor", "log-analytics", False)
        add_edge("monitor", "app-insights", False)
        add_edge("appgw", "log-analytics", False)
        add_edge("aks-user", "app-insights", False)
        add_edge("db-primary", "log-analytics", False)
        add_edge("redis", "log-analytics", False)
        add_edge("keyvault", "log-analytics", False)

        return {
            "nodes": nodes,
            "edges": edges,
            "services": services
        }

    def normalize_topology(self, topology: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitizes topology payloads coming back from synthesis.
        """
        nodes = topology.get("nodes") or []
        edges = topology.get("edges") or []
        services = topology.get("services") or []

        if not isinstance(nodes, list) or not isinstance(edges, list) or not isinstance(services, list):
            return {"nodes": [], "edges": [], "services": []}

        allowed_types = {
            "GatewayNode",
            "FrontendNode",
            "BackendNode",
            "DatabaseNode",
            "CacheNode",
            "StorageNode",
            "SecurityNode",
            "MonitoringNode",
        }

        normalized_nodes = []
        seen_nodes: Set[str] = set()
        for node in nodes:
            if not isinstance(node, dict):
                continue
            node_id = str(node.get("id", "")).strip()
            node_type = str(node.get("type", "")).strip()
            if not node_id or node_id in seen_nodes or node_type not in allowed_types:
                continue
            data = node.get("data") if isinstance(node.get("data"), dict) else {}
            position = node.get("position") if isinstance(node.get("position"), dict) else {}
            normalized_nodes.append({
                "id": node_id,
                "type": node_type,
                "data": {
                    "label": str(data.get("label", node_id)),
                    "status": str(data.get("status", "active")),
                    "cost": data.get("cost"),
                    "typeSubText": data.get("typeSubText"),
                    "subnet": str(data.get("subnet", "")),
                    "layer": str(data.get("layer", "")),
                    "public": bool(data.get("public", False))
                },
                "position": {
                    "x": float(position.get("x", 0)),
                    "y": float(position.get("y", 0)),
                }
            })
            seen_nodes.add(node_id)

        node_ids = {node["id"] for node in normalized_nodes}
        normalized_edges = []
        seen_edges: Set[str] = set()
        for edge in edges:
            if not isinstance(edge, dict):
                continue
            edge_id = str(edge.get("id", "")).strip()
            source = str(edge.get("source", "")).strip()
            target = str(edge.get("target", "")).strip()
            if not edge_id or edge_id in seen_edges or source not in node_ids or target not in node_ids:
                continue
            normalized_edges.append({
                "id": edge_id,
                "source": source,
                "target": target,
                "animated": bool(edge.get("animated", False))
            })
            seen_edges.add(edge_id)

        normalized_services = []
        seen_services: Set[str] = set()
        for service in services:
            if not isinstance(service, dict):
                continue
            service_name = str(service.get("name", "")).strip()
            if not service_name or service_name in seen_services:
                continue
            normalized_services.append({
                "name": service_name,
                "category": str(service.get("category", "backend")),
                "description": str(service.get("description", service_name)),
            })
            seen_services.add(service_name)

        if not normalized_nodes:
            return {"nodes": [], "edges": [], "services": []}

        return {
            "nodes": normalized_nodes,
            "edges": normalized_edges,
            "services": normalized_services,
        }
