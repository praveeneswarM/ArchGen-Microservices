variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target location region"
}

variable "cluster_name" {
  type        = string
  description = "The name of the private AKS cluster"
}

variable "dns_prefix" {
  type        = string
  description = "DNS prefix for API server"
}

variable "vnet_subnet_id" {
  type        = string
  description = "The subnet ID where the cluster nodes will be provisioned"
}

variable "system_node_count" {
  type        = number
  description = "Size of the system pool"
  default     = 2
}

variable "system_node_size" {
  type        = string
  description = "VM SKU for system nodes"
  default     = "Standard_DS2_v2"
}

variable "user_node_min_count" {
  type        = number
  description = "Min auto-scale user nodes"
  default     = 2
}

variable "user_node_max_count" {
  type        = number
  description = "Max auto-scale user nodes"
  default     = 5
}

variable "user_node_size" {
  type        = string
  description = "VM SKU for user nodes"
  default     = "Standard_DS3_v2"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to cluster resources"
  default     = {}
}
