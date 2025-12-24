### Real-Time Transaction Anomaly Detection Platform on AWS

This project implements a **real-time transaction anomaly detection platform** on AWS, designed to look and feel like a production‑grade system you would build in a fintech or payments company.

It combines:

- **AWS infrastructure as code** (Terraform)
- **Event-driven streaming** with S3 + Lambda
- **Machine learning** with Amazon SageMaker (Isolation Forest)
- **Continuous Integration / Deployment** with GitHub Actions (staged, approved pipeline)
- A lightweight **frontend** (React + Vite) to visualise anomalies (WIP / optional)

---

#### 1. Problem & Motivation

Modern payment systems generate thousands of transactions per second. Manually reviewing them is impossible, and naive rule-based systems generate large numbers of false positives.

This project demonstrates how to:

- Ingest transaction data in near real time
- Run an **ML-based anomaly detector** (Isolation Forest) hosted on SageMaker
- Flag suspicious transactions into a DynamoDB table for analysts
- Do all of this using **best practices** for cloud infrastructure and CI/CD.

The goal is to showcase **end‑to‑end ownership** of:

- Data & ML
- Cloud architecture
- Infrastructure as code
- DevOps practices

---

#### 2. High-Level Architecture

**Key components:**

1. **Data generation**
   - Python script generates synthetic card payment transactions.
   - Writes batched `.json` files to an **S3 raw bucket**.

2. **Event-driven processing (Lambda)**
   - `aws_s3_bucket_notification` triggers a **Lambda** (`transaction_processor`) on each new object in the raw bucket.
   - Lambda:
     - Reads the S3 object
     - (Later) calls the **SageMaker endpoint** to score transactions
     - Writes suspicious ones into a **DynamoDB** table (`anomalies`).

3. **Machine Learning (SageMaker)**
   - Local Python scripts:
     - `create_training_data.py` – generate training dataset (CSV)
     - `train_model.py` – train an **Isolation Forest** model with `scikit-learn`
   - Trained model is packaged to `model.tar.gz` and uploaded to a **models S3 bucket**.
   - Terraform defines:
     - SageMaker **IAM role**
     - **Model** (points to `model.tar.gz` in S3)
     - **Endpoint configuration**
     - **Endpoint** (`rt-anomaly-detection-iforest-endpoint`)

4. **Storage**
   - **Raw S3 bucket** – incoming transaction batches.
   - **Processed S3 bucket** – future extension for enriched/scored data.
   - **DynamoDB** – pay‑per‑request table for flagged anomalies.

5. **CI/CD**
   - GitHub Actions:
     - `terraform-ci.yml` – runs on every push / PR:
       - `terraform fmt -check`
       - `terraform validate`
       - `terraform plan` and uploads the plan as an artifact
     - `terraform-pipeline.yml` – **manual, staged pipeline**:
       - `prechecks` → `plan` → `apply` → `post_apply`
       - `apply` stage is gated by a **GitHub Environment** (`production`) with **required reviewer**.

6. **Frontend (optional)**
   - React + Vite app (WIP) to:
     - Fetch anomalies from a simple API (future step)
     - Visualise them in a table/chart.

---

#### 3. Tech Stack

- **Cloud**: AWS (S3, Lambda, DynamoDB, SageMaker, IAM)
- **IaC**: Terraform (AWS provider v5)
- **Language**: Python 3.11
- **ML**: scikit-learn (Isolation Forest), joblib
- **CI/CD**: GitHub Actions (multi‑stage workflow with manual approval)
- **Frontend**: React + Vite (TypeScript/JavaScript)

---

#### 4. Infrastructure Layout (Terraform)

All infrastructure code lives under `infrastructure/`:

- `main.tf`
  - Providers, `random_id` suffix, region
  - S3 buckets: `raw`, `processed`, `models` (versioned + SSE)
  - DynamoDB table: `${project_name}-anomalies`
  - IAM roles:
    - Lambda execution role (logs, S3, DynamoDB, **SageMaker InvokeEndpoint**)
    - SageMaker role (access to models bucket)
  - Lambda function: `transaction_processor`
  - S3 → Lambda notification
  - SageMaker model, endpoint configuration, and endpoint
