output "resource_group_name" {
  value       = module.resource_group.name
  description = "Name of the resource group"
}

output "vnet_name" {
  value       = module.networking.vnet_name
  description = "Name of the Virtual Network"
}

output "subnet_ids" {
  value       = module.networking.subnet_ids
  description = "Mapping of subnet names to Azure IDs"
}

output "aks_cluster_name" {
  value       = module.aks.cluster_name
  description = "The AKS cluster name"
}

output "application_gateway_id" {
  value       = module.application_gateway.id
  description = "Application Gateway resource ID"
}

output "application_gateway_ip" {
  value       = module.application_gateway.public_ip_address
  description = "Application Gateway public entrypoint IP"
}

output "cosmosdb_endpoint" {
  value       = module.cosmosdb.endpoint
  description = "Endpoint of Cosmos DB account"
}

output "keyvault_uri" {
  value       = module.keyvault.vault_uri
  description = "Vault URI of Key Vault"
}

output "acr_login_server" {
  value       = module.acr.login_server
  description = "Container Registry login endpoint"
}

output "bastion_dns_name" {
  value       = module.bastion.dns_name
  description = "The FQDN of the Bastion host"
}

output "management_vm_ip" {
  value       = module.management_vm.private_ip
  description = "Private IP of the cluster admin VM"
}

output "grafana_endpoint" {
  value       = module.monitoring.grafana_endpoint
  description = "Azure Managed Grafana portal URL"
}
