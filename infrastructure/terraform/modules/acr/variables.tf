variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target region location"
}

variable "acr_name" {
  type        = string
  description = "Name of the Container Registry"
}

variable "aks_identity_principal_id" {
  type        = string
  description = "The Principal ID of the AKS cluster to grant pull permissions"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to ACR"
  default     = {}
}
