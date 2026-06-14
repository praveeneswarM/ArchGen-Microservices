import asyncio
import json
import logging
import re
from typing import Dict, Any, List

from fastapi import APIRouter, HTTPException

# Shared schemas
from shared.models.schemas import (
    RequirementInput,
    ArchitectureResponse,
    TerraformRequest,
    TerraformResponse,
    AiAssistRequest,
)

# Agent imports
from architecture_service.agents.requirement_understanding import RequirementUnderstandingAgent
from architecture_service.agents.architecture_reasoning import ArchitectureReasoningAgent
from architecture_service.agents.security_optimization import SecurityOptimizationAgent
from architecture_service.agents.complexity_auditor import ComplexityAuditorAgent
from architecture_service.agents.cost_optimization import CostOptimizationAgent
from architecture_service.agents.architecture_explanation import ArchitectureExplanationAgent

# Core engines
from architecture_service.terraform.engine import TerraformEngine
from architecture_service.utils.llm_provider import get_llm_provider
from architecture_service.utils.reasoning_engine import InfrastructureReasoningEngine

logger = logging.getLogger("api_routes")
router = APIRouter()

# Reusable client \u0026 engine
llm_client = get_llm_provider()
tf_engine = TerraformEngine()

@router.post("/generate-architecture", response_model=ArchitectureResponse)
async def generate_architecture(requirements: RequirementInput):
    """
    Orchestrates the upgraded deterministic-first Architect pipeline:
    Input -> Understood -> Deterministic Reasoning & Topology -> Security/Cost/Complexity & AI Enhancements
    """
    logger.info(
        "Initializing upgraded deterministic autonomous architect pipeline | Active Provider: %s | Model Name: %s",
        getattr(llm_client, "provider_name", llm_client.__class__.__name__),
        getattr(llm_client, "model_name", "unknown"),
    )
    try:
        start_time = asyncio.get_event_loop().time()

        # Step 1: Extract understanding via agent
        understanding_agent = RequirementUnderstandingAgent(client=llm_client)
        understood_reqs = await understanding_agent.analyze(requirements)

        # Step 2: Reason over the requirements using the active AI provider
        provider = requirements.cloud_provider.lower()
        reasoning_engine = InfrastructureReasoningEngine(cloud_provider=provider)

        workload = reasoning_engine.classify_workload(
            requirements.app_description,
            requirements.expected_users
        )

        budget_val = 500.0
        try:
            budget_str = re.sub(r'[^\d.]', '', requirements.monthly_budget)
            if budget_str:
                budget_val = float(budget_str)
        except Exception:
            pass

        logger.info(f"Classified workload: {workload} with parsed budget: {budget_val}")

        reasoning_agent = ArchitectureReasoningAgent(client=llm_client)
        reasoning_input = {
            "requirements": requirements.model_dump(),
            "understood_requirements": understood_reqs,
            "classified_workload": workload,
            "budget": budget_val,
            "cloud_provider": provider,
        }
        reasoned_intent = await reasoning_agent.reason(reasoning_input)

        # Merge explicitly classified workload into reasoned intent just to ensure routing
        if "workload_classification" not in reasoned_intent:
            reasoned_intent["workload_classification"] = workload

        raw_topology = reasoning_engine.synthesize_from_intent(reasoned_intent, budget_val)
        topology = reasoning_engine.normalize_topology(raw_topology)

        if not topology["nodes"] or not topology["edges"] or not topology["services"]:
            logger.warning("Synthesis returned empty topology. Falling back to basic CRUD intent.")
            fallback_intent = {"workload_classification": workload, "architectural_intent": {"compute_preference": "basic_vm", "database_preference": "relational"}}
            raw_topology = reasoning_engine.synthesize_from_intent(fallback_intent, budget_val)
            topology = reasoning_engine.normalize_topology(raw_topology)

        nodes = topology["nodes"]
        edges = topology["edges"]
        services = topology["services"]

        # Step 3: Run AI agents purely as audit and enhancement layers on the topology
        eval_plan = {"nodes": nodes, "edges": edges, "services": services, "cloud_provider": provider}

        security_agent = SecurityOptimizationAgent(client=llm_client)
        complexity_agent = ComplexityAuditorAgent(client=llm_client)
        cost_agent = CostOptimizationAgent(client=llm_client)
        explanation_agent = ArchitectureExplanationAgent(client=llm_client)

        # Run AI enhancements in parallel
        security_task = security_agent.optimize_security(eval_plan, understood_reqs)
        complexity_task = complexity_agent.audit(eval_plan, understood_reqs)
        cost_task = cost_agent.optimize(eval_plan, understood_reqs)
        explanation_task = explanation_agent.explain(eval_plan, understood_reqs)

        secured_res, complexity_res, cost_res, explanation_res = await asyncio.gather(
            security_task, complexity_task, cost_task, explanation_task
        )

        terraform_modules = list(set([n.get("type", "Module") for n in nodes]))

        end_time = asyncio.get_event_loop().time()
        exec_ms = int((end_time - start_time) * 1000)

        response = ArchitectureResponse(
            nodes=nodes,
            edges=edges,
            services=services,
            cloud_provider=provider,
            active_provider=getattr(llm_client, "last_active_provider", getattr(llm_client, "provider_name", "Unknown")),
            active_model=getattr(llm_client, "last_active_model", getattr(llm_client, "model_name", "unknown")),
            fallback_trigger=getattr(llm_client, "last_fallback_trigger", "none"),
            cost_estimate=float(cost_res.get("estimated_monthly_cost", budget_val * 0.8)),
            cost_breakdown=cost_res.get("cost_breakdown", []),
            optimization_recommendations=cost_res.get("optimization_recommendations", []),
            complexity_score=int(complexity_res.get("complexity_score", 45)),
            operational_overhead_score=int(complexity_res.get("operational_overhead_score", 30)),
            overengineered=bool(complexity_res.get("overengineered", False)),
            warnings=complexity_res.get("warnings", []),
            security_score=int(secured_res.get("security_score", 85)),
            security_findings=secured_res.get("security_findings", []),
            compliance_checks=secured_res.get("compliance_checks", []),
            explanation=explanation_res.get("explanation", ""),
            alternatives_considered=explanation_res.get("alternatives_considered", ""),
            justification_for_choices=explanation_res.get("justification_for_choices", ""),
            terraform_modules=terraform_modules,
            execution_time_ms=exec_ms
        )
        logger.info(f"Consolidated deterministic-first topology with AI enhancements in {exec_ms}ms.")
        return response

    except Exception as e:
        logger.error(f"Upgraded generation pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-terraform", response_model=TerraformResponse)
