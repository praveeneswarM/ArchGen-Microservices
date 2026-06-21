output "rsv_id" {
  value       = azurerm_recovery_services_vault.rsv.id
  description = "The ID of the Recovery Services Vault"
}

output "backup_vault_id" {
  value       = azurerm_data_protection_backup_vault.backup_vault.id
  description = "The ID of the Backup Vault"
}

output "backup_vault_identity" {
  value       = azurerm_data_protection_backup_vault.backup_vault.identity[0].principal_id
  description = "The SystemAssigned identity object ID of the Backup Vault"
}
