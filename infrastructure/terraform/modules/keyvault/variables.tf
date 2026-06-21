variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target region location"
}

variable "keyvault_name" {
  type        = string
  description = "The name of the Key Vault"
}

variable "tenant_id" {
  type        = string
  description = "The Azure Active Directory Tenant ID"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to Key Vault"
  default     = {}
}
