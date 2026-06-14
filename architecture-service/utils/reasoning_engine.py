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

    def _load_matrix(self) -> Dict[str, Dict[str, str]]:
        import os
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'provider_matrix.yaml')
        matrix = {}
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                current_provider = None
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if line.endswith(':'):
                        current_provider = line[:-1].lower()
                        matrix[current_provider] = {}
                    elif ':' in line and current_provider:
                        key, val = line.split(':', 1)
                        matrix[current_provider][key.strip()] = val.strip(' "\'')
            return matrix
        except Exception:
            return {}

    def get_cloud_resource_name(self, generic_type: str) -> str:
        """
        Maps generic architectural components to provider-specific names from provider_matrix.yaml.
        """
        if not hasattr(self, '_matrix'):
            self._matrix = self._load_matrix()
        
        provider_map = self._matrix.get(self.cloud_provider, self._matrix.get("azure", {}))
        return provider_map.get(generic_type, generic_type)

    def synthesize_from_intent(self, ai_intent: Dict[str, Any], budget: float) -> Dict[str, Any]:
        """
        Synthesizes the precise graph topology and resources directly from the LLM's abstract architectural intent.
        """
        nodes = []
        edges = []
        services = []

        intent = ai_intent.get("architectural_intent", {})

        requires_cdn = intent.get("requires_cdn", False)
        requires_cache = intent.get("requires_caching", False)
        requires_storage = intent.get("requires_blob_storage", False)
        requires_security = intent.get("requires_hardware_security", False)
        requires_vnet = intent.get("requires_private_networking", False)
        requires_ddos = intent.get("requires_ddos_protection", False)
        requires_waf = intent.get("requires_waf", False)
        requires_queue = intent.get("requires_queue", False)
        requires_monitoring = True # Base standard
        
        compute_pref = intent.get("compute_preference", "container")
        db_pref = intent.get("database_preference", "relational")

        # Map LLM preferences to internal types
        if compute_pref == "kubernetes":
            compute_type = "compute_k8s"
        elif compute_pref == "basic_vm":
            compute_type = "compute_basic"
        else:
            compute_type = "compute_container"
            
        if db_pref == "nosql":
            db_type = "database_nosql"
        else:
            db_type = "database_relational"

        # Define active service list mapping to specific cloud provider
        gateway_title = self.get_cloud_resource_name("gateway")
        frontend_title = self.get_cloud_resource_name("frontend")
        compute_title = self.get_cloud_resource_name(compute_type)
        db_title = self.get_cloud_resource_name(db_type)

        # Dynamic Coordinates Builder (Deterministic Positions)
        
        # 1. Gateway / Ingress
        nodes.append({
            "id": "gateway-node",
            "type": "GatewayNode",
            "data": {"label": gateway_title, "status": "active", "typeSubText": "Global Routing"},
            "position": {"x": 80, "y": 200}
        })
        services.append({
            "name": gateway_title,
            "category": "gateway",
            "description": f"Public entry point, SSL termination, and threat prevention filtering traffic into the infrastructure."
        })

        # 2. DDoS protection
        if requires_ddos:
            nodes.append({
                "id": "ddos-node",
                "type": "SecurityNode",
                "data": {"label": self.get_cloud_resource_name("ddos"), "status": "active", "typeSubText": "DDoS Shield"},
                "position": {"x": 80, "y": 80}
            })
            services.append({
                "name": self.get_cloud_resource_name("ddos"),
                "category": "security",
                "description": "Layer 3/4 continuous mitigation for volumetric network floods."
            })
            edges.append({"id": "e-ddos-gateway", "source": "ddos-node", "target": "gateway-node", "animated": True})

        # 3. CDN
        if requires_cdn:
            nodes.append({
                "id": "cdn-node",
                "type": "GatewayNode",
                "data": {"label": self.get_cloud_resource_name("cdn"), "status": "active", "typeSubText": "Edge Content Delivery"},
                "position": {"x": 200, "y": 80}
            })
            services.append({
                "name": self.get_cloud_resource_name("cdn"),
                "category": "gateway",
                "description": "Caches static assets at global edge locations for optimized load performance."
            })
            edges.append({"id": "e-cdn-frontend", "source": "cdn-node", "target": "frontend-node", "animated": True})

        # 4. Frontend Web App
        nodes.append({
            "id": "frontend-node",
            "type": "FrontendNode",
            "data": {"label": frontend_title, "status": "active", "typeSubText": "Static SPA Web App"},
            "position": {"x": 260, "y": 100}
        })
        services.append({
            "name": frontend_title,
            "category": "frontend",
            "description": "Hosts optimized single page application web builds (React, Next.js, HTML5/JS)."
        })
        edges.append({"id": "e-gateway-frontend", "source": "gateway-node", "target": "frontend-node", "animated": True})

        # OTT Specific Enhancements
        workload_class = ai_intent.get("workload_classification", "")
        if workload_class == "ott":
            requires_waf = True
            
            # WAF Enhancement on Gateway
            nodes[0]["data"]["label"] = nodes[0]["data"]["label"].replace("Gateway", "WAF & API Gateway")
            
            # Upload Pipeline (Queue + Storage + Processing)
            nodes.append({
                "id": "upload-api",
                "type": "BackendNode",
                "data": {"label": "Upload Processing API", "status": "active", "typeSubText": "Ingest Layer"},
                "position": {"x": 100, "y": 200}
            })
            services.append({"name": "Upload Processing API", "category": "backend", "description": "Handles massive concurrent video chunk uploads."})
            edges.append({"id": "e-gateway-upload", "source": "gateway-node", "target": "upload-api", "animated": True})
            
            nodes.append({
                "id": "transcoding-node",
                "type": "BackendNode",
                "data": {"label": self.get_cloud_resource_name("transcoding"), "status": "active", "typeSubText": "Video Transcoding"},
                "position": {"x": 100, "y": 300}
            })
            services.append({"name": "Video Transcoding", "category": "backend", "description": "Converts raw uploads into adaptive bitrate streaming formats (HLS/DASH)."})
            edges.append({"id": "e-upload-transcode", "source": "upload-api", "target": "transcoding-node", "animated": True})
            
            nodes.append({
                "id": "media-processing",
                "type": "BackendNode",
                "data": {"label": self.get_cloud_resource_name("media_processing"), "status": "active", "typeSubText": "DRM & Packaging"},
                "position": {"x": 100, "y": 400}
            })
            services.append({"name": "Media Processing", "category": "backend", "description": "Applies DRM and packages video chunks for CDN distribution."})
            edges.append({"id": "e-transcode-media", "source": "transcoding-node", "target": "media-processing", "animated": True})

        # 5. Compute API Backend
        nodes.append({
            "id": "backend-node",
            "type": "BackendNode",
            "data": {"label": compute_title, "status": "active", "typeSubText": "Server Compute"},
            "position": {"x": 260, "y": 240}
        })
        services.append({
            "name": compute_title,
            "category": "backend",
            "description": "Autoscaling back-end compute environment hosting API servers and docker container logic."
        })
        edges.append({"id": "e-gateway-backend", "source": "gateway-node", "target": "backend-node", "animated": True})
        edges.append({"id": "e-frontend-backend", "source": "frontend-node", "target": "backend-node", "animated": False})

        # 6. Primary Database Node
        nodes.append({
            "id": "database-node",
            "type": "DatabaseNode",
            "data": {"label": db_title, "status": "active", "typeSubText": "Persistence Layer"},
            "position": {"x": 480, "y": 300}
        })
        services.append({
            "name": db_title,
            "category": "database",
            "description": "Secure primary storage engine supporting indexing, relationships, and transactional queries."
        })
        edges.append({"id": "e-backend-database", "source": "backend-node", "target": "database-node", "animated": False})

        # 7. Redis Cache Layer
        if requires_cache:
            nodes.append({
                "id": "cache-node",
                "type": "CacheNode",
                "data": {"label": self.get_cloud_resource_name("cache"), "status": "active", "typeSubText": "Memory Caching"},
                "position": {"x": 480, "y": 180}
            })
            services.append({
                "name": self.get_cloud_resource_name("cache"),
                "category": "cache",
                "description": "In-memory key-value cache layer optimized for lightning-fast reads and session persistence."
            })
            edges.append({"id": "e-backend-cache", "source": "backend-node", "target": "cache-node", "animated": False})

        # 8. File Storage
        if requires_storage:
            nodes.append({
                "id": "storage-node",
                "type": "StorageNode",
                "data": {"label": self.get_cloud_resource_name("storage"), "status": "active", "typeSubText": "Binary Storage"},
                "position": {"x": 260, "y": 380}
            })
            services.append({
                "name": self.get_cloud_resource_name("storage"),
                "category": "storage",
                "description": "Highly scalable unstructured storage for multimedia files, exports, and document assets."
            })
            edges.append({"id": "e-backend-storage", "source": "backend-node", "target": "storage-node", "animated": False})
            if requires_cdn:
                edges.append({"id": "e-cdn-storage", "source": "cdn-node", "target": "storage-node", "animated": True})

        # Queue
        if requires_queue:
            nodes.append({
                "id": "queue-node",
                "type": "BackendNode",
                "data": {"label": self.get_cloud_resource_name("queue"), "status": "active", "typeSubText": "Message Bus"},
                "position": {"x": 100, "y": 300}
            })
            services.append({
                "name": self.get_cloud_resource_name("queue"),
                "category": "backend",
                "description": "Asynchronous event-driven messaging queue."
            })
            edges.append({"id": "e-backend-queue", "source": "backend-node", "target": "queue-node", "animated": True})

        # 9. Key Vault / HSM
        if requires_security:
            nodes.append({
                "id": "vault-node",
                "type": "SecurityNode",
                "data": {"label": self.get_cloud_resource_name("vault"), "status": "active", "typeSubText": "HSM & Secret Vault"},
                "position": {"x": 80, "y": 360}
            })
            services.append({
                "name": self.get_cloud_resource_name("vault"),
                "category": "security",
                "description": "Hardware-backed storage for cryptographic keys, tokens, environment configs, and secrets."
            })
            edges.append({"id": "e-backend-vault", "source": "backend-node", "target": "vault-node", "animated": True})

        # 10. Monitoring layer
        if requires_monitoring:
            nodes.append({
                "id": "monitoring-node",
                "type": "MonitoringNode",
                "data": {"label": self.get_cloud_resource_name("monitoring"), "status": "active", "typeSubText": "Log Analytics"},
                "position": {"x": 420, "y": 420}
            })
            services.append({
                "name": self.get_cloud_resource_name("monitoring"),
                "category": "monitoring",
                "description": "Aggregated application telemetry, performance metrics, and network activity collection."
            })
            edges.append({"id": "e-backend-monitoring", "source": "backend-node", "target": "monitoring-node", "animated": False})

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
