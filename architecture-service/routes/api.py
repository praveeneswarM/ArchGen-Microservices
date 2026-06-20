import asyncio
import json
import logging
import re
import uuid
from typing import Dict, Any, List

from fastapi import APIRouter, HTTPException, Request

# Shared schemas
from models.schemas import (
    RequirementInput,
    ArchitectureResponse,
    TerraformRequest,
    TerraformResponse,
    AiAssistRequest,
)

# Core engines
from terraform.engine import TerraformEngine
from utils.reasoning_engine import InfrastructureReasoningEngine
from utils.cache_manager import CacheManager
from utils.performance_logger import PerformanceLogger

# Agent imports (Only for enrichment)
from agents.security_optimization import SecurityOptimizationAgent
from agents.complexity_auditor import ComplexityAuditorAgent
from agents.cost_optimization import CostOptimizationAgent
from agents.architecture_explanation import ArchitectureExplanationAgent

logger = logging.getLogger('api_routes')
router = APIRouter()
tf_engine = TerraformEngine()
cache_manager = CacheManager()
perf_logger = PerformanceLogger()

from utils.provider_manager import ProviderManager
from typing import List, Dict, Any

def ensure_container_nodes(nodes: List[Dict[str, Any]], provider: str, requirements: Any) -> List[Dict[str, Any]]:
    node_ids = {str(n.get("id")).lower() for n in nodes if n.get("id")}
    
    compute_type = "AKS"
    if requirements:
        compute_type = getattr(requirements, "computeType", None) or getattr(requirements, "application_type", None) or "AKS"
    
    containers = [
        {
            "id": "region-group",
            "type": "RegionGroupNode",
            "parentNode": None,
            "position": {"x": 0.0, "y": 0.0},
            "style": {"width": 2900.0, "height": 2280.0},
            "data": {"label": f"Cloud Region: {requirements.region.upper() if requirements.region else 'EAST US'}", "provider": provider, "resource_type": "region"}
        },
        {
            "id": "rg-group",
            "type": "ResourceGroupNode",
            "parentNode": "region-group",
            "position": {"x": 30.0, "y": 45.0},
            "style": {"width": 2840.0, "height": 2190.0},
            "data": {"label": f"Resource Scope: {requirements.resourceGroup or 'rg-production'}", "provider": provider, "resource_type": "resourcegroup"}
        },
        {
            "id": "vnet-group",
            "type": "VNetGroupNode",
            "parentNode": "rg-group",
            "position": {"x": 30.0, "y": 45.0},
            "style": {"width": 2780.0, "height": 2100.0},
            "data": {"label": f"Virtual Network (VPC): {requirements.vnetCIDR or '10.0.0.0/16'}", "provider": provider, "resource_type": "vnet"}
        },
        {
            "id": "subnet-ingress",
            "type": "SubnetGroupNode",
            "parentNode": "vnet-group",
            "position": {"x": 40.0, "y": 60.0},
            "style": {"width": 2180.0, "height": 280.0},
            "data": {"label": "Ingress Subnet (10.0.1.0/24)", "subnet": "subnet-ingress", "provider": provider, "resource_type": "subnet"}
        },
        {
            "id": "subnet-mgmt",
            "type": "SubnetGroupNode",
            "parentNode": "vnet-group",
            "position": {"x": 40.0, "y": 380.0},
            "style": {"width": 2180.0, "height": 280.0},
            "data": {"label": "Management Subnet (10.0.4.0/24)", "subnet": "subnet-mgmt", "provider": provider, "resource_type": "subnet"}
        },
        {
            "id": "subnet-pe",
            "type": "SubnetGroupNode",
            "parentNode": "vnet-group",
            "position": {"x": 40.0, "y": 1620.0},
            "style": {"width": 2180.0, "height": 420.0},
            "data": {"label": "Private Endpoint Subnet (10.0.5.0/24)", "subnet": "subnet-pe", "provider": provider, "resource_type": "subnet"}
        },
        {
            "id": "subnet-app",
            "type": "SubnetGroupNode",
            "parentNode": "vnet-group",
            "position": {"x": 40.0, "y": 700.0},
            "style": {"width": 2180.0, "height": 420.0},
            "data": {"label": "Application Subnet (10.0.2.0/24)", "subnet": "subnet-app", "provider": provider, "resource_type": "subnet"}
        },
        {
            "id": "subnet-data",
            "type": "SubnetGroupNode",
            "parentNode": "vnet-group",
            "position": {"x": 40.0, "y": 1160.0},
            "style": {"width": 2180.0, "height": 420.0},
            "data": {"label": "Data Subnet (10.0.3.0/24)", "subnet": "subnet-data", "provider": provider, "resource_type": "subnet"}
        },
        {
            "id": "shared-services-group",
            "type": "SubnetGroupNode",
            "parentNode": "vnet-group",
            "position": {"x": 2200.0, "y": 60.0},
            "style": {"width": 500.0, "height": 1200.0},
            "data": {"label": "Shared Services Group", "provider": provider, "resource_type": "subnet"}
        }
    ]

    if str(compute_type).upper() == "AKS":
        containers.append({
            "id": "aks-cluster-group",
            "type": "SubnetGroupNode",
            "parentNode": "subnet-app",
            "position": {"x": 350.0, "y": 40.0},
            "style": {"width": 1780.0, "height": 340.0},
            "data": {"label": "AKS Cluster Group", "provider": provider, "resource_type": "subnet"}
        })

    container_parent_map = {
        "region-group": None,
        "rg-group": "region-group",
        "vnet-group": "rg-group",
        "subnet-ingress": "vnet-group",
        "subnet-mgmt": "vnet-group",
        "subnet-pe": "vnet-group",
        "subnet-app": "vnet-group",
        "subnet-data": "vnet-group",
        "shared-services-group": "vnet-group",
        "aks-cluster-group": "subnet-app"
    }

    nodes_map = {str(n.get("id")).lower(): n for n in nodes if n.get("id")}
    injected = list(nodes)

    for container in containers:
        c_id = container["id"]
        c_id_lower = c_id.lower()
        if c_id_lower not in node_ids:
            injected.insert(0, container)
            nodes_map[c_id_lower] = container
        else:
            existing_node = nodes_map[c_id_lower]
            existing_node["parentNode"] = container_parent_map[c_id]
            existing_node["position"] = container["position"]
            existing_node["style"] = container["style"]
            
    return injected


