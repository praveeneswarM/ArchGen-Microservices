output "vnet_id" {
  value       = azurerm_virtual_network.vnet.id
  description = "The ID of the virtual network"
}

output "vnet_name" {
  value       = azurerm_virtual_network.vnet.name
  description = "The name of the virtual network"
}

output "subnet_ids" {
  value       = { for k, v in azurerm_subnet.subnet : k => v.id }
  description = "A map of subnet keys to their IDs"
}

output "nsg_ids" {
  value       = { for k, v in azurerm_network_security_group.nsg : k => v.id }
  description = "A map of NSG IDs by subnet key"
}

output "route_table_ids" {
  value       = { for k, v in azurerm_route_table.route_table : k => v.id }
  description = "A map of Route Table IDs by subnet key"
}
