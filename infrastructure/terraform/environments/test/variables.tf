variable "project_name" {
  type        = string
  description = "Name prefix for resource creation"
  default     = "archgen"
}

variable "environment" {
  type        = string
  description = "The target deployment environment (dev, test, prod)"
}

variable "location" {
  type        = string
  description = "Primary Azure region location"
  default     = "eastus"
}

variable "failover_location" {
  type        = string
  description = "Secondary Azure region location for database DR failover"
  default     = "westus2"
}

variable "vnet_cidr" {
  type        = string
  description = "Virtual Network CIDR block"
  default     = "10.0.0.0/16"
}

variable "subnet_configurations" {
  type = map(object({
    address_prefixes                              = list(string)
    service_endpoints                             = optional(list(string), [])
    private_endpoint_network_policies             = optional(string, "Enabled")
    private_link_service_network_policies_enabled = optional(bool, true)
    delegate_db                                   = optional(bool, false)
  }))
  description = "Address maps for dynamic subnet setups"
}

variable "tenant_id" {
  type        = string
  description = "The Azure Active Directory Tenant ID"
}

variable "ssh_public_key" {
  type        = string
  description = "The public key used for SSH access on the admin host VM"
}

variable "tags" {
  type        = map(string)
  description = "Default tags applied to resource deployments"
  default     = {}
}
