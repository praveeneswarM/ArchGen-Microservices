output "id" {
  value       = azurerm_key_vault.kv.id
  description = "The ID of the Key Vault"
}

output "vault_uri" {
  value       = azurerm_key_vault.kv.vault_uri
  description = "The URI of the Key Vault"
}

output "tenant_id" {
  value       = azurerm_key_vault.kv.tenant_id
  description = "The Tenant ID of the Key Vault"
}
