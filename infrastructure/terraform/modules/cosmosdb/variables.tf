variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The primary regional location"
}

variable "cosmos_account_name" {
  type        = string
  description = "The name of the Cosmos DB account"
}

variable "failover_location" {
  type        = string
  description = "The secondary region to fail over to for DR replication"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to Cosmos DB"
  default     = {}
}
