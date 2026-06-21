variable "resource_group_name" {
  type        = string
  description = "The separate resource group name for state files"
  default     = "RG-TFSTATE"
}

variable "location" {
  type        = string
  description = "The target region location"
  default     = "eastus"
}

variable "storage_account_name" {
  type        = string
  description = "Unique storage account name for state tracking"
}

variable "container_name" {
  type        = string
  description = "Storage container name"
  default     = "tfstate"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to backend state resources"
  default     = {}
}
