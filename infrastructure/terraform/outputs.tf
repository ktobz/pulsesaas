# ── Terraform Outputs ──
output "postgres_url" {
  value     = "postgresql://saas_admin:${var.db_password}@${aws_db_instance.postgres.endpoint}/saas"
  sensitive = true
}

output "redis_url" {
  value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"
}

output "mongo_url" {
  value     = "mongodb://saas_admin:${var.db_password}@${aws_docdb_cluster.mongo.endpoint}:27017/saas"
  sensitive = true
}

output "api_base_url" {
  value = "https://api.${var.domain_name}"
}
