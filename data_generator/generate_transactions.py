import time
import json
import random
import datetime
import boto3
import os

# AWS S3 client
s3_client = boto3.client('s3', region_name='eu-west-2')

# S3 bucket name (you'll create this with Terraform)
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'rt-anomaly-detection-raw-47cf4b6a')

# Batch settings
BATCH_SIZE = 50  # Number of transactions per file
BATCH_INTERVAL = 10  # Seconds between batches

def generate_transaction():
    """Generate a single synthetic transaction."""
    transaction_id = f"txn_{random.randint(100000, 999999)}"
    user_id = f"user_{random.randint(1000, 9999)}"
    amount = round(random.uniform(1.0, 1000.0), 2)
    
    # Occasionally generate anomalies (high amounts, unusual countries)
    if random.random() < 0.05:  # 5% anomaly rate
        amount = round(random.uniform(5000.0, 50000.0), 2)  # Unusually high
    
    currency = "GBP"
    merchant_categories = ["retail", "online_service", "travel", "food", "utility"]
    merchant_category = random.choice(merchant_categories)
    
    countries = ["GB", "US", "DE", "FR", "IE"]
    country = random.choice(countries)
    
    # Anomaly: rare country
    if random.random() < 0.03:  # 3% anomaly
        country = random.choice(["NG", "RU", "CN"])
    
    device_types = ["mobile", "web", "pos"]
    device_type = random.choice(device_types)
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"

    return {
        "transaction_id": transaction_id,
        "user_id": user_id,
        "amount": amount,
        "currency": currency,
        "merchant_category": merchant_category,
        "country": country,
        "device_type": device_type,
        "timestamp": timestamp
    }

def send_batch_to_s3(transactions, batch_number):
    """Send a batch of transactions to S3."""
    file_name = f"batch_{batch_number:06d}_{int(time.time())}.json"
    s3_key = f"raw/{file_name}"
    
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=json.dumps(transactions),
            ContentType='application/json'
        )
        print(f"✅ Sent batch {batch_number} ({len(transactions)} transactions) to s3://{BUCKET_NAME}/{s3_key}")
    except Exception as e:
        print(f"❌ Error sending batch to S3: {e}")

def main():
    """Main loop: generate and send transaction batches."""
    print(f"🚀 Transaction Generator started. Sending to S3 bucket: {BUCKET_NAME}")
    print(f"📦 Batch size: {BATCH_SIZE} transactions every {BATCH_INTERVAL} seconds\n")
    
    batch_number = 1
    
    try:
        while True:
            # Generate a batch of transactions
            transactions = [generate_transaction() for _ in range(BATCH_SIZE)]
            
            # Send to S3
            send_batch_to_s3(transactions, batch_number)
            
            batch_number += 1
            time.sleep(BATCH_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n🛑 Generator stopped by user.")

if __name__ == "__main__":
    main()