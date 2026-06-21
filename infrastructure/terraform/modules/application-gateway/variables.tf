variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target region location"
}

variable "app_gateway_name" {
  type        = string
  description = "The name of the Application Gateway"
}

variable "subnet_id" {
  type        = string
  description = "The subnet ID for the Application Gateway"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to gateway"
  default     = {}
}
