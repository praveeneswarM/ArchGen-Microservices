resource "azurerm_log_analytics_workspace" "law" {
  name                = var.workspace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_application_insights" "app_insights" {
  name                = var.app_insights_name
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.law.id
  application_type    = "web"
  tags                = var.tags
}

resource "azurerm_monitor_workspace" "prometheus" {
  name                = var.prometheus_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_dashboard_grafana" "grafana" {
  name                = var.grafana_name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Standard"
  grafana_major_version = 11
  tags                = var.tags

  identity {
    type = "SystemAssigned"
  }
}
