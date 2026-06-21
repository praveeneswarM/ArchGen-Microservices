resource "azurerm_recovery_services_vault" "rsv" {
  name                = var.rsv_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"
  storage_mode_type   = "GeoRedundant" # Geo Redundant Storage (GRS)
  tags                = var.tags
}

resource "azurerm_data_protection_backup_vault" "backup_vault" {
  name                = var.backup_vault_name
  resource_group_name = var.resource_group_name
  location            = var.location
  datastore_type      = "VaultStore"
  redundancy          = "GeoRedundant" # Geo Redundant Storage (GRS)

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}
