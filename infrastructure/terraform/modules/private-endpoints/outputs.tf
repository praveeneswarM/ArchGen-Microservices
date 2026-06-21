output "id" {
  value       = azurerm_private_endpoint.pe.id
  description = "The ID of the private endpoint"
}

output "private_ip" {
  value       = azurerm_private_endpoint.pe.custom_dns_configs[0].ip_addresses[0]
  description = "The first resolved IP address from DNS configuration of private endpoint"
}