def post_process_nodes(nodes: List[Dict[str, Any]], provider: str, requirements: Any) -> List[Dict[str, Any]]:
    # Post-process live/enhanced/deterministic topology to enforce user's custom inputs
    try:
        vnet_cidr_val = requirements.vnetCIDR or "10.0.0.0/16"
        ip_prefix = "10.0"
        match_cidr = re.match(r"^(\d+\.\d+)", vnet_cidr_val)
        if match_cidr:
            ip_prefix = match_cidr.group(1)

        reasoning_engine = InfrastructureReasoningEngine(cloud_provider=provider, requirements=requirements)
        compute_name = reasoning_engine.get_cloud_resource_name(requirements.computeType or "AKS")
        db_name = reasoning_engine.get_cloud_resource_name(requirements.database_type or "PostgreSQL")

        for node in nodes:
            n_id = str(node.get("id", "")).lower()
            n_type = str(node.get("type", ""))
            
            # Fallback type mapping for unregistered node types (blank rectangles fix)
            ALLOWED_TYPES = {
                "GatewayNode", "FrontendNode", "BackendNode", "DatabaseNode", "CacheNode", 
                "StorageNode", "SecurityNode", "MonitoringNode", "RegionGroupNode", 
                "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"
            }
            if n_type not in ALLOWED_TYPES:
                lbl_lower = str(node.get("data", {}).get("label", "")).lower()
                mapped_type = "BackendNode"
                if "pe-" in n_id or "private endpoint" in lbl_lower or "private-endpoint" in lbl_lower:
                    mapped_type = "SecurityNode"
                elif "backup" in n_id or "backup" in lbl_lower:
                    mapped_type = "StorageNode"
                elif "recovery" in n_id or "recovery" in lbl_lower:
                    mapped_type = "SecurityNode"
                elif any(x in n_id or x in lbl_lower for x in ["vault", "keyvault", "identity", "role", "waf", "ddos"]):
                    mapped_type = "SecurityNode"
                elif any(x in n_id or x in lbl_lower for x in ["db-", "database", "postgres", "mysql", "sql", "cosmos"]):
                    mapped_type = "DatabaseNode"
                elif any(x in n_id or x in lbl_lower for x in ["redis", "cache"]):
                    mapped_type = "CacheNode"
                elif any(x in n_id or x in lbl_lower for x in ["storage", "blob", "bucket"]):
                    mapped_type = "StorageNode"
                elif any(x in n_id or x in lbl_lower for x in ["log-analytics", "insights", "monitor", "alert", "diagnostic"]):
                    mapped_type = "MonitoringNode"
                elif any(x in n_id or x in lbl_lower for x in ["gateway", "firewall", "ingress", "loadbalancer", "lb"]):
                    mapped_type = "GatewayNode"
                elif any(x in n_id or x in lbl_lower for x in ["frontend", "web", "spa"]):
                    mapped_type = "FrontendNode"
                
                node["type"] = mapped_type
                n_type = mapped_type

            # A. Update Region Node Label
            if n_type == "RegionGroupNode" or "region" in n_id:
                node["data"] = node.get("data") or {}
                node["data"]["label"] = f"Cloud Region: {requirements.region.upper() if requirements.region else 'EAST US'}"
                
            # B. Update Resource Group Node Label
            elif n_type == "ResourceGroupNode" or "rg-" in n_id or n_id == "rg-group":
                node["data"] = node.get("data") or {}
                node["data"]["label"] = f"Resource Scope: {requirements.resourceGroup or 'rg-production'}"
                
            # C. Update Virtual Network Node Label
            elif n_type == "VNetGroupNode" or "vnet" in n_id or "vpc" in n_id:
                node["data"] = node.get("data") or {}
                node["data"]["label"] = f"Virtual Network (VPC): {vnet_cidr_val}"
                
            # D. Update Subnet Node Labels
            elif n_type == "SubnetGroupNode" or "subnet" in n_id:
                node["data"] = node.get("data") or {}
                lbl = str(node["data"].get("label", "")).lower()
                if "ingress" in n_id or "ingress" in lbl:
                    node["data"]["label"] = f"Ingress Subnet ({ip_prefix}.1.0/24)"
                elif "mgmt" in n_id or "mgmt" in lbl or "management" in lbl:
                    node["data"]["label"] = f"Management Subnet ({ip_prefix}.4.0/24)"
                elif "pe" in n_id or "pe" in lbl or "private endpoint" in lbl or "private-endpoint" in lbl:
                    node["data"]["label"] = f"Private Endpoint Subnet ({ip_prefix}.5.0/24)"
                elif "app" in n_id or "app" in lbl or "application" in lbl:
                    node["data"]["label"] = f"Application Subnet ({ip_prefix}.2.0/24)"
                elif "data" in n_id or "data" in lbl or "database" in lbl:
                    node["data"]["label"] = f"Data Subnet ({ip_prefix}.3.0/24)"
                    
            # E. Update Compute engine Node Label
            elif n_id in ["aks-cluster", "compute", "cluster"] or (n_type == "BackendNode" and "cluster" in n_id and not any(x in n_id for x in ["pool", "ingress", "controller", "system", "user", "svc-"])):
                node["data"] = node.get("data") or {}
                node["data"]["label"] = f"{compute_name} Engine"
                
            # F. Update Primary/Replica DB Node Labels
            elif n_id == "db-primary" or n_id == "database" or (n_type == "DatabaseNode" and "replica" not in n_id):
                node["data"] = node.get("data") or {}
                node["data"]["label"] = db_name
                
            # G. Update DB Replica Node Label
            elif n_id == "db-replica" or (n_type == "DatabaseNode" and "replica" in n_id):
                node["data"] = node.get("data") or {}
                node["data"]["label"] = f"{db_name} Replica"
    except Exception as pe:
        logger.warning(f"Failed to post-process node labels: {pe}")
        
    # Ensure position, style, and data dictionary structures exist to prevent frontend crash
    container_defaults = {
        "region-group": {"x": 0.0, "y": 0.0},
        "rg-group": {"x": 30.0, "y": 45.0},
        "vnet-group": {"x": 30.0, "y": 45.0},
        "subnet-ingress": {"x": 40.0, "y": 60.0},
        "subnet-mgmt": {"x": 40.0, "y": 380.0},
        "subnet-app": {"x": 40.0, "y": 700.0},
        "subnet-data": {"x": 40.0, "y": 1160.0},
        "subnet-pe": {"x": 40.0, "y": 1620.0},
        "shared-services-group": {"x": 2200.0, "y": 60.0},
        "aks-cluster-group": {"x": 350.0, "y": 40.0}
    }

    compute_type = "AKS"
    if requirements:
        compute_type = getattr(requirements, "computeType", None) or getattr(requirements, "application_type", None) or "AKS"

    for idx, node in enumerate(nodes):
        node['data'] = node.get('data') or {}
        n_id = str(node.get("id", ""))
        n_id_lower = n_id.lower()
        lbl_lower = str(node['data'].get("label", "")).lower()
        n_type = str(node.get("type", ""))

        if 'position' not in node or not isinstance(node['position'], dict):
            node['position'] = {'x': float((idx % 5) * 200), 'y': float((idx // 5) * 150)}

        # Coordinate healing for container groups themselves
        if n_id_lower in container_defaults:
            pos = node.get("position", {})
            try:
                x_val = float(pos.get("x", 0) if pos.get("x") is not None else 0)
                y_val = float(pos.get("y", 0) if pos.get("y") is not None else 0)
            except (ValueError, TypeError):
                x_val, y_val = 0.0, 0.0
            
            default_pos = container_defaults[n_id_lower]
            if abs(x_val - default_pos["x"]) > 500 or abs(y_val - default_pos["y"]) > 500:
                node["position"] = dict(default_pos)
            continue

        # Force snap parentNode based on resource type / category
        is_shared = (
            "keyvault" in n_id_lower or "vault" in n_id_lower or
            "log-analytics" in n_id_lower or "log analytics" in lbl_lower or
            "app-insights" in n_id_lower or "app insights" in lbl_lower or
            "azure-monitor" in n_id_lower or "azure monitor" in lbl_lower or
            "backup-vault" in n_id_lower or "backup vault" in lbl_lower or
            "recovery-vault" in n_id_lower or "recovery services vault" in lbl_lower or
            "alerts" in n_id_lower or "alert" in lbl_lower or
            "diagnostic" in n_id_lower or "diagnostic" in lbl_lower or
            "acr" in n_id_lower or "acr" in lbl_lower or
            "cost-management" in n_id_lower or "cost management" in lbl_lower
        ) and not any(x in n_id_lower or x in lbl_lower for x in ["pe-", "private endpoint", "private-endpoint", "backup-policy"])

        is_pe = ("pe-" in n_id_lower or "private endpoint" in lbl_lower or "private-endpoint" in lbl_lower) and n_type != "SubnetGroupNode"
        
        is_storage_resource = (
            n_type in ["DatabaseNode", "CacheNode", "StorageNode"] or
            any(db_kw in n_id_lower or db_kw in lbl_lower for db_kw in ["db-", "database", "postgresql", "mysql", "redis", "storage-account", "blob", "replica"])
        ) and not is_pe and n_id_lower not in ["backup-vault", "recovery-vault"]

        is_ingress_resource = any(x in n_id_lower or x in lbl_lower for x in ["app-gateway", "appgw", "azure-firewall", "firewall", "front-door", "frontdoor", "waf-policy", "waf"]) and not is_pe and not is_shared

        is_compute_resource = any(x in n_id_lower for x in ["svc-", "aks-", "cluster", "pool", "ingress-controller"])

        is_mgmt_resource = any(x in n_id_lower or x in lbl_lower for x in ["bastion", "jumpbox", "managed-identity", "role-assignment", "firewall-policy"]) and not is_shared

        if is_shared:
            node["parentNode"] = "shared-services-group"
        elif is_pe:
            node["parentNode"] = "subnet-pe"
        elif is_storage_resource:
            node["parentNode"] = "subnet-data"
        elif is_ingress_resource:
            node["parentNode"] = "subnet-ingress"
        elif is_compute_resource:
            if str(compute_type).upper() == "AKS":
                node["parentNode"] = "aks-cluster-group"
            else:
                node["parentNode"] = "subnet-app"
        elif is_mgmt_resource:
            node["parentNode"] = "subnet-mgmt"

        # Apply specific coordinate mappings relative to parents to avoid overlaps
        parent = node.get("parentNode")
        node["data"]["subnet"] = parent or ""

        if parent == "aks-cluster-group":
            aks_positions = {
                "aks-cluster": {"x": 10.0, "y": 20.0},
                "aks-system-node-pool": {"x": 10.0, "y": 120.0},
                "aks-system": {"x": 10.0, "y": 120.0},
                "aks-user-node-pool": {"x": 10.0, "y": 220.0},
                "aks-user": {"x": 10.0, "y": 220.0},
                "aks-ingress-controller": {"x": 300.0, "y": 20.0},
                "svc-api-gateway": {"x": 300.0, "y": 120.0},
                "aks-hpa": {"x": 300.0, "y": 220.0},
                "svc-auth": {"x": 590.0, "y": 20.0},
                "svc-product": {"x": 590.0, "y": 120.0},
                "svc-order": {"x": 880.0, "y": 20.0},
                "svc-payment": {"x": 880.0, "y": 120.0},
                "svc-inventory": {"x": 1170.0, "y": 20.0},
                "svc-notification": {"x": 1170.0, "y": 120.0},
            }
            pos_assigned = False
            for kw, default_pos in aks_positions.items():
                if kw in n_id_lower:
                    node["position"] = dict(default_pos)
                    pos_assigned = True
                    break
            if not pos_assigned:
                node["position"] = {"x": 1460.0, "y": float(20 + (idx % 3) * 100)}

        elif parent == "shared-services-group":
            y_map = {
                "keyvault": 60.0,
                "log-analytics": 160.0,
                "app-insights": 260.0,
                "azure-monitor": 360.0,
                "alerts": 460.0,
                "diagnostic-settings": 560.0,
                "backup-vault": 660.0,
                "recovery-vault": 760.0,
                "acr": 860.0,
                "cost-management": 960.0
            }
            default_y = 60.0
            for kw, y_pos in y_map.items():
                if kw in n_id_lower or kw in lbl_lower:
                    default_y = y_pos
                    break
            node["position"] = {"x": 50.0, "y": default_y}

        elif parent and parent.startswith("subnet-"):
            pos = node.get("position", {})
            try:
                x_val = float(pos.get("x", 0) if pos.get("x") is not None else 0)
                y_val = float(pos.get("y", 0) if pos.get("y") is not None else 0)
            except (ValueError, TypeError):
                x_val, y_val = 0.0, 0.0
            
            if x_val < 0 or x_val > 1800 or y_val < 0 or y_val > 600:
                node["position"] = {"x": float(30 + (idx % 4) * 250), "y": float(60 + (idx // 4) * 110)}

        # Metadata Normalization: strip customMetadata from infrastructure nodes
        is_infra = False
        if (
            "nsg" in n_id_lower or "nsg" in lbl_lower or 
            "rt-" in n_id_lower or "-rt" in n_id_lower or "route table" in lbl_lower or "route-table" in lbl_lower or
            "keyvault" in n_id_lower or "vault" in n_id_lower or
            "pe-" in n_id_lower or "private endpoint" in lbl_lower or "private-endpoint" in lbl_lower or
            "role-assignment" in n_id_lower or "role assignment" in lbl_lower or
            n_type in ["SecurityNode", "MonitoringNode"]
        ):
            is_infra = True

        if is_infra and "customMetadata" in node['data']:
            node['data'].pop("customMetadata", None)

        if 'style' not in node or not isinstance(node['style'], dict):
            node['style'] = {}
            
        if 'provider' not in node['data']:
            node['data']['provider'] = provider
        if 'subnet' not in node['data']:
            node['data']['subnet'] = node.get('parentNode', '')
        if 'resource_type' not in node['data']:
            node['data']['resource_type'] = str(node.get('type', 'resource')).lower()
        if 'cost' not in node['data']:
            node['data']['cost'] = "~$25/mo"
        if 'estimated_monthly_cost' not in node['data']:
            node['data']['estimated_monthly_cost'] = 25.0
        if 'public' not in node['data']:
            node['data']['public'] = False
        if 'private' not in node['data']:
            node['data']['private'] = True
            
    return nodes


def rebuild_services_registry(nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Map node types to service categories
    category_map = {
        "GatewayNode": "gateway",
        "FrontendNode": "frontend",
        "BackendNode": "backend",
        "DatabaseNode": "database",
        "CacheNode": "cache",
        "StorageNode": "storage",
        "SecurityNode": "security",
        "MonitoringNode": "monitoring",
    }
    services = []
    seen = set()
    for node in nodes:
        n_type = node.get("type")
        if n_type in ["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"]:
            continue
        
        node_id = node.get("id")
        if not node_id:
            continue
            
        label = node.get("data", {}).get("label") or node_id
        service_name = label
        
        if service_name.lower() in seen:
            continue
            
        seen.add(service_name.lower())
        
        category = category_map.get(n_type, "infrastructure")
        description = f"Managed {label} resource deployed in the topology."
        
        services.append({
            "name": service_name,
            "category": category,
            "description": description
        })
    return services


def deduplicate_shared_resources(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> tuple:
    # Categories and matchers for global env-wide shared resources
    categories = {
        "front-door": lambda nid, lbl: ("frontdoor" in nid or "front-door" in nid or "front door" in lbl) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"]),
        "ddos-protection": lambda nid, lbl: ("ddos" in nid or "ddos" in lbl) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"]),
        "waf-policy": lambda nid, lbl: ("waf" in nid or "waf" in lbl) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"]),
        "app-gateway": lambda nid, lbl: ("app-gateway" in nid or "app gateway" in lbl or "appgw" in nid) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"]),
        "azure-firewall": lambda nid, lbl: ("firewall" in nid or "firewall" in lbl) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint", "policy"]),
        "keyvault": lambda nid, lbl: ("vault" in nid or "keyvault" in nid or "vault" in lbl or "key vault" in lbl) and not any(x in nid or x in lbl for x in ["backup", "recovery", "pe-kv", "pe-", "private-endpoint", "private endpoint"]),
        "azure-monitor": lambda nid, lbl: ("monitor" in nid or "monitor" in lbl) and not any(x in nid or x in lbl for x in ["log-analytics", "log analytics", "app-insights", "app insights", "insights", "alerts", "diagnostic", "pe-", "private-endpoint", "private endpoint"]),
        "log-analytics": lambda nid, lbl: ("log-analytics" in nid or "log analytics" in lbl or "loganalytics" in nid) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"]),
        "app-insights": lambda nid, lbl: ("app-insights" in nid or "app insights" in lbl or "insights" in nid or "insights" in lbl) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"]),
        "backup-vault": lambda nid, lbl: ("backup-vault" in nid or "backup vault" in lbl) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"]),
        "recovery-vault": lambda nid, lbl: ("recovery-vault" in nid or "recovery services vault" in lbl or "recovery-services-vault" in nid) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"]),
        "storage-account": lambda nid, lbl: ("storage-account" in nid or "storage account" in lbl or "blob" in nid or "blob" in lbl) and not any(x in nid or x in lbl for x in ["replica", "pe-", "private-endpoint", "private endpoint", "backup", "container"]),
        "acr": lambda nid, lbl: ("acr" in nid or "container-registry" in nid or "container registry" in lbl) and not any(x in nid or x in lbl for x in ["pe-", "private-endpoint", "private endpoint"])
    }
    
    retained_nodes = {}  # category -> node_id
    nodes_to_remove = set()
    node_id_map = {}     # duplicate_node_id -> retained_node_id
    
    # First pass: identify duplicates
    for node in nodes:
        n_type = node.get("type", "")
        if n_type in ["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode", "shared-services-group", "aks-cluster-group"]:
            continue
        nid = str(node.get("id", "")).lower()
        lbl = str(node.get("data", {}).get("label", "")).lower()
        
        matched_category = None
        for cat, matcher in categories.items():
            if matcher(nid, lbl):
                matched_category = cat
                break
        
        if matched_category:
            if matched_category in retained_nodes:
                nodes_to_remove.add(node.get("id"))
                node_id_map[node.get("id")] = retained_nodes[matched_category]
            else:
                retained_nodes[matched_category] = node.get("id")
                
    if not nodes_to_remove:
        return nodes, edges
        
    new_nodes = [n for n in nodes if n.get("id") not in nodes_to_remove]
    
    new_edges = []
    seen_edges = set()
    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        
        new_src = node_id_map.get(src, src)
        new_tgt = node_id_map.get(tgt, tgt)
        
        if new_src == new_tgt:
            continue
        edge_key = (new_src, new_tgt)
        if edge_key in seen_edges:
            continue
            
        seen_edges.add(edge_key)
        new_edge = dict(edge)
        new_edge["source"] = new_src
        new_edge["target"] = new_tgt
        new_edge["id"] = f"e-{new_src}-{new_tgt}"
        new_edges.append(new_edge)
        
    return new_nodes, new_edges


def _count_real_subnets(nodes: List[Dict[str, Any]]) -> int:
    """Count only the 5 real subnet nodes (ingress, app, data, mgmt, pe), excluding container groups like shared-services-group and aks-cluster-group."""
    CONTAINER_GROUP_IDS = {"shared-services-group", "aks-cluster-group"}
    return len([
        n for n in nodes
        if n.get("type") == "SubnetGroupNode" and str(n.get("id", "")).lower() not in CONTAINER_GROUP_IDS
    ])


def validate_and_gate_architecture(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], complexity_warnings: List[str] = None, compute_type: str = None, database_type: str = None) -> List[str]:
    if complexity_warnings is None:
        complexity_warnings = []
    
    validation_findings = []
    consistency_warnings = []
    
    node_ids = set(n.get("id") for n in nodes)
    node_labels = set(str(n.get("data", {}).get("label", "")).lower() for n in nodes)
    node_types = set(n.get("type") for n in nodes)
    subnet_count = _count_real_subnets(nodes)
    
    # 1. Quality Gate Checks
    # Validate node count
    if len(nodes) < 25:
        validation_findings.append(f"Quality Gate: Node count {len(nodes)} is less than 25.")

    # Validate edge count
    if len(edges) < 35:
        validation_findings.append(f"Quality Gate: Edge count {len(edges)} is less than 35.")

    # Validate microservices >= 5
    microservices = [n for n in nodes if str(n.get("id", "")).lower().startswith("svc-")]
    if len(microservices) < 5:
        validation_findings.append(f"Quality Gate: Microservices count {len(microservices)} is less than 5.")

    # Validate nsg_count == subnet_count
    nsg_count = len([
        n for n in nodes 
        if "nsg" in str(n.get("id")).lower() or "nsg" in str(n.get("data", {}).get("label", "")).lower()
    ])
    if nsg_count != subnet_count:
        validation_findings.append(f"Quality Gate: NSG count ({nsg_count}) does not match subnet count ({subnet_count}).")

    # Validate route_table_count == subnet_count
    rt_count = len([
        n for n in nodes 
        if "rt-" in str(n.get("id")).lower() or "-rt" in str(n.get("id")).lower() or "route table" in str(n.get("data", {}).get("label", "")).lower() or "route-table" in str(n.get("data", {}).get("label", "")).lower()
    ])
    if rt_count != subnet_count:
        validation_findings.append(f"Quality Gate: Route Table count ({rt_count}) does not match subnet count ({subnet_count}).")

    # Validate VNet exists
    has_vnet = "VNetGroupNode" in node_types or any("vnet" in nid.lower() or "vpc" in nid.lower() for nid in node_ids)
    if not has_vnet:
        validation_findings.append("Quality Gate: VNet/VPC group node is missing.")

    # Validate all selected subnets exist (Ingress, App, Data, Mgmt, PE)
    required_subnets = ["ingress", "app", "data", "mgmt", "pe"]
    existing_subnets = [nid.lower() for nid in node_ids if "subnet" in nid.lower() or "snet" in nid.lower()]
    for rs in required_subnets:
        if not any(rs in es for es in existing_subnets):
            validation_findings.append(f"Quality Gate: Subnet '{rs}' is missing.")

    # Validate Monitoring exists
    has_monitoring = any(t == "MonitoringNode" or "monitor" in nid.lower() or "insights" in nid.lower() or "analytics" in nid.lower() for nid, t in zip(node_ids, node_types))
    if not has_monitoring:
        validation_findings.append("Quality Gate: Monitoring resources are missing.")

    # Validate Backup exists
    has_backup = any("backup" in nid.lower() or "recovery" in nid.lower() or "vault" in nid.lower() and "key" not in nid.lower() for nid in node_ids)
    if not has_backup:
        validation_findings.append("Quality Gate: Backup Vault/Recovery resources are missing.")

    # Validate Private Endpoints exist
    has_pe = any("pe-" in nid.lower() or "private endpoint" in lbl or "private-endpoint" in lbl or "pe_" in nid.lower() for nid, lbl in zip(node_ids, node_labels))
    if not has_pe:
        validation_findings.append("Quality Gate: Private Endpoint resources are missing.")

    # Validate Security resources exist (e.g. Key Vault)
    has_security = any(t == "SecurityNode" or "vault" in nid.lower() or "key" in nid.lower() for nid, t in zip(node_ids, node_types))
    if not has_security:
        validation_findings.append("Quality Gate: Security vault/secrets resources are missing.")

    # 1a. V3 Gating Enhancements - Singleton Resource Deduplication Checks
    kv_count = len([n for n in nodes if ("vault" in str(n.get("id")).lower() or "keyvault" in str(n.get("id")).lower() or "key vault" in str(n.get("data", {}).get("label", "")).lower()) and not any(x in str(n.get("id")).lower() for x in ["backup", "recovery", "pe-kv", "pe-"])])
    if kv_count > 1:
        validation_findings.append(f"Quality Gate: Duplicate shared Key Vault detected ({kv_count} instances).")

    law_count = len([n for n in nodes if "log-analytics" in str(n.get("id")).lower() or "log analytics" in str(n.get("data", {}).get("label", "")).lower() or "loganalytics" in str(n.get("id")).lower()])
    if law_count > 1:
        validation_findings.append(f"Quality Gate: Duplicate shared Log Analytics Workspace detected ({law_count} instances).")

    mon_count = len([n for n in nodes if ("monitor" in str(n.get("id")).lower() or "monitor" in str(n.get("data", {}).get("label", "")).lower()) and not any(x in str(n.get("id")).lower() for x in ["log-analytics", "log analytics", "app-insights", "app insights", "insights", "alerts", "diagnostic"])])
    if mon_count > 1:
        validation_findings.append(f"Quality Gate: Duplicate shared Azure Monitor detected ({mon_count} instances).")

    ai_count = len([n for n in nodes if "app-insights" in str(n.get("id")).lower() or "app insights" in str(n.get("data", {}).get("label", "")).lower() or "insights" in str(n.get("id")).lower()])
    if ai_count > 1:
        validation_findings.append(f"Quality Gate: Duplicate shared Application Insights detected ({ai_count} instances).")

    bv_count = len([n for n in nodes if "backup-vault" in str(n.get("id")).lower() or "backup vault" in str(n.get("data", {}).get("label", "")).lower()])
    if bv_count > 1:
        validation_findings.append(f"Quality Gate: Duplicate shared Backup Vault detected ({bv_count} instances).")

    rv_count = len([n for n in nodes if "recovery-vault" in str(n.get("id")).lower() or "recovery services vault" in str(n.get("data", {}).get("label", "")).lower()])
    if rv_count > 1:
        validation_findings.append(f"Quality Gate: Duplicate shared Recovery Services Vault detected ({rv_count} instances).")

    # Fail validation if subnet-pe is empty
    pe_subnet_nodes = [n for n in nodes if n.get("parentNode") == "subnet-pe"]
    if len(pe_subnet_nodes) == 0:
        validation_findings.append("Quality Gate: Private Endpoint Subnet ('subnet-pe') is empty.")

    # Fail validation if node renderer cannot resolve a node type
    ALLOWED_TYPES = {
        "GatewayNode", "FrontendNode", "BackendNode", "DatabaseNode", "CacheNode", 
        "StorageNode", "SecurityNode", "MonitoringNode", "RegionGroupNode", 
        "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"
    }
    for node in nodes:
        n_type = node.get("type")
        if n_type not in ALLOWED_TYPES:
            validation_findings.append(f"Quality Gate: Node renderer cannot resolve node type '{n_type}' for node '{node.get('id')}'.")

    # 1b. Resource Selection Locking (compute platform + database platform)
    if compute_type:
        compute_upper = str(compute_type).upper().replace("_", " ").replace("-", " ")
        AKS_FORBIDDEN = {"app-service-plan", "web-app", "container-app-env"}
        APPSERVICE_FORBIDDEN = {"aks-cluster", "aks-system-node-pool", "aks-user-node-pool", "aks-ingress-controller", "aks-hpa", "container-app-env"}
        CONTAINERAPPS_FORBIDDEN = {"aks-cluster", "aks-system-node-pool", "aks-user-node-pool", "aks-ingress-controller", "aks-hpa", "app-service-plan", "web-app"}

        if "AKS" in compute_upper or "KUBERNETES" in compute_upper:
            forbidden = AKS_FORBIDDEN
            locked_platform = "AKS"
        elif "APP SERVICE" in compute_upper or "WEB APP" in compute_upper:
            forbidden = APPSERVICE_FORBIDDEN
            locked_platform = "App Service"
        else:
            forbidden = CONTAINERAPPS_FORBIDDEN
            locked_platform = "Container Apps"

        for n in nodes:
            nid = str(n.get("id", "")).lower()
            if nid in forbidden:
                validation_findings.append(f"Resource Locking: Compute platform is locked to '{locked_platform}', but forbidden resource '{nid}' was generated. Substitution detected.")

    # 1c. Edge Source/Target Existence Validation
    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        if src not in node_ids:
            consistency_warnings.append(f"Edge Validation: Edge '{edge.get('id')}' references non-existent source node '{src}'.")
        if tgt not in node_ids:
            consistency_warnings.append(f"Edge Validation: Edge '{edge.get('id')}' references non-existent target node '{tgt}'.")

    # 2. Consistency Gate Checks
    non_replica_labels = {}
    for node in nodes:
        n_id = str(node.get("id", ""))
        n_id_lower = n_id.lower()
        lbl = str(node.get("data", {}).get("label", ""))
        lbl_lower = lbl.lower()
        n_type = str(node.get("type", ""))

        # Check duplicate labels (excluding replica/standby)
        is_replica = "replica" in n_id_lower or "standby" in n_id_lower or "replica" in lbl_lower or "standby" in lbl_lower or "backup" in n_id_lower or "backup" in lbl_lower
        
        if not is_replica and n_type not in ["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"]:
            if lbl_lower in non_replica_labels:
                consistency_warnings.append(f"Consistency Gate: Duplicate node label '{lbl}' detected (node IDs: '{non_replica_labels[lbl_lower]}' and '{n_id}').")
            else:
                non_replica_labels[lbl_lower] = n_id

        # Check matching parentNode and subnet metadata
        parent = node.get("parentNode")
        subnet_meta = node.get("data", {}).get("subnet", "")
        if parent and parent.startswith("subnet-"):
            if subnet_meta.startswith("subnet-") and subnet_meta != parent:
                consistency_warnings.append(f"Consistency Gate: Node '{n_id}' has parentNode '{parent}' but subnet metadata '{subnet_meta}' mismatch.")
            elif "." in subnet_meta:
                parent_sub_type = parent.replace("subnet-", "")
                sub_cidr_map = {
                    "ingress": ".1.",
                    "app": ".2.",
                    "data": ".3.",
                    "mgmt": ".4.",
                    "pe": ".5."
                }
                expected_pattern = sub_cidr_map.get(parent_sub_type)
                if expected_pattern and expected_pattern not in subnet_meta:
                    consistency_warnings.append(f"Consistency Gate: Node '{n_id}' has parentNode '{parent}' but CIDR subnet metadata '{subnet_meta}' mismatch.")

        # Check correct subnet placement (Private Endpoints in subnet-pe, Storage in subnet-data)
        is_pe = ("pe-" in n_id_lower or "private endpoint" in lbl_lower or "private-endpoint" in lbl_lower) and n_type != "SubnetGroupNode"
        if is_pe:
            if parent != "subnet-pe":
                consistency_warnings.append(f"Consistency Gate: Private Endpoint '{n_id}' must live in 'subnet-pe'.")

        is_storage_resource = (
            n_type in ["DatabaseNode", "CacheNode", "StorageNode"] or
            any(db_kw in n_id_lower or db_kw in lbl_lower for db_kw in ["db-", "database", "postgresql", "mysql", "redis", "storage-account", "blob"])
        ) and not is_pe and parent != "vnet-group"
        if is_storage_resource:
            if parent != "subnet-data":
                consistency_warnings.append(f"Consistency Gate: Storage resource '{n_id}' must live in 'subnet-data'.")

    return validation_findings + consistency_warnings + complexity_warnings


# ==========================================
# PHASE 3: Dynamic Cost + Completeness Scores + AI Validation
# ==========================================

def compute_node_cost(node: Dict[str, Any], region: str = "eastus") -> float:
    """Compute monthly cost estimate for a single node based on its type, SKU, replicas, and storage."""
    n_type = str(node.get("type", ""))
    n_id = str(node.get("id", "")).lower()
    data = node.get("data", {})
    meta = data.get("customMetadata") or {}
    
    # Base cost catalog by node type
    base_costs = {
        "GatewayNode": 60.0,
        "FrontendNode": 30.0,
        "BackendNode": 75.0,
        "DatabaseNode": 115.0,
        "CacheNode": 45.0,
        "StorageNode": 25.0,
        "SecurityNode": 15.0,
        "MonitoringNode": 20.0,
    }
    
    # Skip group/container nodes
    if n_type in ("RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"):
        return 0.0
    
    base = base_costs.get(n_type, 25.0)
    
    # SKU tier adjustments
    tier = str(meta.get("pricingTier", "Standard"))
    if tier == "Premium":
        base *= 2.0
    elif tier == "Basic":
        base *= 0.5
    
    # Replica multiplier
    replicas = 1
    try:
        replicas = int(meta.get("maxReplicas", 1))
    except (ValueError, TypeError):
        pass
    if replicas > 1 and n_type == "BackendNode":
        base *= min(replicas, 5)  # cap at 5x for cost
    
    # Special overrides
    estimated = data.get("estimated_monthly_cost")
    if estimated and isinstance(estimated, (int, float)) and estimated > 0:
        return float(estimated)
    
    # NSG and Route Table nodes are free
    if any(x in n_id for x in ["nsg-", "rt-", "role-assignment", "managed-identity", "backup-policy"]):
        return 0.0
    
    return round(base, 2)


def compute_architecture_scores(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], warnings: List[str], provider: str = "azure") -> Dict[str, Any]:
    """
    Calculate 5 completeness scores:
    - security_score: Starts at 100, drops for missing vault, WAF, PE, NSGs
    - reliability_score: Drops for missing replicas, backup vaults
    - cost_efficiency_score: Based on total cost and overengineering
    - terraform_alignment_score: Drops for round-trip drift warnings
    - architecture_score: Weighted average of the above
    """
    node_ids_lower = {str(n.get("id", "")).lower() for n in nodes}
    node_labels_lower = {str(n.get("data", {}).get("label", "")).lower() for n in nodes}
    
    # Security Score
    sec_score = 100
    if not any("vault" in nid or "keyvault" in nid for nid in node_ids_lower):
        sec_score -= 20
    if not any("waf" in nid or "armor" in lbl for nid in node_ids_lower for lbl in node_labels_lower):
        sec_score -= 10
    if not any("pe-" in nid for nid in node_ids_lower):
        sec_score -= 15
    if not any("nsg" in nid for nid in node_ids_lower):
        sec_score -= 10
    if not any("ddos" in nid for nid in node_ids_lower):
        sec_score -= 5
    sec_score = max(0, sec_score)
    
    # Reliability Score
    rel_score = 100
    if not any("replica" in nid or "standby" in nid for nid in node_ids_lower):
        rel_score -= 20
    if not any("backup" in nid or "recovery" in nid for nid in node_ids_lower):
        rel_score -= 15
    if not any("hpa" in nid or "autoscaler" in lbl for nid in node_ids_lower for lbl in node_labels_lower):
        rel_score -= 10
    db_nodes = [n for n in nodes if n.get("type") == "DatabaseNode"]
    if len(db_nodes) < 2:
        rel_score -= 10
    rel_score = max(0, rel_score)
    
    # Cost Efficiency Score
    total_cost = sum(compute_node_cost(n) for n in nodes)
    cost_score = 100
    if total_cost > 2000:
        cost_score -= 15
    if total_cost > 5000:
        cost_score -= 15
    if len(nodes) > 60:
        cost_score -= 10  # potential overengineering
    cost_score = max(0, cost_score)
    
    # Terraform Alignment Score
    tf_score = 100
    tf_drift_warnings = [w for w in warnings if "Terraform Drift" in w]
    tf_score -= len(tf_drift_warnings) * 15
    tf_score = max(0, tf_score)
    
    # Architecture Score (weighted average)
    arch_score = int(
        sec_score * 0.30 +
        rel_score * 0.25 +
        cost_score * 0.20 +
        tf_score * 0.25
    )
    
    return {
        "security_score": sec_score,
        "reliability_score": rel_score,
        "cost_efficiency_score": cost_score,
        "terraform_alignment_score": tf_score,
        "architecture_score": arch_score,
        "total_estimated_cost": round(total_cost, 2)
    }


def run_ai_validation_agent(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], provider: str = "azure") -> List[str]:
    """
    Advisory AI Validation Agent that inspects the generated architecture topology
    and returns actionable recommendations (non-blocking warnings).
    """
    recommendations = []
    node_ids_lower = {str(n.get("id", "")).lower() for n in nodes}
    node_labels_lower = {str(n.get("data", {}).get("label", "")).lower() for n in nodes}
    
    # 1. Private Endpoint coverage
    pe_targets = set()
    for nid in node_ids_lower:
        if nid.startswith("pe-"):
            target = nid.replace("pe-", "")
            pe_targets.add(target)
    
    if "db-primary" in node_ids_lower and "db" not in pe_targets:
        recommendations.append("Advisory: Private Endpoint missing for PostgreSQL database. Consider adding PE-DB for secure connectivity.")
    if "redis" in node_ids_lower and "redis" not in pe_targets:
        recommendations.append("Advisory: Private Endpoint missing for Redis Cache. Consider adding PE-Redis for secure connectivity.")
    if "storage-account" in node_ids_lower and "storage" not in pe_targets:
        recommendations.append("Advisory: Private Endpoint missing for Storage Account. Consider adding PE-Storage for secure connectivity.")
    
    # 2. AKS best practices
    if "aks-cluster" in node_ids_lower:
        if "aks-hpa" not in node_ids_lower:
            recommendations.append("Advisory: AKS cluster should have Horizontal Pod Autoscaler (HPA) configured for production workloads.")
        if "acr" not in node_ids_lower:
            recommendations.append("Advisory: AKS cluster should use Azure Container Registry (ACR) for container image storage.")
        if not any("availability" in lbl or "zone" in lbl for lbl in node_labels_lower):
            recommendations.append("Advisory: AKS cluster should use Availability Zones for high availability in production.")
    
    # 3. Redis tier
    for n in nodes:
        nid = str(n.get("id", "")).lower()
        if nid == "redis" and n.get("type") == "CacheNode":
            meta = n.get("data", {}).get("customMetadata") or {}
            if meta.get("pricingTier") != "Premium":
                recommendations.append("Advisory: Redis should use Premium tier for HA features like persistence and geo-replication.")
    
    # 4. Database HA
    db_count = len([n for n in nodes if n.get("type") == "DatabaseNode"])
    has_replica = any("replica" in str(n.get("id", "")).lower() for n in nodes if n.get("type") == "DatabaseNode")
    if db_count > 0 and not has_replica:
        recommendations.append("Advisory: Database HA read-replica is missing. Deploy a standby replica for zero-downtime failover.")
    
    # 5. Monitoring completeness
    if "log-analytics" not in node_ids_lower:
        recommendations.append("Advisory: Log Analytics Workspace is missing. Centralized logging is essential for observability.")
    if "app-insights" not in node_ids_lower:
        recommendations.append("Advisory: Application Insights is missing. APM telemetry is critical for performance monitoring.")
    if "diagnostic-settings" not in node_ids_lower:
        recommendations.append("Advisory: Diagnostic Settings are missing. Enable diagnostics for AKS, databases, and gateways.")
    
    # 6. Backup coverage
    if "backup-vault" not in node_ids_lower and "recovery-vault" not in node_ids_lower:
        recommendations.append("Advisory: No Backup or Recovery Vault detected. Critical data should have automated backup policies.")
    
    # 7. Edge validation
    valid_node_ids = {str(n.get("id")) for n in nodes if n.get("id")}
    orphan_edges = [e for e in edges if e.get("source") not in valid_node_ids or e.get("target") not in valid_node_ids]
    if orphan_edges:
        recommendations.append(f"Advisory: {len(orphan_edges)} edge(s) reference non-existent nodes. Verify topology connectivity.")
    
    return recommendations


@router.get('/provider-status')
async def get_provider_status():
    manager = ProviderManager()
    provider = await manager.get_available_provider()
    return {
        "active_provider": provider.lower(),
        "model": manager.active_model,
        "fallback_count": len(manager.fallback_chain) if manager.fallback_chain else 0,
        "last_error": None # For now just return None
    }

@router.post('/generate-architecture', response_model=ArchitectureResponse)
async def generate_architecture(requirements: RequirementInput, request: Request):
    request_id = str(uuid.uuid4())
    start_time = asyncio.get_event_loop().time()
    provider = requirements.cloud_provider.lower()
    
    # 1. Check Cache
    cached = cache_manager.get(requirements)
    if cached:
        c_nodes = cached.get('nodes', [])
        if len(c_nodes) > 0:
            # Heal legacy/incomplete cached entry to ensure required containers exist
            c_nodes = ensure_container_nodes(c_nodes, cached.get('cloud_provider', provider), requirements)
            c_nodes = post_process_nodes(c_nodes, cached.get('cloud_provider', provider), requirements)
            
            c_edges = cached.get('edges', [])
            c_nodes, c_edges = deduplicate_shared_resources(c_nodes, c_edges)
            
            # Heal missing edges in the cached entry if edge count is low
            if len(c_edges) < 35:
                reasoning_engine = InfrastructureReasoningEngine(cloud_provider=provider, requirements=requirements)
                raw_topology = reasoning_engine.synthesize_from_intent()
                topology = reasoning_engine.normalize_topology(raw_topology)
                det_edges = topology.get('edges', [])
                
                c_node_ids = {str(n.get("id")).lower() for n in c_nodes if n.get("id")}
                existing_edge_keys = {
                    (str(e.get("source")).lower(), str(e.get("target")).lower())
                    for e in c_edges if e.get("source") and e.get("target")
                }
                
                merged_edges = list(c_edges)
                for det_edge in det_edges:
                    src = str(det_edge.get("source", "")).lower()
                    tgt = str(det_edge.get("target", "")).lower()
                    if src in c_node_ids and tgt in c_node_ids:
                        if (src, tgt) not in existing_edge_keys and (tgt, src) not in existing_edge_keys:
                            merged_edges.append(det_edge)
                            existing_edge_keys.add((src, tgt))
                c_edges = merged_edges
                cached['edges'] = c_edges
            
            valid_node_ids = {n.get("id") for n in c_nodes if n.get("id")}
            c_edges = [e for e in c_edges if e.get("source") in valid_node_ids and e.get("target") in valid_node_ids]

            cached['services'] = rebuild_services_registry(c_nodes)
            cached['warnings'] = validate_and_gate_architecture(c_nodes, c_edges, cached.get('warnings', []), compute_type=getattr(requirements, 'computeType', None), database_type=getattr(requirements, 'database_type', None))
            cached['nodes'] = c_nodes
            cached['node_count'] = len(c_nodes)
            cached['subnet_count'] = _count_real_subnets(c_nodes)
            cached['edge_count'] = len(c_edges)
            cached['edges'] = c_edges
            
            exec_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
            perf_logger.log(request_id, 'Cache', exec_ms / 1000.0, True, [], [])
            cached['execution_time_ms'] = exec_ms
            return ArchitectureResponse(**cached)

    # 2. Deterministic Engine (Primary Generator)
    llm_client = request.app.state.provider_manager
    provider = requirements.cloud_provider.lower()
    
    logger.info("Running Deterministic Engine as Primary Generator")
    reasoning_engine = InfrastructureReasoningEngine(cloud_provider=provider, requirements=requirements)
    workload = reasoning_engine.classify_workload(requirements.app_description, requirements.expected_users)
    raw_topology = reasoning_engine.synthesize_from_intent()
    topology = reasoning_engine.normalize_topology(raw_topology)
    
    nodes = topology.get('nodes', [])
    edges = topology.get('edges', [])
    services = topology.get('services', [])
    
    # 3. Optional AI Enhancement Layer
    ai_enhanced = False
    active_provider = getattr(llm_client, 'active_provider', 'None')
    
    if active_provider and active_provider.lower() not in ['none', 'mock']:
        try:
            from agents.requirement_analysis import RequirementAnalysisAgent
            from agents.architecture_planning import ArchitecturePlanningAgent
            
            req_agent = RequirementAnalysisAgent(client=llm_client)
            plan_agent = ArchitecturePlanningAgent(client=llm_client)
            
            logger.info("Starting AI Requirement Analysis (Optional AI Enhancement)")
            analysis = await req_agent.analyze(requirements)
            
            logger.info("Starting AI Architecture Planning (Optional AI Enhancement)")
            ai_topology = await plan_agent.plan(analysis)
            
            ai_nodes = ai_topology.get('nodes', [])
            ai_edges = ai_topology.get('edges', [])
            ai_services = ai_topology.get('services', [])
            
            if ai_nodes:
                # Start with deterministic topology baseline
                nodes = list(topology.get('nodes', []))
                services = list(topology.get('services', []))
                edges = list(topology.get('edges', []))
                
                det_node_ids = {str(n.get("id")).lower().strip() for n in nodes if n.get("id")}
                
                # Identify resources in deterministic baseline
                has_det_db = any(
                    n.get("type") == "DatabaseNode" or 
                    any(x in str(n.get("id")).lower() for x in ["db-", "database", "postgres", "mysql", "sql", "cosmos"])
                    for n in nodes
                )
                has_det_cache = any(
                    n.get("type") == "CacheNode" or 
                    any(x in str(n.get("id")).lower() for x in ["redis", "cache"])
                    for n in nodes
                )
                has_det_kv = any("vault" in str(n.get("id")).lower() or "keyvault" in str(n.get("id")).lower() for n in nodes if not any(x in str(n.get("id")).lower() for x in ["backup", "recovery", "pe-"]))
                has_det_law = any("log-analytics" in str(n.get("id")).lower() or "loganalytics" in str(n.get("id")).lower() for n in nodes)
                has_det_insights = any("app-insights" in str(n.get("id")).lower() or "insights" in str(n.get("id")).lower() for n in nodes)
                has_det_monitor = any("monitor" in str(n.get("id")).lower() for n in nodes if not any(x in str(n.get("id")).lower() for x in ["log-analytics", "log analytics", "app-insights", "app insights", "insights", "alerts", "diagnostic"]))
                has_det_backup = any("backup-vault" in str(n.get("id")).lower() for n in nodes)
                has_det_recovery = any("recovery-vault" in str(n.get("id")).lower() for n in nodes)
                has_det_storage = any("storage-account" in str(n.get("id")).lower() or "blob" in str(n.get("id")).lower() for n in nodes if not any(x in str(n.get("id")).lower() for x in ["replica", "pe-", "backup", "container"]))
                has_det_acr = any("acr" in str(n.get("id")).lower() or "container-registry" in str(n.get("id")).lower() for n in nodes)

                # Get locked compute platform and forbidden resources
                compute_type = getattr(requirements, "computeType", None) or getattr(requirements, "application_type", None) or "AKS"
                compute_upper = str(compute_type).upper().replace("_", " ").replace("-", " ")
                AKS_FORBIDDEN = {"app-service-plan", "web-app", "container-app-env"}
                APPSERVICE_FORBIDDEN = {"aks-cluster", "aks-system-node-pool", "aks-user-node-pool", "aks-ingress-controller", "aks-hpa", "container-app-env"}
                CONTAINERAPPS_FORBIDDEN = {"aks-cluster", "aks-system-node-pool", "aks-user-node-pool", "aks-ingress-controller", "aks-hpa", "app-service-plan", "web-app"}
                
                if "AKS" in compute_upper or "KUBERNETES" in compute_upper:
                    forbidden_compute = AKS_FORBIDDEN
                elif "APP SERVICE" in compute_upper or "WEB APP" in compute_upper:
                    forbidden_compute = APPSERVICE_FORBIDDEN
                else:
                    forbidden_compute = CONTAINERAPPS_FORBIDDEN

                CONTAINER_IDS = {
                    "region-group", "rg-group", "vnet-group", 
                    "subnet-ingress", "subnet-mgmt", "subnet-pe", "subnet-app", "subnet-data", 
                    "shared-services-group", "aks-cluster-group"
                }

                def has_det_resource(keywords):
                    return any(any(kw in str(n.get("id")).lower() or kw in str(n.get("data", {}).get("label", "")).lower() for kw in keywords) for n in nodes)

                # Filter and merge AI nodes
                for ai_node in ai_nodes:
                    ai_id = str(ai_node.get("id", "")).lower().strip()
                    ai_label = str(ai_node.get("data", {}).get("label", "")).lower().strip()
                    ai_type = str(ai_node.get("type", ""))
                    
                    if not ai_id:
                        continue
                    
                    # 1. Skip structural containers
                    if ai_id in CONTAINER_IDS:
                        continue
                    
                    # 2. Skip forbidden compute resources
                    if ai_id in forbidden_compute:
                        continue
                    
                    # 3. Enrich existing deterministic nodes
                    if ai_id in det_node_ids:
                        for det_node in nodes:
                            if str(det_node.get("id", "")).lower().strip() == ai_id:
                                ai_data = ai_node.get("data", {})
                                det_data = det_node.setdefault("data", {})
                                for k, v in ai_data.items():
                                    if k not in det_data and k not in ["cost", "estimated_monthly_cost", "public", "private", "provider", "subnet", "resource_type"]:
                                        det_data[k] = v
                                break
                        continue
                    
                    # 4. Skip duplicates of singleton resources
                    if (ai_type == "DatabaseNode" or any(x in ai_id for x in ["db-", "database", "postgres", "mysql", "sql", "cosmos"])) and has_det_db:
                        continue
                    if (ai_type == "CacheNode" or any(x in ai_id for x in ["redis", "cache"])) and has_det_cache:
                        continue
                    if ("vault" in ai_id or "keyvault" in ai_id) and not any(x in ai_id for x in ["backup", "recovery", "pe-"]) and has_det_kv:
                        continue
                    if "log-analytics" in ai_id and has_det_law:
                        continue
                    if "app-insights" in ai_id and has_det_insights:
                        continue
                    if "monitor" in ai_id and not any(x in ai_id for x in ["log-analytics", "log analytics", "app-insights", "app insights", "insights", "alerts", "diagnostic"]) and has_det_monitor:
                        continue
                    if "backup-vault" in ai_id and has_det_backup:
                        continue
                    if "recovery-vault" in ai_id and has_det_recovery:
                        continue
                    if ("storage-account" in ai_id or "blob" in ai_id) and not any(x in ai_id for x in ["replica", "pe-", "backup", "container"]) and has_det_storage:
                        continue
                    if "acr" in ai_id and has_det_acr:
                        continue
                    
                    # Skip duplicate PEs
                    is_ai_pe = "pe-" in ai_id or "private endpoint" in ai_label or "private-endpoint" in ai_label
                    if is_ai_pe:
                        has_similar_pe = False
                        for det_node in nodes:
                            det_id = str(det_node.get("id", "")).lower()
                            if "pe-" in det_id:
                                if any(kw in ai_id and kw in det_id for kw in ["db", "postgres", "redis", "kv", "vault", "storage", "blob"]):
                                    has_similar_pe = True
                                    break
                        if has_similar_pe:
                            continue
                            
                    # Skip duplicate public/ingress gateways
                    if any(x in ai_id or x in ai_label for x in ["frontdoor", "front-door"]) and has_det_resource(["frontdoor", "front-door"]):
                        continue
                    if any(x in ai_id or x in ai_label for x in ["ddos"]) and has_det_resource(["ddos"]):
                        continue
                    if any(x in ai_id or x in ai_label for x in ["waf"]) and has_det_resource(["waf"]):
                        continue
                    if any(x in ai_id or x in ai_label for x in ["app-gateway", "appgw", "application gateway"]) and has_det_resource(["app-gateway", "appgw", "application gateway"]):
                        continue
                    if any(x in ai_id or x in ai_label for x in ["firewall"]) and has_det_resource(["firewall"]):
                        continue
                    if any(x in ai_id or x in ai_label for x in ["bastion"]) and has_det_resource(["bastion"]):
                        continue
                    
                    # Add node
                    nodes.append(ai_node)
                
                # Merge services
                det_service_names = {str(s.get("name")).lower().strip() for s in services if s.get("name")}
                for ai_svc in ai_services:
                    svc_name = ai_svc.get("name")
                    if svc_name and str(svc_name).lower().strip() not in det_service_names:
                        services.append(ai_svc)
                        det_service_names.add(str(svc_name).lower().strip())
                
                # Merge edges
                final_node_ids = {str(n.get("id")).lower().strip() for n in nodes if n.get("id")}
                existing_edge_keys = {
                    (str(e.get("source")).lower().strip(), str(e.get("target")).lower().strip())
                    for e in edges if e.get("source") and e.get("target")
                }
                
                for ai_edge in ai_edges:
                    src = str(ai_edge.get("source", "")).lower().strip()
                    tgt = str(ai_edge.get("target", "")).lower().strip()
                    if src and tgt and src in final_node_ids and tgt in final_node_ids:
                        if (src, tgt) not in existing_edge_keys and (tgt, src) not in existing_edge_keys:
                            edges.append(ai_edge)
                            existing_edge_keys.add((src, tgt))
                
                ai_enhanced = True
                logger.info("AI Enhancement successfully merged topology via AI agents")
        except Exception as e:
            logger.warning(f"AI Enhancement failed to plan: {e}. Keeping deterministic baseline.")

    # Ensure all required container nodes exist and post-process them
    nodes = ensure_container_nodes(nodes, provider, requirements)
    nodes = post_process_nodes(nodes, provider, requirements)
    nodes, edges = deduplicate_shared_resources(nodes, edges)
            
    budget_val = 500.0
    try:
        budget_str = re.sub(r'[^\d.]', '', requirements.monthly_budget)
        if budget_str:
            budget_val = float(budget_str)
    except Exception:
        pass

    eval_plan = {'nodes': nodes, 'edges': edges, 'services': services, 'cloud_provider': provider}
    
    # Defaults
    cost_res, complexity_res, secured_res, explanation_res = {}, {}, {}, {}

    # 4. Optional AI Enrichment
    if active_provider and active_provider.lower() not in ['none', 'mock']:
        try:
            security_agent = SecurityOptimizationAgent(client=llm_client)
            complexity_agent = ComplexityAuditorAgent(client=llm_client)
            cost_agent = CostOptimizationAgent(client=llm_client)
            explanation_agent = ArchitectureExplanationAgent(client=llm_client)

            async def run_agent_safe(coro, default_val):
                try:
                    return await coro
                except Exception as ex:
                    logger.warning(f"Enrichment agent failed: {ex}")
                    return default_val

            async def run_enrichments():
                return await asyncio.gather(
                    run_agent_safe(security_agent.optimize_security(eval_plan, requirements.app_description), {}),
                    run_agent_safe(complexity_agent.audit(eval_plan, requirements.app_description), {}),
                    run_agent_safe(cost_agent.optimize(eval_plan, requirements.app_description), {}),
                    run_agent_safe(explanation_agent.explain(eval_plan, requirements.model_dump()), {})
                )

            # 60 seconds max enrichment time
            secured_res, complexity_res, cost_res, explanation_res = await asyncio.wait_for(run_enrichments(), timeout=60.0)
        except Exception as e:
            logger.warning(f'Optional AI Enrichment failed or timed out: {e}')

    valid_node_ids = {n.get("id") for n in nodes if n.get("id")}
    edges = [e for e in edges if e.get("source") in valid_node_ids and e.get("target") in valid_node_ids]

    terraform_modules = list(set([n.get('type', 'Module') for n in nodes]))

    end_time = asyncio.get_event_loop().time()
    exec_ms = int((end_time - start_time) * 1000)
    
    # 5. Architecture Quality Gate (Non-blocking Validation)
    warnings_list = validate_and_gate_architecture(nodes, edges, complexity_res.get('warnings', []), compute_type=requirements.computeType, database_type=requirements.database_type)
    services = rebuild_services_registry(nodes)
    
    # 6. Phase 3: AI Validation Agent + Completeness Scores
    ai_recommendations = run_ai_validation_agent(nodes, edges, provider)
    arch_scores = compute_architecture_scores(nodes, edges, warnings_list, provider)
    
    # Dynamic cost calculation from individual nodes
    dynamic_total_cost = arch_scores.get("total_estimated_cost", budget_val * 0.8)
    
    # Build dynamic cost breakdown from nodes
    dynamic_breakdown = []
    for n in nodes:
        n_cost = compute_node_cost(n)
        if n_cost > 0:
            dynamic_breakdown.append({
                "service": n.get("data", {}).get("label", n.get("id", "Unknown")),
                "cost": n_cost,
                "reason": f"Provisioned under {(n.get('data', {}).get('customMetadata') or {}).get('pricingTier', 'Standard')} tier."
            })

    # Determine provider/model names to return (never return mock)
    active_provider_val = active_provider if ai_enhanced else 'deterministic'
    active_model_val = getattr(llm_client, 'active_model', 'Deterministic Engine') if ai_enhanced else 'Deterministic Engine'
    generation_source = f"deterministic+{active_provider_val.lower()}"

    resp_dict = {
        'nodes': nodes,
        'edges': edges,
        'services': services,
        'cloud_provider': provider,
        'active_provider': active_provider_val,
        'active_model': active_model_val,
        'fallback_trigger': getattr(llm_client, 'fallback_trigger', 'none') if ai_enhanced else 'none',
        'cost_estimate': float(cost_res.get('estimated_monthly_cost', dynamic_total_cost)),
        'cost_breakdown': dynamic_breakdown if dynamic_breakdown else cost_res.get('cost_breakdown', []),
        'optimization_recommendations': cost_res.get('optimization_recommendations', []) + ai_recommendations,
        'complexity_score': int(complexity_res.get('complexity_score', 45)),
        'operational_overhead_score': int(complexity_res.get('operational_overhead_score', 30)),
        'overengineered': bool(complexity_res.get('overengineered', False)),
        'warnings': warnings_list,
        'security_score': arch_scores.get('security_score', int(secured_res.get('security_score', 85))),
        'security_findings': secured_res.get('security_findings', []),
        'compliance_checks': secured_res.get('compliance_checks', []),
        'explanation': explanation_res.get('explanation', 'A fully deterministic auto-generated cloud architecture tailored to your workload profile.'),
        'alternatives_considered': explanation_res.get('alternatives_considered', ''),
        'justification_for_choices': explanation_res.get('justification_for_choices', ''),
        'terraform_modules': terraform_modules,
        'execution_time_ms': exec_ms,
        'generation_source': generation_source,
        'provider': provider,
        'node_count': len(nodes),
        'edge_count': len(edges),
        'subnet_count': _count_real_subnets(nodes)
    }

    perf_logger.log(request_id, resp_dict['active_provider'], exec_ms / 1000.0, False, getattr(llm_client, 'fallback_chain', []), [])
    cache_manager.set(requirements, resp_dict)

    return ArchitectureResponse(**resp_dict)

@router.post('/generate-terraform', response_model=TerraformResponse)
async def generate_terraform(request: TerraformRequest):
    try:
        nodes_dict = [node.model_dump() for node in request.nodes]
        edges_dict = [edge.model_dump() for edge in request.edges]
        services_dict = [svc.model_dump() for svc in request.services]

        rendered = tf_engine.generate(
            nodes=nodes_dict,
            edges=edges_dict,
            services=services_dict,
            provider=request.cloud_provider
        )

        return TerraformResponse(
            main_tf=rendered.get('main_tf', ''),
            variables_tf=rendered.get('variables_tf', ''),
            outputs_tf=rendered.get('outputs_tf', ''),
            terraform_tfvars=rendered.get('terraform_tfvars', ''),
            instructions=rendered.get('instructions', ''),
            warnings=rendered.get('warnings', [])
        )
    except Exception as e:
        logger.error(f'HCL compilation failed: {e}')
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/optimize-cost')
async def optimize_cost(payload: Dict[str, Any], request: Request):
    try:
        nodes = payload.get('nodes', [])
        
        # Base pricing catalog mapping
        catalog = {
            "GatewayNode": 60.0,
            "FrontendNode": 30.0,
            "BackendNode": 75.0,
            "DatabaseNode": 115.0,
            "CacheNode": 45.0,
            "StorageNode": 25.0,
            "SecurityNode": 15.0,
            "MonitoringNode": 20.0,
        }

        breakdown = []
        total = 0.0

        for node in nodes:
            n_type = node.get("type", "")
            if n_type in ["RegionGroupNode", "ResourceGroupNode", "VNetGroupNode", "SubnetGroupNode"]:
                continue
            
            label = node.get("data", {}).get("label", n_type)
            # Check custom metadata pricing tier
            meta = node.get("data", {}).get("customMetadata") or {}
            tier = meta.get("pricingTier", "Standard")

            base_cost = catalog.get(n_type, 25.0)
            if tier == "Premium":
                base_cost *= 2.0
            elif tier == "Basic":
                base_cost *= 0.5

            total += base_cost
            breakdown.append({
                "service": label,
                "cost": base_cost,
                "reason": f"Provisioned under {tier} tier configuration rules."
            })

        recommendations = [
            "Enable Auto-scaling boundaries on the Application Container Node pool to down-scale during idle periods.",
            "Implement multi-region database replication only in production scopes to minimize dev-environment overhead.",
            "Configure cold lifecycle storage rules for logs archived in Storage Account after 15 days."
        ]

        if total > 500.0:
            recommendations.append("Consolidate multiple small databases into a single PostgreSQL Flexible Server database server.")

        return {
            "estimated_monthly_cost": total,
            "cost_breakdown": breakdown,
            "optimization_recommendations": recommendations,
            "cost_score": 90 if total < 500 else 75
        }
    except Exception as e:
        return {'error': str(e)}

@router.post('/validate-architecture')
async def validate_architecture(payload: Dict[str, Any], request: Request):
    try:
        nodes = payload.get('nodes', [])
        edges = payload.get('edges', [])
        
        findings = []
        score = 100

        # Extract node types and IDs
        node_types = {n.get("id"): n.get("type") for n in nodes}
        node_labels = {n.get("id"): n.get("data", {}).get("label", "").lower() for n in nodes}

        # Detect cloud provider from node metadata
        provider = "azure"
        for n in nodes:
            p = n.get("data", {}).get("provider")
            if p:
                provider = p.lower()
                break

        # 1. Check Secrets Vault Presence
        vault_keywords = ["vault", "secret"]
        has_vault = any(t == "SecurityNode" and any(k in node_labels.get(nid, "") for k in vault_keywords) for nid, t in node_types.items())
        if not has_vault:
            score -= 15
            if provider == "aws":
                vault_name = "AWS Secrets Manager"
                remediation = "Deploy a dedicated AWS Secrets Manager node inside the management subnet to encrypt resource keys."
            elif provider == "gcp":
                vault_name = "GCP Secret Manager"
                remediation = "Deploy a dedicated Secret Manager node inside the management subnet to encrypt resource keys."
            else:
                vault_name = "Azure Key Vault"
                remediation = "Deploy a dedicated Key Vault node inside the management subnet to encrypt resource keys."
                
            findings.append({
                "severity": "High",
                "description": f"Secrets vault repository ({vault_name}) is missing.",
                "remediation": remediation
            })

        # 2. Check Database exposure and replica standby
        db_nodes = [nid for nid, t in node_types.items() if t == "DatabaseNode"]
        has_replica = any("replica" in node_labels.get(db_id, "") for db_id in db_nodes)
        
        if db_nodes and not has_replica:
            score -= 10
            findings.append({
                "severity": "Medium",
                "description": "Database high availability read-replica standby is missing.",
                "remediation": "Deploy a read-replica DatabaseNode inside the data subnet to ensure zero point of failure redundancy."
            })

        # 3. Check for public databases
        for db_id in db_nodes:
            # Check if database has incoming edge from internet or gateway without an app cluster
            incoming = [e.get("source") for e in edges if e.get("target") == db_id]
            for source in incoming:
                if node_types.get(source) in ["GatewayNode"]:
                    score -= 20
                    findings.append({
                        "severity": "High",
                        "description": f"Database '{node_labels.get(db_id)}' is directly connected to Ingress Gateway without a proxy compute layer.",
                        "remediation": "Route ingress traffic through Application backend compute clusters and establish private endpoints."
                    })

        # 4. Check for WAF at Ingress
        waf_keywords = ["waf", "armor", "firewall"]
        has_waf = any(any(k in label for k in waf_keywords) for label in node_labels.values())
        if not has_waf:
            score -= 10
            if provider == "aws":
                waf_name = "AWS WAF"
                remediation = "Inject an AWS WAF security layer before the Application Load Balancer."
            elif provider == "gcp":
                waf_name = "Google Cloud Armor"
                remediation = "Inject a Google Cloud Armor security policy before the Global HTTPS Load Balancer."
            else:
                waf_name = "Azure WAF"
                remediation = "Inject an Azure WAF security layer before the Application Gateway load balancer."
                
            findings.append({
                "severity": "Medium",
                "description": f"Web Application Firewall ({waf_name}) is not configured at ingress gateway boundaries.",
                "remediation": remediation
            })

        # 5. Check for Network Security Groups (NSGs) / Security Groups / Firewalls
        sg_keywords = ["nsg", "security group", "firewall", "-sg", "sg-", "sec-group"]
        has_nsgs = any(any(k in label for k in sg_keywords) for label in node_labels.values())
        if not has_nsgs:
            score -= 10
            if provider == "aws":
                sg_name = "Security Groups (SGs)"
                remediation = "Associate an AWS Security Group with each Subnet node to define inbound/outbound rules."
            elif provider == "gcp":
                sg_name = "VPC Firewall Rules"
                remediation = "Define Google Cloud VPC Firewall Rules for each Subnet node to control traffic flow."
            else:
                sg_name = "Network Security Groups (NSGs)"
                remediation = "Associate a Network Security Group (NSG) with each Subnet node to define inbound/outbound rules."
                
            findings.append({
                "severity": "Medium",
                "description": f"Subnet access control policies ({sg_name}) are missing from the subnets.",
                "remediation": remediation
            })

        # Compliance mapping calculations
        compliance = [
            {
                "standard": "SOC2 Type II",
                "status": "Compliant" if score >= 80 else "Partially Compliant",
                "notes": "Requires secure identity vaults and ingress firewalls."
            },
            {
                "standard": "PCI DSS Security",
                "status": "Compliant" if has_vault and has_nsgs and score >= 85 else "Non-Compliant",
                "notes": "Enforces complete encryption of transactional databases and strict subnet boundaries."
            },
            {
                "standard": "HIPAA Privacy",
                "status": "Compliant" if score >= 75 else "Partially Compliant",
                "notes": "Requires database access trace monitoring and encryption keys."
            },
            {
                "standard": "ISO 27001",
                "status": "Compliant" if score >= 90 else "Partially Compliant",
                "notes": "Information security management controls check."
            }
        ]

        return {
            "security_score": max(50, score),
            "security_findings": findings,
            "compliance_checks": compliance
        }
    except Exception as e:
        return {'error': str(e)}

@router.post('/explain-architecture')
async def explain_architecture(payload: Dict[str, Any], request: Request):
    llm_client = request.app.state.provider_manager
    try:
        nodes = payload.get('nodes', [])
        services = payload.get('services', [])
        plan = {'nodes': nodes, 'services': services}
        reqs = 'user-customized'

        explanation_agent = ArchitectureExplanationAgent(client=llm_client)
        return await explanation_agent.explain(plan, reqs)
    except Exception as e:
        return {'error': str(e)}

@router.post('/ai-assist')
async def ai_assist(payload: Dict[str, Any], request: Request):
    try:
        nodes = payload.get('nodes', [])
        edges = payload.get('edges', [])
        services = payload.get('services', [])
        action = payload.get('action', "")

        # Handle deterministic AI-assist transformations
        updated_nodes = list(nodes)
        updated_edges = list(edges)

        provider = "azure"
        for n in nodes:
            p = n.get("data", {}).get("provider")
            if p:
                provider = p
                break

        if action == "optimize_security":
            # Inject Key Vault and WAF if missing
            has_kv = any("vault" in str(n.get("id")).lower() for n in nodes)
            if not has_kv:
                kv_id = f"keyvault-{int(asyncio.get_event_loop().time())}"
                updated_nodes.append({
                    "id": kv_id,
                    "type": "SecurityNode",
                    "parentNode": "subnet-mgmt",
                    "position": {"x": 250, "y": 60},
                    "data": {"label": "Key Vault (Secure)", "subnet": "subnet-mgmt", "provider": provider}
                })
        elif action == "add_monitoring":
            # Inject Monitor and Log Analytics
            has_mon = any("monitor" in str(n.get("id")).lower() for n in nodes)
            if not has_mon:
                mon_id = f"monitor-{int(asyncio.get_event_loop().time())}"
                updated_nodes.append({
                    "id": mon_id,
                    "type": "MonitoringNode",
                    "parentNode": "subnet-mgmt",
                    "position": {"x": 250, "y": 160},
                    "data": {"label": "Azure Monitor Dashboard", "subnet": "subnet-mgmt", "provider": provider}
                })
        elif action == "add_ha":
            # Inject Database replica
            has_rep = any("replica" in str(n.get("id")).lower() for n in nodes)
            db_primary = next((n for n in nodes if n.get("type") == "DatabaseNode"), None)
            if db_primary and not has_rep:
                rep_id = f"db-replica-{int(asyncio.get_event_loop().time())}"
                updated_nodes.append({
                    "id": rep_id,
                    "type": "DatabaseNode",
                    "parentNode": "subnet-data",
                    "position": {"x": 280, "y": 60},
                    "data": {"label": "Database HA Standby Replica", "subnet": "subnet-data", "provider": provider}
                })
                updated_edges.append({
                    "id": f"e-{db_primary.get('id')}-{rep_id}",
                    "source": db_primary.get("id"),
                    "target": rep_id,
                    "animated": False
                })

        return {
            "nodes": updated_nodes,
            "edges": updated_edges,
            "services": services
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
