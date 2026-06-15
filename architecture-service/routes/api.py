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
            
        # Ensure position exists to prevent frontend crash
        for idx, node in enumerate(nodes):
            if 'position' not in node or not isinstance(node['position'], dict):
                node['position'] = {'x': float((idx % 5) * 200), 'y': float((idx // 5) * 150)}
            
    except Exception as e:
        logger.warning(f"AI Generation Failed: {e}. Falling back to deterministic engine.")
        reasoning_engine = InfrastructureReasoningEngine(cloud_provider=provider)
        workload = reasoning_engine.classify_workload(requirements.app_description, requirements.expected_users)
        raw_topology = reasoning_engine.synthesize_from_intent()
        topology = reasoning_engine.normalize_topology(raw_topology)
        
        nodes = topology['nodes']
        edges = topology['edges']
        services = topology['services']
        
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
        
    generation_source = f"deterministic+{getattr(llm_client, 'active_provider', 'ollama').lower()}"

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
    llm_client = request.app.state.provider_manager
    request_payload = payload
    try:
        nodes = request_payload.get('nodes', [])
        services = request_payload.get('services', [])
        plan = {'nodes': nodes, 'services': services}
        reqs = 'user-customized budget'

        cost_agent = CostOptimizationAgent(client=llm_client)
        return await cost_agent.optimize(plan, reqs)
    except Exception as e:
        return {'error': str(e)}

@router.post('/validate-architecture')
async def validate_architecture(payload: Dict[str, Any], request: Request):
    llm_client = request.app.state.provider_manager
    request_payload = payload
    try:
        nodes = request_payload.get('nodes', [])
        services = request_payload.get('services', [])
        plan = {'nodes': nodes, 'services': services}
        reqs = 'custom security'

        security_agent = SecurityOptimizationAgent(client=llm_client)
        return await security_agent.optimize_security(plan, reqs)
    except Exception as e:
        return {'error': str(e)}

@router.post('/explain-architecture')
async def explain_architecture(payload: Dict[str, Any], request: Request):
    llm_client = request.app.state.provider_manager
    request_payload = payload
    try:
        nodes = request_payload.get('nodes', [])
        services = request_payload.get('services', [])
        plan = {'nodes': nodes, 'services': services}
        reqs = 'user-customized'

        explanation_agent = ArchitectureExplanationAgent(client=llm_client)
        return await explanation_agent.explain(plan, reqs)
    except Exception as e:
        return {'error': str(e)}

@router.post('/ai-assist')
async def ai_assist(request: AiAssistRequest):
    # Deterministic manipulation
    pass
