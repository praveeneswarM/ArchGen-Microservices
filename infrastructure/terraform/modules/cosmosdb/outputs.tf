output "id" {
  value       = azurerm_cosmosdb_account.cosmos.id
  description = "The ID of the Cosmos DB account"
}

output "endpoint" {
  value       = azurerm_cosmosdb_account.cosmos.endpoint
  description = "The primary endpoint of the Cosmos DB account"
}

output "read_endpoints" {
  value       = azurerm_cosmosdb_account.cosmos.read_endpoints
  description = "The read endpoints of the Cosmos DB account"
}

output "write_endpoints" {
  value       = azurerm_cosmosdb_account.cosmos.write_endpoints
  description = "The write endpoints of the Cosmos DB account"
}
