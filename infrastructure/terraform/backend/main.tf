resource "azurerm_resource_group" "rg_tfstate" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_storage_account" "sa_tfstate" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg_tfstate.name
  location                 = azurerm_resource_group.rg_tfstate.location
  account_tier             = "Standard"
  account_replication_type = "GRS" # Geo-Redundant for DR state reliability

  min_tls_version                 = "TLS1_2"
  public_network_access_enabled   = true # Enable for admin state provisioning, can be private endpoints restricted later

  blob_properties {
    versioning_enabled  = true
    change_feed_enabled = true

    delete_retention_policy {
      days = 7 # Soft delete
    }
  }

  tags = var.tags
}

resource "azurerm_storage_container" "container" {
  name                  = var.container_name
  storage_account_name  = azurerm_storage_account.sa_tfstate.name
  container_access_type = "private"
}
