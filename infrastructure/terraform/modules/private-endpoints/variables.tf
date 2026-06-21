variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target region location"
}

variable "endpoint_name" {
  type        = string
  description = "Name of the Private Endpoint"
}

variable "subnet_id" {
  type        = string
  description = "The Subnet ID (subnet-pe) to associate"
}

variable "target_resource_id" {
  type        = string
  description = "Target PaaS Resource ID to connect"
}

variable "subresource_names" {
  type        = list(string)
  description = "Private link subresource names (e.g. ['vault'], ['registry'], ['Sql'])"
}

variable "private_dns_zone_group_name" {
  type        = string
  description = "Name for DNS zone association group"
  default     = "default"
}

variable "private_dns_zone_ids" {
  type        = list(string)
  description = "Target Private DNS Zone IDs for mapping automatic records"
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to Private Endpoints"
  default     = {}
}