- `variables.tf`
  - `aws_region` (default `us-east-1`)
  - `project_name` (default `rt-anomaly-detection`)
- `outputs.tf`
  - Bucket names, table name, region, **SageMaker endpoint name**

---

#### 5. Local Setup

##### 5.1. Prerequisites

- Python 3.11+
- Node.js (for frontend – optional)
- Terraform ≥ 1.5
- AWS CLI configured (with a user that has rights for S3, Lambda, DynamoDB, SageMaker, IAM)
- Git + GitHub account

##### 5.2. Python virtual environment

```bash
python -m venv .venv
source .venv/bin/activate  # macOS / Linux
# .venv\Scripts\activate   # Windows

pip install -r data_generator/requirements.txt

6. ML Training Workflow
From project root:

Generate training data:
cd data_generator
python create_training_data.py
Train Isolation Forest and export model:
python train_model.py
This produces model.tar.gz, containing:
Trained model (pickled via joblib)
Inference script (inference.py) compatible with SageMaker Scikit‑Learn container.
Upload to models bucket (after Terraform creates it):
cd ../infrastructure
terraform output models_bucket

# Replace <models-bucket> with output
aws s3 cp ../data_generator/model.tar.gz s3://<models-bucket>/model/model.tar.gz
7. Deploying Infrastructure (Terraform)
All commands from infrastructure/:

7.1. One‑time init
cd infrastructure
terraform init
terraform fmt
terraform validate
7.2. View plan locally
terraform plan
7.3. Apply locally (option)
terraform apply
This will provision:

S3 buckets (raw, processed, models)
DynamoDB table for anomalies
Lambda function and S3 trigger
SageMaker model, config, endpoint
8. CI/CD Workflows
8.1. terraform-ci.yml (on push/PR)
This workflow:

Checks out the code
Sets up Terraform
Configures AWS credentials from GitHub Secrets
Runs:
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan.out
Uploads tfplan.out as a build artifact
8.2. terraform-pipeline.yml (manual, staged)
Triggered via Actions → Terraform Full Pipeline → Run workflow.

Jobs:

prechecks
terraform init
terraform fmt -check
terraform validate
plan (depends on prechecks)
terraform init
terraform plan -out=tfplan.out
terraform show tfplan.out
Uploads tfplan.out artifact
apply (depends on plan, bound to production environment)
Waits for manual approval in GitHub
Runs terraform apply -auto-approve
post_apply (depends on apply)
Runs terraform output to display key values (buckets, endpoint name, etc.)
This simulates a production‑style, gated deployment where infrastructure changes must be approved.

9. Running the End-to-End Pipeline
Deploy infra via terraform apply or the Full Pipeline workflow.
Wait for the SageMaker endpoint to become InService.
Run the transaction generator:
cd data_generator
python generate_transactions.py
Lambda is triggered automatically by S3 events:
Reads JSON batch from raw bucket
(Later) calls SageMaker endpoint for anomaly scores
Writes flagged anomalies to DynamoDB.
Validate:
S3 Console: objects appearing under raw/ prefix in raw bucket
CloudWatch Logs: rt-anomaly-detection-transaction-processor log group
DynamoDB Console: rows appearing in ${project_name}-anomalies table
SageMaker Console: endpoint status InService
10. Future Enhancements
Integrate Lambda with SageMaker endpoint via boto3 to use real anomaly scores.
Build a small API layer (API Gateway + Lambda) to query anomalies.
Connect the React frontend to that API and visualise anomalies in real time.
Add an S3/DynamoDB TTL strategy and cost optimisation.
11. What This Project Demonstrates
End‑to‑end cloud ML system design (data → model → deployment → monitoring)
Hands‑on Terraform with AWS (IaC best practices)
CI/CD with GitHub Actions and environment approvals
Event‑driven serverless architecture (S3 + Lambda + DynamoDB)
Integration of ML (Isolation Forest) into a production‑like pipeline.