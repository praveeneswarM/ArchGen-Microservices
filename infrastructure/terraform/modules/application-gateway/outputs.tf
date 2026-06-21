output "id" {
  value       = azurerm_application_gateway.appgw.id
  description = "The ID of the Application Gateway"
}

output "public_ip_address" {
  value       = azurerm_public_ip.appgw_pip.ip_address
  description = "The public IP address of the Application Gateway"
}
