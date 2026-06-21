output "workspace_id" {
  value       = azurerm_log_analytics_workspace.law.id
  description = "The ID of the Log Analytics Workspace"
}

output "workspace_name" {
  value       = azurerm_log_analytics_workspace.law.name
  description = "The name of the Log Analytics Workspace"
}

output "instrumentation_key" {
  value       = azurerm_application_insights.app_insights.instrumentation_key
  description = "The instrumentation key of Application Insights"
  sensitive   = true
}

output "connection_string" {
  value       = azurerm_application_insights.app_insights.connection_string
  description = "The connection string of Application Insights"
  sensitive   = true
}

output "prometheus_id" {
  value       = azurerm_monitor_workspace.prometheus.id
  description = "The ID of the Managed Prometheus workspace"
}

output "grafana_endpoint" {
  value       = azurerm_dashboard_grafana.grafana.endpoint
  description = "The endpoint URL of the Managed Grafana instance"
}
