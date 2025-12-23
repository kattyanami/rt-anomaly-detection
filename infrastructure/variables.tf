variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-west-2" # London
}

variable "project_name" {
  description = "Base name for project resources"
  type        = string
  default     = "rt-anomaly-detection"
}