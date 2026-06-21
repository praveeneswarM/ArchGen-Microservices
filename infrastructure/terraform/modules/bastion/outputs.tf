output "id" {
  value       = azurerm_bastion_host.bastion.id
  description = "The ID of the Bastion host"
}

output "dns_name" {
  value       = azurerm_bastion_host.bastion.dns_name
  description = "The FQDN of the Bastion host"
}
