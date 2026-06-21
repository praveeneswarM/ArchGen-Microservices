variable "resource_group_name" {
  type        = string
  description = "The name of the Azure resource group"
}

variable "location" {
  type        = string
  description = "The target Azure region location"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to resource group"
  default     = {}
}
