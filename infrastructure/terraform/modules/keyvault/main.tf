resource "azurerm_key_vault" "kv" {
  name                        = var.keyvault_name
  location                    = var.location
  resource_group_name         = var.resource_group_name
  enabled_for_disk_encryption = true
  tenant_id                   = var.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false

  sku_name = "standard"

  # Modern enterprise access control using Azure RBAC
  rbac_authorization_enabled = true

  # Enforce private link integration by blocking public network traffic
  public_network_access_enabled = false

  tags = var.tags
}
