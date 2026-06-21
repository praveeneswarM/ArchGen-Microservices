output "resource_group_name" {
  value       = azurerm_resource_group.rg_tfstate.name
  description = "The Resource Group name for the state storage account"
}

output "storage_account_name" {
  value       = azurerm_storage_account.sa_tfstate.name
  description = "The storage account name"
}

output "container_name" {
  value       = azurerm_storage_container.container.name
  description = "The container name for the state files"
}
