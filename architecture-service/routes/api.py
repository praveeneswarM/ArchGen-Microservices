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
    
    # 1. Check Cache
    cached = cache_manager.get(requirements)
    if cached:
        c_nodes = cached.get('nodes', [])
        if len(c_nodes) > 0:
            exec_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
            perf_logger.log(request_id, 'Cache', exec_ms / 1000.0, True, [], [])
            cached['execution_time_ms'] = exec_ms
            return ArchitectureResponse(**cached)

    # 2. AI Architecture Generation
    llm_client = request.app.state.provider_manager
    provider = requirements.cloud_provider.lower()
    
    from agents.requirement_analysis import RequirementAnalysisAgent
    from agents.architecture_planning import ArchitecturePlanningAgent
    
    try:
        req_agent = RequirementAnalysisAgent(client=llm_client)
        plan_agent = ArchitecturePlanningAgent(client=llm_client)
        
        # Phase 1: Analyze Requirements
        logger.info("Starting AI Requirement Analysis")
        analysis = await req_agent.analyze(requirements)
        
        # Phase 2: Plan Visual Graph
        logger.info("Starting AI Architecture Planning")
        topology = await plan_agent.plan(analysis)
        
        nodes = topology.get('nodes', [])
        edges = topology.get('edges', [])
        services = topology.get('services', [])
        
        if not nodes:
            raise Exception("AI generated empty node list")

        # Post-process live LLM-generated topology to enforce user's custom inputs
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
                elif "aks" in n_id or "compute" in n_id or "cluster" in n_id or n_id == "aks-cluster":
                    node["data"] = node.get("data") or {}
                    node["data"]["label"] = f"{compute_name} Engine"
                    
                # F. Update Primary/Replica DB Node Labels
                elif n_id == "db-primary" or n_id == "database" or (n_type == "DatabaseNode" and "replica" not in n_id):
                    node["data"] = node.get("data") or {}
                    node["data"]["label"] = db_name
                    
                elif n_id == "db-replica" or (n_type == "DatabaseNode" and "replica" in n_id):
                    node["data"] = node.get("data") or {}
                    node["data"]["label"] = f"{db_name} Replica"
        except Exception as pe:
            logger.warning(f"Failed to post-process live node labels: {pe}")
            
        # Ensure position exists to prevent frontend crash
        for idx, node in enumerate(nodes):
            if 'position' not in node or not isinstance(node['position'], dict):
                node['position'] = {'x': float((idx % 5) * 200), 'y': float((idx // 5) * 150)}
            
    except Exception as e:
        logger.warning(f"AI Generation Failed: {e}. Falling back to deterministic engine.")
        reasoning_engine = InfrastructureReasoningEngine(cloud_provider=provider, requirements=requirements)
        workload = reasoning_engine.classify_workload(requirements.app_description, requirements.expected_users)
        raw_topology = reasoning_engine.synthesize_from_intent()
        topology = reasoning_engine.normalize_topology(raw_topology)
        
        nodes = topology['nodes']
        edges = topology['edges']
        services = topology['services']
        
        llm_client.active_provider = 'deterministic'
        
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

    # 3. Optional AI Enrichment
    try:
        security_agent = SecurityOptimizationAgent(client=llm_client)
        complexity_agent = ComplexityAuditorAgent(client=llm_client)
        cost_agent = CostOptimizationAgent(client=llm_client)
        explanation_agent = ArchitectureExplanationAgent(client=llm_client)

        async def run_enrichments():
            return await asyncio.gather(
                security_agent.optimize_security(eval_plan, requirements.app_description),
                complexity_agent.audit(eval_plan, requirements.app_description),
                cost_agent.optimize(eval_plan, requirements.app_description),
                explanation_agent.explain(eval_plan, requirements.model_dump())
            )

        # 120 seconds max enrichment time to account for rate limit retries
        secured_res, complexity_res, cost_res, explanation_res = await asyncio.wait_for(run_enrichments(), timeout=120.0)
    except Exception as e:
        logger.warning(f'Enrichment failed or timed out: {e}')

    terraform_modules = list(set([n.get('type', 'Module') for n in nodes]))

    end_time = asyncio.get_event_loop().time()
    exec_ms = int((end_time - start_time) * 1000)
    
    # 4. Architecture Quality Gate
    subnets = set(n.get("data", {}).get("subnet") for n in nodes if n.get("data", {}).get("subnet"))
    
    types = set(n.get("type") for n in nodes)
    
    if not nodes:
        logger.error("Quality Gate Failed: Architecture contains no nodes.")
        raise HTTPException(status_code=500, detail="Quality Gate Failed: Could not generate valid topology.")
        
    generation_source = f"ai_generated+{getattr(llm_client, 'active_provider', 'ollama').lower()}"

    resp_dict = {
        'nodes': nodes,
        'edges': edges,
        'services': services,
        'cloud_provider': provider,
        'active_provider': getattr(llm_client, 'active_provider', 'Deterministic'),
        'active_model': getattr(llm_client, 'active_model', 'Deterministic'),
        'fallback_trigger': getattr(llm_client, 'fallback_trigger', 'none'),
        'cost_estimate': float(cost_res.get('estimated_monthly_cost', budget_val * 0.8)),
        'cost_breakdown': cost_res.get('cost_breakdown', []),
        'optimization_recommendations': cost_res.get('optimization_recommendations', []),
        'complexity_score': int(complexity_res.get('complexity_score', 45)),
        'operational_overhead_score': int(complexity_res.get('operational_overhead_score', 30)),
        'overengineered': bool(complexity_res.get('overengineered', False)),
        'warnings': complexity_res.get('warnings', []),
        'security_score': int(secured_res.get('security_score', 85)),
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
        'subnet_count': len(subnets)
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
            instructions=rendered.get('instructions', '')
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
