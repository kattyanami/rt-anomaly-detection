terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = { # Used for generating unique suffixes for resource names
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket = "rt-anomaly-detection-terraform-state"
    key    = "terraform.tfstate"
    region = "eu-west-2"
  }
}

provider "aws" {
  region = var.aws_region
}

# Generate a random suffix for resource names to ensure uniqueness
resource "random_id" "suffix" {
  byte_length = 4
}

########################
# S3 BUCKETS
########################

# Raw transactions bucket
resource "aws_s3_bucket" "raw_transactions" {
  bucket = "${var.project_name}-raw-${random_id.suffix.hex}"

  tags = {
    Project = var.project_name
    Purpose = "raw-transactions"
  }
}

resource "aws_s3_bucket_versioning" "raw_transactions" {
  bucket = aws_s3_bucket.raw_transactions.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_transactions" {
  bucket = aws_s3_bucket.raw_transactions.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

########################
# S3 BUCKET FOR MODELS
########################

resource "aws_s3_bucket" "models" {
  bucket = "${var.project_name}-models-${random_id.suffix.hex}"

  tags = {
    Project = var.project_name
    Purpose = "ml-models"
  }
}

resource "aws_s3_bucket_versioning" "models" {
  bucket = aws_s3_bucket.models.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "models" {
  bucket = aws_s3_bucket.models.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Processed transactions bucket (for later)
resource "aws_s3_bucket" "processed_transactions" {
  bucket = "${var.project_name}-processed-${random_id.suffix.hex}"

  tags = {
    Project = var.project_name
    Purpose = "processed-transactions"
  }
}

resource "aws_s3_bucket_versioning" "processed_transactions" {
  bucket = aws_s3_bucket.processed_transactions.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "processed_transactions" {
  bucket = aws_s3_bucket.processed_transactions.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

########################
# DYNAMODB – FLAGGED ANOMALIES
########################

resource "aws_dynamodb_table" "anomalies" {
  name         = "${var.project_name}-anomalies"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "transaction_id"

  attribute {
    name = "transaction_id"
    type = "S"
  }

  tags = {
    Project = var.project_name
    Purpose = "flagged-anomalies"
  }
}

########################
# IAM ROLE FOR LAMBDA
########################

resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Basic Lambda execution (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Inline policy: S3 + DynamoDB access+sagemaker_endpoint_name
resource "aws_iam_role_policy" "lambda_data_access" {
  name = "${var.project_name}-lambda-data-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.raw_transactions.arn,
          "${aws_s3_bucket.raw_transactions.arn}/*",
          aws_s3_bucket.processed_transactions.arn,
          "${aws_s3_bucket.processed_transactions.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.anomalies.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sagemaker:InvokeEndpoint"
        ]
        Resource = "arn:aws:sagemaker:${var.aws_region}:*:endpoint/${var.project_name}-iforest-endpoint"
      }
    ]
  })
}

########################
# TRANSACTION PROCESSOR LAMBDA
########################

resource "aws_lambda_function" "transaction_processor" {
  function_name = "${var.project_name}-transaction-processor"
  role          = aws_iam_role.lambda_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 60

  filename         = "${path.module}/../backend/transaction_processor/transaction_processor.zip"
  source_code_hash = filebase64sha256("${path.module}/../backend/transaction_processor/transaction_processor.zip")

  environment {
    variables = {
      RAW_BUCKET           = aws_s3_bucket.raw_transactions.bucket
      ANOMALIES_TABLE_NAME = aws_dynamodb_table.anomalies.name
    }
  }

  tags = {
    Project = var.project_name
    Purpose = "transaction-processing"
  }
}

########################
# S3 → LAMBDA NOTIFICATION
########################

resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transaction_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.raw_transactions.arn
}

resource "aws_s3_bucket_notification" "raw_transactions_notification" {
  bucket = aws_s3_bucket.raw_transactions.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.transaction_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw/"
    filter_suffix       = ".json"
  }

  depends_on = [
    aws_lambda_permission.allow_s3_invoke
  ]
}

########################
# SAGEMAKER MODEL & ENDPOINT
########################

# IAM role SageMaker uses to access S3
resource "aws_iam_role" "sagemaker_role" {
  name = "${var.project_name}-sagemaker-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "sagemaker.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "sagemaker_s3_access" {
  name = "${var.project_name}-sagemaker-s3-access"
  role = aws_iam_role.sagemaker_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.models.arn,
          "${aws_s3_bucket.models.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# SageMaker Model
resource "aws_sagemaker_model" "anomaly_model" {
  name               = "${var.project_name}-iforest-model"
  execution_role_arn = aws_iam_role.sagemaker_role.arn

  primary_container {
    image          = "763104351884.dkr.ecr.eu-west-2.amazonaws.com/pytorch-inference:2.1.0-cpu-py310-ubuntu20.04-sagemaker"
    mode           = "SingleModel"
    model_data_url = "s3://${aws_s3_bucket.models.bucket}/model/model.tar.gz"
  }

  tags = {
    Project = var.project_name
    Purpose = "isolation-forest-anomaly"
  }
}

# Endpoint config
resource "aws_sagemaker_endpoint_configuration" "anomaly_endpoint_config" {
  name = "${var.project_name}-iforest-config"

  production_variants {
    variant_name           = "AllTraffic"
    model_name             = aws_sagemaker_model.anomaly_model.name
    initial_instance_count = 1
    instance_type          = "ml.t2.medium"
  }

  tags = {
    Project = var.project_name
  }
}

# Endpoint
resource "aws_sagemaker_endpoint" "anomaly_endpoint" {
  name                 = "${var.project_name}-iforest-endpoint"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.anomaly_endpoint_config.name

  tags = {
    Project = var.project_name
  }
}