resource "azurerm_kubernetes_cluster" "aks" {
  name                    = var.cluster_name
  location                = var.location
  resource_group_name     = var.resource_group_name
  dns_prefix              = var.dns_prefix
  private_cluster_enabled = true

  default_node_pool {
    name           = "systempool"
    node_count     = var.system_node_count
    vm_size        = var.system_node_size
    vnet_subnet_id = var.vnet_subnet_id
    tags           = var.tags
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    # Kubernetes network policies are out of scope (using native Azure controls)
  }

  # Enable OIDC Issuer and Workload Identity
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  tags = var.tags
}

resource "azurerm_kubernetes_cluster_node_pool" "userpool" {
  name                  = "userpool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = var.user_node_size
  vnet_subnet_id        = var.vnet_subnet_id
  
  # Enable Cluster Autoscaler
  auto_scaling_enabled  = true
  min_count             = var.user_node_min_count
  max_count             = var.user_node_max_count

  tags = var.tags
}
