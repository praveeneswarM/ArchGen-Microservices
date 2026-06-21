output "id" {
  value       = azurerm_linux_virtual_machine.vm.id
  description = "The ID of the virtual machine"
}

output "private_ip" {
  value       = azurerm_network_interface.vm_nic.ip_configuration[0].private_ip_address
  description = "The private IP address of the virtual machine"
}
