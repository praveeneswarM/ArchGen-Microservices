variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target region location"
}

variable "workspace_name" {
  type        = string
  description = "Log Analytics Workspace name"
}

variable "app_insights_name" {
  type        = string
  description = "Application Insights resource name"
}

variable "prometheus_name" {
  type        = string
  description = "Azure Monitor Managed Prometheus workspace name"
}

variable "grafana_name" {
  type        = string
  description = "Azure Managed Grafana instance name"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to monitoring resources"
  default     = {}
}
