# ArchGen Microservices: Architecture Generator Fixes & Enhancements

This document summarizes all the features, fixes, validation logic, and bidirectional synchronization engines implemented in the ArchGen repository to make it deterministic, cloud-native, and infrastructure-aware.

---

## 1. Architecture Correctness (Phase 1)

We resolved critical visual topology and validation issues to enforce production readiness:
* **Subnet Count Precision**: Implemented `_count_real_subnets` in [api.py](file:///c:/Users/Admin/Desktop/ArchGen-Microservices/architecture-service/routes/api.py) to count only the 5 real network subnets (`ingress`, `app`, `data`, `mgmt`, `pe`), excluding structural container groups (`shared-services-group` and `aks-cluster-group`) that have `SubnetGroupNode` types but are not subnets.
* **Resource Selection Locking**: Hardened validation gates. If a user selects a compute platform (e.g., `AKS`), database (`PostgreSQL`), or cloud provider, validation immediately catches and rejects forbidden resource substitutions (e.g., generating `app-service-plan` or `container-app-env` when `AKS` is locked).
* **Singleton Deduplication**: Fixed a bug where Azure Backup Vault and Recovery Services Vault (separate services) were flagged as duplicates of each other. They are now checked and managed as independent singleton resources.
* **Edge Source/Target Validation**: Checks all connection edges in the visual graph and flags orphan connections targeting non-existent nodes.
* **Layout Coordinate Snapping**: Enforces that the deterministic engine positions container groups cleanly (with coordinate healing boundaries) and snaps resources to their respective container group offsets to prevent overlapping nodes on the frontend canvas.

---

## 2. Terraform Drift Validation (Phase 2)

We built an E2E round-trip drift validation engine that ensures the visual canvas and the generated Terraform HCL code remain in sync:
* **Dynamic Compute Detection**: Auto-detects the compute type (`AKS` vs `App Service` vs `Container Apps`) from the nodes list in [engine.py](file:///c:/Users/Admin/Desktop/ArchGen-Microservices/architecture-service/terraform/engine.py).
* **Jinja Templates Extension**: Expanded [main.tf.j2](file:///c:/Users/Admin/Desktop/ArchGen-Microservices/architecture-service/terraform/templates/azure/main.tf.j2) to conditionally render resources based on compute selection:
  - **AKS**: Renders `azurerm_kubernetes_cluster`, `kubernetes_provider`, `azurerm_container_registry` (ACR), and individual `kubernetes_deployment`, `kubernetes_service`, and `kubernetes_horizontal_pod_autoscaler` (HPA) blocks for each microservice.
  - **App Service**: Renders `azurerm_service_plan` and `azurerm_linux_web_app` per microservice.
  - **Container Apps**: Renders `azurerm_container_app_environment` and container app instances.
* **HCL Round-Trip Drift Validator**: Implemented `validate_terraform_drift` to compile and parse the generated `main.tf`, extract provisioned resource signatures, and compare them back against the original visual nodes to verify:
  - Total resource count thresholds.
  - Compute platform alignment.
  - Subnet matching.
  - Database provisioning.
  Returns actionable warnings to the frontend if any architectural drift is detected.

---

## 3. AI Validation & Completeness Scoring (Phase 3)

We integrated an advisory AI validation layer and a multi-dimensional architecture completeness scoring system:
* **Dynamic Node Costing**: Created `compute_node_cost` to calculate monthly costs per node based on cloud provider, region, SKU size, database tier, replica count, and attached storage.
* **Completeness Scores**: Calculates five weighted metrics returned in the API response:
  - **Security Score** (starts at 100; penalized for missing Key Vaults, WAF policies, NSGs, Private Endpoints, or DDoS plans).
  - **Reliability Score** (penalized for missing database replicas, backup vaults, or HPAs).
  - **Cost Efficiency Score** (penalized for overall costs exceeding budget or overengineered configurations).
  - **Terraform Alignment Score** (penalized for any HCL round-trip drift warnings).
  - **Architecture Score** (overall weighted average of the above).
* **Advisory AI Validation Agent**: Created `run_ai_validation_agent` to inspect nodes and edges, returning best-practice recommendations (e.g., "AKS node pools should use Availability Zones," "Redis should use Premium tier for HA," etc.).
* **Frontend UI Enhancements**: Integrated a Metrics Row (displaying score meters) and a Validation Center in [page.tsx](file:///c:/Users/Admin/Desktop/ArchGen-Microservices/archgen-frontend/app/dashboard/page.tsx) that renders Terraform drift warnings and AI validation recommendations.

---

## 4. Canvas-to-HCL Bidirectional Sync (Phase 4)

We turned the static code viewer into an interactive bidirectional editor:
* **Expanded Hook Parsing**: Upgraded `handleHclCodeChange` in [useArchitecture.ts](file:///c:/Users/Admin/Desktop/ArchGen-Microservices/archgen-frontend/hooks/useArchitecture.ts) to parse HCL code edits across **7 sync dimensions** and update the canvas:
  1. **AKS Nodes Count**: Updates replica label and metadata.
  2. **PostgreSQL SKU**: Mapped to General Purpose / Memory Optimized tier and monthly cost.
  3. **VNet CIDR**: Adjusts primary VNet network address labels.
  4. **Subnet CIDRs**: Updates respective subnet group network ranges.
  5. **VM sizing**: Mapped to compute instance virtual sizes.
  6. **Redis SKU**: Standard vs Premium capacity tiers.
  7. **Replicas count**: Maps Container App / Pod autoscaler parameters to canvas node metadata.
* **Service Registry Sync**: Added `rebuild_services_registry` to dynamically compile and update registered services in the metadata based on the final nodes on the canvas.

---

## 5. Pure AI Enhancement Output (Phase 5)

We refined the optional AI Enhancement Layer (which executes if a valid LLM provider is active) to return **pure AI-designed topologies**:
* **Bypassed Deterministic Injection**: If the AI planner agent successfully designs a topology, the API bypasses `ensure_container_nodes` (which injected default templates) and `post_process_nodes` (which forced deterministic coordinate layouts and labels).
* **AI Layout & Coordinates Preservation**: Retains the AI agent's designed node names, IDs, coordinates, and network layout.
* **Minimal Safety Sanitization**: Implemented a light-weight pass on AI nodes to guarantee frontend-required parameters (`position`, `style`, `data`) exist without overriding custom layouts or labels.
* **AI Resource Deduplication**: Runs `deduplicate_shared_resources` on the AI topology, ensuring that if the AI planner generates duplicate shared Key Vaults, Storage Accounts, or Monitor instances, they are cleaned up.
* **Cache Management**: Set `CACHE_ENABLED=false` in the [architecture-service .env](file:///c:/Users/Admin/Desktop/ArchGen-Microservices/architecture-service/.env) file to disable caching by default so that changes to the generator are processed fresh.

---

## 6. Verification and Test Coverage

We created automated test suites to E2E verify the implementation:
* **E2E Validation Suite**: [verify_all_phases.py](file:///C:/Users/Admin/.gemini/antigravity-ide/brain/a8f6b128-01b4-4f9e-88f7-f010d55f3791/scratch/verify_all_phases.py) validates all 36 E2E correctness gates, Terraform compilers, completeness scores, and frontend patterns.
* **AI Merge & Pure Output Suite**: [verify_ai_merge.py](file:///C:/Users/Admin/.gemini/antigravity-ide/brain/a8f6b128-01b4-4f9e-88f7-f010d55f3791/scratch/verify_ai_merge.py) patches LLM agents and E2E verifies that pure AI output delivers clean, un-merged, and sanitized topologies with filtered orphan edges.
