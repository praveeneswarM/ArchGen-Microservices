output "cluster_id" {
  value       = azurerm_kubernetes_cluster.aks.id
  description = "The ID of the AKS cluster"
}

output "cluster_name" {
  value       = azurerm_kubernetes_cluster.aks.name
  description = "The name of the AKS cluster"
}

output "oidc_issuer_url" {
  value       = azurerm_kubernetes_cluster.aks.oidc_issuer_url
  description = "The OIDC Issuer URL of the cluster"
}

output "kube_config_raw" {
  value       = azurerm_kubernetes_cluster.aks.kube_config_raw
  description = "Raw Kubernetes configuration"
  sensitive   = true
}

output "cluster_identity_object_id" {
  value       = azurerm_kubernetes_cluster.aks.identity[0].principal_id
  description = "SystemAssigned Principal ID for AKS"
}
