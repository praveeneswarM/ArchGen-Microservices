variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target region location"
}

variable "rsv_name" {
  type        = string
  description = "Recovery Services Vault name"
}

variable "backup_vault_name" {
  type        = string
  description = "Data Protection Backup Vault name"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to backup resources"
  default     = {}
}
