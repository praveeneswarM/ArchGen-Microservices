variable "resource_group_name" {
  type        = string
  description = "The target resource group name"
}

variable "location" {
  type        = string
  description = "The target region location"
}

variable "vm_name" {
  type        = string
  description = "Name of the virtual machine"
}

variable "subnet_id" {
  type        = string
  description = "The ID of the subnet where the VM will reside"
}

variable "vm_size" {
  type        = string
  description = "The VM size/SKU"
  default     = "Standard_B2s"
}

variable "admin_username" {
  type        = string
  description = "The SSH admin username"
  default     = "azureuser"
}

variable "ssh_public_key" {
  type        = string
  description = "SSH public key for administration access"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to VM"
  default     = {}
}