async def generate_terraform(request: TerraformRequest):
    """
    Renders HCL configs using the canvas graph as the SINGLE SOURCE OF TRUTH.
    """
    logger.info(
        "Compiling HCL templates directly from the visual canvas graph | Provider: %s",
        request.cloud_provider,
    )
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
            main_tf=rendered.get("main_tf", ""),
            variables_tf=rendered.get("variables_tf", ""),
            outputs_tf=rendered.get("outputs_tf", ""),
            terraform_tfvars=rendered.get("terraform_tfvars", ""),
            instructions=rendered.get("instructions", "")
        )
    except Exception as e:
        logger.error(f"HCL compilation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize-cost")
async def optimize_cost(request: Dict[str, Any]):
    """
    Runs FinOps scans directly on the current canvas nodes list.
    """
    try:
        nodes = request.get("nodes", [])
        services = request.get("services", [])
        plan = {"nodes": nodes, "services": services}
        reqs = {"expected_users": "user-customized", "monthly_budget": "user-customized"}

        cost_agent = CostOptimizationAgent(client=llm_client)
        return await cost_agent.optimize(plan, reqs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-architecture")
async def validate_architecture(request: Dict[str, Any]):
    """
    Runs compliance scans directly on the current canvas nodes list.
    """
    try:
        nodes = request.get("nodes", [])
        services = request.get("services", [])
        plan = {"nodes": nodes, "services": services}
        reqs = {"security_level": "custom"}

        security_agent = SecurityOptimizationAgent(client=llm_client)
        return await security_agent.optimize_security(plan, reqs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/explain-architecture")
async def explain_architecture(request: Dict[str, Any]):
    """
    Explains the active canvas setup.
    """
    try:
        nodes = request.get("nodes", [])
        services = request.get("services", [])
        plan = {"nodes": nodes, "services": services}
        reqs = {"application_type": "user-customized"}

        explanation_agent = ArchitectureExplanationAgent(client=llm_client)
        return await explanation_agent.explain(plan, reqs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-assist")
async def ai_assist(request: AiAssistRequest):
    """
    Autonomous AI editing actions directly modifying the architecture graph.
    """
    logger.info(f"AI-Assist triggered. Action: {request.action}")
    try:
        nodes = [node.model_dump() for node in request.nodes]
        edges = [edge.model_dump() for edge in request.edges]
        services = [svc.model_dump() for svc in request.services]

        action = request.action.lower()
        backend_node_id = next((n["id"] for n in nodes if n["type"] == "BackendNode"), None)

        if action == "optimize_security":
            # 1. Inject KeyVault node if absent
            if not any(n["type"] == "SecurityNode" for n in nodes):
                nodes.append({
                    "id": "vault-injected",
                    "type": "SecurityNode",
                    "data": {"label": "Hardware KeyVault secrets", "status": "active"},
                    "position": {"x": 80, "y": 360}
                })
                services.append({
                    "name": "Hardware KeyVault secrets",
                    "category": "security",
                    "description": "Hardware security module secret storage."
                })
                if backend_node_id:
                    edges.append({
                        "id": "e-be-vault-injected",
                        "source": backend_node_id,
                        "target": "vault-injected",
                        "animated": True
                    })

            # 2. Upgrade gateway load balancer to WAF Ingress
            for node in nodes:
                if node["type"] == "GatewayNode":
                    node["data"]["label"] = "Web App Firewall (WAF) Ingress"

        elif action == "add_monitoring":
            # Inject Monitoring node
            if not any(n["type"] == "MonitoringNode" for n in nodes):
                nodes.append({
                    "id": "monitor-injected",
                    "type": "MonitoringNode",
                    "data": {"label": "App Insights Central Monitor", "status": "active"},
                    "position": {"x": 420, "y": 440}
                })
                services.append({
                    "name": "App Insights Central Monitor",
                    "category": "monitoring",
                    "description": "Log Analytics and Application Performance Monitoring."
                })
                if backend_node_id:
                    edges.append({
                        "id": "e-be-monitor-injected",
                        "source": backend_node_id,
                        "target": "monitor-injected",
                        "animated": False
                    })

        elif action == "add_ha":
            # Upgrade database to HA Cluster
            for node in nodes:
                if node["type"] == "DatabaseNode":
                    node["data"]["label"] = "PostgreSQL DB High-Availability Cluster"

            # Spawn secondary replica compute backend
            if backend_node_id and len([n for n in nodes if n["type"] == "BackendNode"]) < 2:
                replica_id = "backend-replica"
                nodes.append({
                    "id": replica_id,
                    "type": "BackendNode",
                    "data": {"label": "API Compute Replica Node", "status": "active"},
                    "position": {"x": 400, "y": 220}
                })
                services.append({
                    "name": "API Compute Replica Node",
                    "category": "backend",
                    "description": "Redundant backend API container replica."
                })

                # Connect Gateway to Replica
                gateway_id = next((n["id"] for n in nodes if n["type"] == "GatewayNode"), None)
                if gateway_id:
                    edges.append({
                        "id": f"e-{gateway_id}-{replica_id}",
                        "source": gateway_id,
                        "target": replica_id,
                        "animated": True
                    })

                # Connect Replica to Database
                db_id = next((n["id"] for n in nodes if n["type"] == "DatabaseNode"), None)
                if db_id:
                    edges.append({
                        "id": f"e-{replica_id}-{db_id}",
                        "source": replica_id,
                        "target": db_id,
                        "animated": False
                    })

        elif action == "reduce_cost":
            # 1. Downgrade database to basic VM tier
            for node in nodes:
                if node["type"] == "DatabaseNode":
                    node["data"]["label"] = "Basic Relational PostgreSQL"

            # 2. Prune caching layer if present
            nodes = [n for n in nodes if n["type"] != "CacheNode"]
            edges = [e for e in edges if e["source"] != "cache" and e["target"] != "cache"]
            services = [s for s in services if s["category"] != "cache"]

        return {
            "nodes": nodes,
            "edges": edges,
            "services": services
        }
    except Exception as e:
        logger.error(f"AI-Assist execution failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))
