# ArchGen Enterprise Infrastructure – Implementation & Design Review

This document reviews the architectural decisions, structural topologies, security frameworks, and disaster recovery strategies implemented for the **ArchGen Platform** on Microsoft Azure.

---

## 1. Generated Infrastructure Resources

The Terraform modular stack provisions the following Azure resources across the two workspaces (`dev`, `prod`):

*   **Azure Resource Groups**: Separated environment groups (`rg-archgen-dev`, etc.) plus state repository `RG-TFSTATE`.
*   **Virtual Networks (VNets)**: Dynamically subnetted CIDRs (e.g. `10.10.0.0/16`) with:
    *   `subnet-ingress`: Associated with Application Gateway WAF.
    *   `subnet-app`: Reserved for AKS cluster nodes.
    *   `subnet-data`: Private endpoint nodes.
    *   `subnet-mgmt`: Private Management VM.
    *   `subnet-pe`: PaaS Private Link interfaces.
    *   `AzureBastionSubnet`: Azure Bastion Host IP allocation.
*   **Azure Kubernetes Service (AKS)**: Private cluster with:
    *   OIDC Issuer and Workload Identity enabled.
    *   Azure CNI dynamic pod networking.
    *   System Node Pool (`systempool`) & User Node Pool (`userpool`) with autoscaling.
*   **Application Gateway WAF v2**: Public ingress node with OWASP 3.2 prevention policies.
*   **Azure Container Registry (ACR)**: Premium registry with private endpoint, integrated with AKS using `AcrPull` role assignments.
*   **Azure Cosmos DB**: Global DocumentDB with automatic failover, multi-region replication, and periodic backup policies.
*   **Azure Key Vault**: Secrets repository with Azure RBAC authentication and public access disabled.
*   **Azure Bastion Host**: Standard host with tunneling enabled for secure management.
*   **Azure Management VM**: Linux virtual machine (`Standard_B2s`) used for cluster administration.
*   **Monitoring Suite**: Log Analytics Workspace, Application Insights, Azure Managed Prometheus, and Azure Managed Grafana.
*   **Disaster Recovery Suite**: Geo-redundant Recovery Services Vault (RSV) and Data Protection Backup Vault (GRS redundancy).
*   **Terraform Backend Storage**: GRS storage account with versioning and soft delete in `RG-TFSTATE`.

---

## 2. Architecture & Design Decisions

### Kubernetes Sizing & Node Decisions
- **Standardization on AKS**: The platform runs several distinct microservices (Frontend, API Gateway, Auth, Project, and Architecture Services). Managing these via AKS guarantees high scalability, container orchestration, and seamless microservice communication.
- **Node Pool Separation**:
    *   `systempool`: Isolated for core Kubernetes system workloads (CoreDNS, metrics server, CSI drivers) to prevent user workloads from starving system services. Size: `Standard_DS2_v2` (2 vCPUs, 8 GB RAM).
    *   `userpool`: Scales dynamically (2 to 5 nodes) based on CPU/memory load. VM size: `Standard_DS3_v2` (4 vCPUs, 16 GB RAM) to support high-throughput AI agent scheduling and Terraform parsing.

### Networking Decisions
- **Dynamic Subnetting (Application-First)**: Subnets are constructed dynamically inside the networking module via `for_each` loops. This permits the AI engine to add, remove, or resize subnets based on environment demands without altering core Terraform modules.
- **Security-First CIDR Segmentation**:
    *   Bastion and Gateway resources are isolated in small subnets (`/26` or `/24`).
    *   The AKS nodes and pods occupy a large `/23` block to support high pod densities under Azure CNI.
- **No Service Meshes**: Security policies are implemented using native Azure controls (NSGs, Route Tables) instead of complex meshes (Istio/Calico), reducing latency and administrative overhead.

### Security Decisions
- **Private Access Boundary**: AKS API Server has no public endpoint. All administration is performed from the private Management VM, which is accessed only via Bastion SSH tunnels.
- **Modern RBAC Secrets Integration**:
    *   Key Vault uses **Azure RBAC** (`enable_rbac_authorization = true`) instead of legacy Access Policies.
    *   AKS workloads leverage **Workload Identity** (OIDC federated credentials mapped to Kubernetes Service Accounts).
    *   The **CSI Secret Store Driver** mounts secrets as in-memory volumes in the pods, ensuring credentials are never exposed in YAML files or container image layers.
- **Enforced TLS Termination**: The WAF Application Gateway performs TLS termination, allowing it to inspect payloads before forwarding traffic to AGIC inside the VNet.

### Cosmos DB Decisions
- **High Availability**: Configured with automatic failover and geo-replication (primary region `eastus`, secondary failover `westus2`).
- **Private Link Networking**: Restricts access via `public_network_access_enabled = false` and links a private endpoint inside `subnet-pe` with Private DNS Zones, ensuring database traffic never traverses the public internet.

### Disaster Recovery & Backup Decisions
- **RTO & RPO Targets**:
    *   Availability: **99.99%**
    *   RPO (Recovery Point Objective): **1 Hour** (met by GRS state backups, GRS Backup Vaults, and Cosmos DB staleness window constraints).
    *   RTO (Recovery Time Objective): **4 Hours** (met by geo-redundant vault storage and ready-to-run environment Terraform modules in secondary regions).
- **RSV & Storage Tiers**: The Recovery Services Vault uses GRS (Geo-Redundant Storage) to replicate VM and system backups to the paired region automatically.

### Cost Optimization (FinOps) Decisions
- **Autoscaling**: User node pools scale to zero or minimum when inactive.
- **Standard Sizing**: Bastion Management VM uses a low-cost `Standard_B2s` profile (ideal for management workloads).
- **Periodic Tiers**: Cosmos DB uses Session consistency and periodic backup intervals instead of expensive continuous backup options, reducing monthly costs while maintaining compliance.

---

## 3. Core Assumptions & Future Improvements

### Assumptions Made
1. **Azure Active Directory**: The tenant ID is configured to coordinate with User Assigned Managed Identities for Workload Identity mapping.
2. **Bastion Tunneling**: Admin users run SSH tunneling from their local machines via Azure CLI to establish secure `kubectl` connections to the private AKS cluster.
3. **Private DNS Zone link**: Azure virtual network links are fully established across all PaaS private endpoints.

### Future Improvements
1. **Private Link for Management**: Set up Private Endpoint for the Azure Container Registry in a separate hub-spoke VNet if multi-tenant ACR sharing is required.
2. **Prometheus Alerting**: Define alert rule templates in Log Analytics to trigger SMS/Email notifications on container OOMKilled events.
3. **Secondary Region Cold-Standby**: Create a passive AKS node pool in the secondary failover region for instant infrastructure failover in active-passive DR configurations.
