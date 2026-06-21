terraform {
  backend "azurerm" {
    resource_group_name  = "RG-TFSTATE"
    storage_account_name = "saarchgentfstateprod"
    container_name       = "tfstate"
    key                  = "prod.tfstate"
  }
}

module "resource_group" {
  source              = "../../modules/resource-group"
  resource_group_name = "rg-${var.project_name}-${var.environment}"
  location            = var.location
  tags                = var.tags
}

module "networking" {
  source              = "../../modules/networking"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  vnet_name           = "vnet-${var.project_name}-${var.environment}"
  vnet_address_space  = [var.vnet_cidr]
  subnets             = var.subnet_configurations
  tags                = var.tags
}

module "aks" {
  source              = "../../modules/aks"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  cluster_name        = "aks-${var.project_name}-${var.environment}"
  dns_prefix          = "${var.project_name}${var.environment}"
  vnet_subnet_id      = module.networking.subnet_ids["subnet-app"]
  tags                = var.tags
}

module "acr" {
  source                    = "../../modules/acr"
  resource_group_name       = module.resource_group.name
  location                  = module.resource_group.location
  acr_name                  = "acr${var.project_name}${var.environment}"
  aks_identity_principal_id = module.aks.cluster_identity_object_id
  tags                      = var.tags
}

module "cosmosdb" {
  source              = "../../modules/cosmosdb"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  cosmos_account_name = "cosmos-${var.project_name}-${var.environment}"
  failover_location   = var.failover_location
  tags                = var.tags
}

module "keyvault" {
  source              = "../../modules/keyvault"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  keyvault_name       = "kv-${var.project_name}-${var.environment}"
  tenant_id           = var.tenant_id
  tags                = var.tags
}

module "application_gateway" {
  source              = "../../modules/application-gateway"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  app_gateway_name    = "apgw-${var.project_name}-${var.environment}"
  subnet_id           = module.networking.subnet_ids["subnet-ingress"]
  tags                = var.tags
}

module "bastion" {
  source              = "../../modules/bastion"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  bastion_name        = "bastion-${var.project_name}-${var.environment}"
  subnet_id           = module.networking.subnet_ids["AzureBastionSubnet"]
  tags                = var.tags
}

module "management_vm" {
  source              = "../../modules/vm"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  vm_name             = "vm-${var.project_name}-${var.environment}-mgmt"
  subnet_id           = module.networking.subnet_ids["subnet-mgmt"]
  ssh_public_key      = var.ssh_public_key
  tags                = var.tags
}

module "monitoring" {
  source              = "../../modules/monitoring"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  workspace_name      = "law-${var.project_name}-${var.environment}"
  app_insights_name   = "appi-${var.project_name}-${var.environment}"
  prometheus_name     = "prom-${var.project_name}-${var.environment}"
  grafana_name        = "graf-${var.project_name}-${var.environment}"
  tags                = var.tags
}

module "backup" {
  source              = "../../modules/backup"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  rsv_name            = "rsv-${var.project_name}-${var.environment}"
  backup_vault_name   = "bkv-${var.project_name}-${var.environment}"
  tags                = var.tags
}

# --- Private Endpoint Linkages & Private DNS Zones ---

resource "azurerm_private_dns_zone" "dns_cosmos" {
  name                = "privatelink.documents.azure.com"
  resource_group_name = module.resource_group.name
}

resource "azurerm_private_dns_zone" "dns_vault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = module.resource_group.name
}

resource "azurerm_private_dns_zone" "dns_acr" {
  name                = "privatelink.azurecr.io"
  resource_group_name = module.resource_group.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "vnet_link_cosmos" {
  name                  = "link-cosmos"
  resource_group_name   = module.resource_group.name
  private_dns_zone_name = azurerm_private_dns_zone.dns_cosmos.name
  virtual_network_id    = module.networking.vnet_id
}

resource "azurerm_private_dns_zone_virtual_network_link" "vnet_link_vault" {
  name                  = "link-vault"
  resource_group_name   = module.resource_group.name
  private_dns_zone_name = azurerm_private_dns_zone.dns_vault.name
  virtual_network_id    = module.networking.vnet_id
}

resource "azurerm_private_dns_zone_virtual_network_link" "vnet_link_acr" {
  name                  = "link-acr"
  resource_group_name   = module.resource_group.name
  private_dns_zone_name = azurerm_private_dns_zone.dns_acr.name
  virtual_network_id    = module.networking.vnet_id
}

module "pe_cosmos" {
  source               = "../../modules/private-endpoints"
  resource_group_name  = module.resource_group.name
  location             = module.resource_group.location
  endpoint_name        = "pe-cosmos-${var.project_name}-${var.environment}"
  subnet_id            = module.networking.subnet_ids["subnet-pe"]
  target_resource_id   = module.cosmosdb.id
  subresource_names    = ["Sql"]
  private_dns_zone_ids = [azurerm_private_dns_zone.dns_cosmos.id]
  tags                 = var.tags
}

module "pe_keyvault" {
  source               = "../../modules/private-endpoints"
  resource_group_name  = module.resource_group.name
  location             = module.resource_group.location
  endpoint_name        = "pe-kv-${var.project_name}-${var.environment}"
  subnet_id            = module.networking.subnet_ids["subnet-pe"]
  target_resource_id   = module.keyvault.id
  subresource_names    = ["vault"]
  private_dns_zone_ids = [azurerm_private_dns_zone.dns_vault.id]
  tags                 = var.tags
}

module "pe_acr" {
  source               = "../../modules/private-endpoints"
  resource_group_name  = module.resource_group.name
  location             = module.resource_group.location
  endpoint_name        = "pe-acr-${var.project_name}-${var.environment}"
  subnet_id            = module.networking.subnet_ids["subnet-pe"]
  target_resource_id   = module.acr.id
  subresource_names    = ["registry"]
  private_dns_zone_ids = [azurerm_private_dns_zone.dns_acr.id]
  tags                 = var.tags
}
