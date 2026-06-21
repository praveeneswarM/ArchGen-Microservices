variable "resource_group_name" {
  type        = string
  description = "Name of the target resource group"
}

variable "location" {
  type        = string
  description = "Target Azure region location"
}

variable "vnet_name" {
  type        = string
  description = "Name of the virtual network"
}

variable "vnet_address_space" {
  type        = list(string)
  description = "Address prefixes for the virtual network"
  default     = ["10.0.0.0/16"]
}

variable "subnets" {
  type = map(object({
    address_prefixes                              = list(string)
    service_endpoints                             = optional(list(string), [])
    private_endpoint_network_policies             = optional(string, "Enabled")
    private_link_service_network_policies_enabled = optional(bool, true)
    delegate_db                                   = optional(bool, false)
  }))
  description = "Dynamic map of subnet configurations"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
