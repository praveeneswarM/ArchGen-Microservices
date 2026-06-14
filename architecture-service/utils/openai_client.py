import os
import json
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openai_client")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o-mini")

class OpenAIClient:
    def __init__(self):
        self.api_key = OPENAI_API_KEY
        self.model = MODEL_NAME
        self.client = None
        
        if self.api_key and not self.api_key.startswith("your_") and len(self.api_key) > 5:
            try:
                from openai import AsyncOpenAI
                self.client = AsyncOpenAI(api_key=self.api_key)
                logger.info(f"OpenAI AsyncClient initialized with model: {self.model}")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}. OpenAI provider will be skipped.")
                self.client = None
        else:
            logger.warning("OPENAI_API_KEY not set or invalid. OpenAI provider is unavailable.")

    async def generate_json(self, system_prompt: str, user_prompt: str, schema: Optional[Any] = None) -> Dict[str, Any]:
        """
        Generates a JSON response from OpenAI.
        """
        if not self.client:
            raise RuntimeError("OpenAI unavailable: API key missing or invalid")

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            response_format = {"type": "json_object"}

            logger.info(f"Sending request to OpenAI using {self.model}...")
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format=response_format,
                temperature=0.2,
                max_tokens=4000
            )

            content = response.choices[0].message.content
            logger.info("Successfully received response from OpenAI.")
            return json.loads(content)
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise RuntimeError(f"OpenAI request failed: {e}") from e

    @staticmethod
    def _generate_mock_response(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Generates realistic architecture, cost, security, complexity, and HCL parameters
        by scanning description keywords inside user prompts.
        """
        logger.info("Mock engine running descriptive text intelligence scan...")
        
        lower_prompt = user_prompt.lower()
        
        # 1. Infer application profiles
        is_banking = "bank" in lower_prompt or "finance" in lower_prompt or "transaction" in lower_prompt
        is_streaming = "stream" in lower_prompt or "ott" in lower_prompt or "video" in lower_prompt or "media" in lower_prompt
        is_crud = "crud" in lower_prompt or "blog" in lower_prompt or "simple" in lower_prompt or "portfolio" in lower_prompt
        is_high_scale = "1m" in lower_prompt or "100k" in lower_prompt or "million" in lower_prompt or "high" in lower_prompt
        
        provider = "azure"
        if "aws" in lower_prompt:
            provider = "aws"
        elif "gcp" in lower_prompt:
            provider = "gcp"

        # A. Requirement Understanding Mock
        if "requirementunderstandingagent" in system_prompt.lower() or "requirement understanding" in system_prompt.lower():
            reqs = [
                f"Design a highly responsive architecture on {provider.upper()}.",
                "Intelligently map database and hosting systems."
            ]
            if is_banking:
                reqs.append("Enforce maximum vault security encryptions.")
                reqs.append("Deploy active WAF controllers to intercept transaction routes.")
            if is_streaming:
                reqs.append("Deploy CDN gateways for media streaming endpoints.")
                reqs.append("Implement Redis caching to optimize throughput latency.")
            if is_crud:
                reqs.append("Deploy a cost-efficient lightweight VM or App Service container.")
                
            return {
                "expected_users": "1M monthly" if is_high_scale else "10k monthly",
                "monthly_budget": "500" if is_high_scale else "50",
                "cloud_provider": provider,
                "inferred_scale_level": "high" if is_high_scale else "low",
                "extracted_requirements": reqs
            }
            
        # B. Architecture Reasoning Mock
        elif "architecturereasoningagent" in system_prompt.lower() or "architecture reasoning" in system_prompt.lower():
            # Dynamically assemble visual nodes based on descriptions
            nodes = [
                {"id": "gateway", "type": "GatewayNode", "data": {"label": "API Secure ingress", "status": "active"}, "position": {"x": 100, "y": 200}},
                {"id": "frontend", "type": "FrontendNode", "data": {"label": "Static Client app", "status": "active"}, "position": {"x": 300, "y": 100}},
                {"id": "backend", "type": "BackendNode", "data": {"label": "Core API Service", "status": "active"}, "position": {"x": 300, "y": 250}},
                {"id": "database", "type": "DatabaseNode", "data": {"label": "Relational Primary DB", "status": "active"}, "position": {"x": 520, "y": 320}}
            ]
            
            edges = [
                {"id": "e-gateway-fe", "source": "gateway", "target": "frontend", "animated": True},
                {"id": "e-gateway-be", "source": "gateway", "target": "backend", "animated": True},
                {"id": "e-be-db", "source": "backend", "target": "database", "animated": False}
            ]
            
            services = [
                {"name": "API Secure ingress", "category": "gateway", "description": "Entry load balancer traffic ingress router."},
                {"name": "Static Client app", "category": "frontend", "description": "Static web app hosting frontend assets."},
                {"name": "Core API Service", "category": "backend", "description": "App Compute hosting primary server APIs."},
                {"name": "Relational Primary DB", "category": "database", "description": "Managed SQL/PostgreSQL database instances."}
            ]
            
            # Streaming scale requirements -> cache & CDN automatically added!
            if is_streaming or is_high_scale:
                nodes.append({"id": "cache", "type": "CacheNode", "data": {"label": "Redis Fast-Cache", "status": "active"}, "position": {"x": 520, "y": 180}})
                nodes.append({"id": "storage", "type": "StorageNode", "data": {"label": "Blob static storage", "status": "active"}, "position": {"x": 300, "y": 400}})
                
                edges.append({"id": "e-be-cache", "source": "backend", "target": "cache", "animated": False})
                edges.append({"id": "e-be-storage", "source": "backend", "target": "storage", "animated": False})
                
                services.append({"name": "Redis Fast-Cache", "category": "cache", "description": "In-memory caching layer to speed up API responses."})
                services.append({"name": "Blob static storage", "category": "storage", "description": "Blob object storage system for media catalogs."})
                
            return {
                "nodes": nodes,
                "edges": edges,
                "services": services,
                "cloud_provider": provider
            }
            
        # C. Security Optimization Mock
        elif "securityoptimizationagent" in system_prompt.lower() or "security optimization" in system_prompt.lower():
            # Parse nodes passed in the prompt or simulate
            nodes = [
                {"id": "gateway", "type": "GatewayNode", "data": {"label": "API WAF Ingress", "status": "active"}, "position": {"x": 100, "y": 200}},
                {"id": "frontend", "type": "FrontendNode", "data": {"label": "Static Client app", "status": "active"}, "position": {"x": 300, "y": 100}},
                {"id": "backend", "type": "BackendNode", "data": {"label": "Core API Service", "status": "active"}, "position": {"x": 300, "y": 250}},
                {"id": "database", "type": "DatabaseNode", "data": {"label": "Relational Primary DB", "status": "active"}, "position": {"x": 520, "y": 320}}
            ]
            edges = [
                {"id": "e-gateway-fe", "source": "gateway", "target": "frontend", "animated": True},
                {"id": "e-gateway-be", "source": "gateway", "target": "backend", "animated": True},
                {"id": "e-be-db", "source": "backend", "target": "database", "animated": False}
            ]
            
            # High security banking -> Injects Vault node and WAF bindings automatically!
            findings = [
                {"severity": "Low", "description": "Redirect all public HTTP traffic to secure HTTPS channels.", "remediation": "Set force_ssl = true."}
            ]
            score = 80
            
            if is_banking:
                nodes.append({"id": "vault", "type": "SecurityNode", "data": {"label": "Hardware key vault", "status": "active"}, "position": {"x": 100, "y": 380}})
                edges.append({"id": "e-be-vault", "source": "backend", "target": "vault", "animated": True})
                findings.append({"severity": "High", "description": "Highly secure financial nodes require strict vault access controls.", "remediation": "Inject keys into container app environments."})
                score = 98
                
            return {
                "updated_nodes": nodes,
                "updated_edges": edges,
                "security_findings": findings,
                "compliance_checks": [
                    {"standard": "SOC2", "status": "Compliant", "notes": "Logging active"},
                    {"standard": "PCI-DSS", "status": "Compliant" if is_banking else "Partially Compliant", "notes": "Secure bindings active."}
                ],
                "security_score": score
            }
            
        # D. Complexity Auditor Mock
        elif "complexityauditoragent" in system_prompt.lower() or "complexity auditor" in system_prompt.lower():
            is_overengineered = False
            warnings = []
            
            if is_crud and ("kubernetes" in lower_prompt or "aks" in lower_prompt or "k8s" in lower_prompt):
                is_overengineered = True
                warnings.append("Kubernetes container clusters selected for simple CRUD apps introduce excessive operational overhead.")
            if "service mesh" in lower_prompt:
                is_overengineered = True
                warnings.append("Service meshes are highly complex and likely unnecessary for this scale.")
                
            if not warnings:
                warnings.append("Basic networking is isolated within private subnet scopes.")
                
            return {
                "complexity_score": 90 if is_overengineered else 35,
                "overengineered": is_overengineered,
                "warnings": warnings,
                "operational_overhead_score": 85 if is_overengineered else 25
            }
            
        # E. Cost Optimization Mock
        elif "costoptimizationagent" in system_prompt.lower() or "cost optimization" in system_prompt.lower():
            cost = 45.00
            breakdown = [
                {"service": "Core VM instances", "cost": 25.00, "reason": "Standard compute instances"},
                {"service": "Relational DB storage", "cost": 20.00, "reason": "Flexible DB engine"}
            ]
            
            if is_streaming or is_high_scale:
                cost = 420.00
                breakdown = [
                    {"service": "Secure Load Balancer / WAF", "cost": 60.00, "reason": "API WAF ingress tier"},
                    {"service": "Active Container Replicas", "cost": 150.00, "reason": "Scale container app engines"},
                    {"service": "PostgreSQL HA database", "cost": 125.00, "reason": "Managed redundant transactional DB"},
                    {"service": "Redis Cache node", "cost": 45.00, "reason": "In-memory caching"},
                    {"service": "Blob Storage CDN", "cost": 40.00, "reason": "Static content delivery edge networks"}
                ]
                
            return {
                "estimated_monthly_cost": cost,
                "cost_breakdown": breakdown,
                "optimization_recommendations": [
                    "Scale compute engines to zero during off-peak hours.",
                    "Configure auto-scaling boundaries on databases to save active memory."
                ],
                "cost_score": 90 if is_crud else 65
            }

        # F. Architecture Explanation Mock
        elif "architectureexplanationagent" in system_prompt.lower() or "architecture explanation" in system_prompt.lower():
            expl = "A lightweight cost-efficient monolith hosting client SPA and relational database instances."
            alt = "Considered microservices, but rejected to avoid operations overhead."
            just = "Optimizes active developer velocity for simple MVP workloads."
            
            if is_streaming or is_high_scale:
                expl = "A highly scalable active-active container app system, with caching layers, blob static files storage, and secure WAF gateway routing."
                alt = "Considered serverless functions, but rejected to prevent cold-starts and maintain continuous media streaming pipeline bindings."
                just = "Delivers absolute sub-second delivery latencies for global streaming clients."
                
            return {
                "explanation": expl,
                "alternatives_considered": alt,
                "justification_for_choices": just
            }

        return {}
