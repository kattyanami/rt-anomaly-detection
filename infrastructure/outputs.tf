output "aws_region" {
  description = "The AWS region where resources are deployed."
  value       = var.aws_region
}

output "project_prefix" {
  description = "The prefix used for all project resources."
  value       = "${var.project_name}-${random_id.suffix.hex}"
}

output "raw_transactions_bucket" {
  value       = aws_s3_bucket.raw_transactions.bucket
  description = "S3 bucket for raw transaction batches"
}

output "processed_transactions_bucket" {
  value       = aws_s3_bucket.processed_transactions.bucket
  description = "S3 bucket for processed transaction data"
}

output "anomalies_table_name" {
  value       = aws_dynamodb_table.anomalies.name
  description = "DynamoDB table name for flagged anomalies"
}

output "models_bucket" {
  value       = aws_s3_bucket.models.bucket
  description = "S3 bucket for ML models"
}

output "sagemaker_endpoint_name" {
  value       = aws_sagemaker_endpoint.anomaly_endpoint.name
  description = "SageMaker endpoint name for anomaly detection"
}