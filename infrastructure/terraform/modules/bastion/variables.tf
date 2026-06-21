variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target region location"
}

variable "bastion_name" {
  type        = string
  description = "Name of the Azure Bastion host"
}

variable "subnet_id" {
  type        = string
  description = "The subnet ID for AzureBastionSubnet (must be named AzureBastionSubnet)"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to Bastion"
  default     = {}
}
