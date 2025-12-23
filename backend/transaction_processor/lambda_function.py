import json
import boto3
import os
from decimal import Decimal  # <-- ADD THIS

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

RAW_BUCKET = os.environ.get("RAW_BUCKET")
ANOMALIES_TABLE_NAME = os.environ.get("ANOMALIES_TABLE_NAME")

anomalies_table = dynamodb.Table(ANOMALIES_TABLE_NAME)

def lambda_handler(event, context):
    print("Event received:", json.dumps(event))

    for record in event.get("Records", []):
        s3_bucket = record["s3"]["bucket"]["name"]
        s3_key = record["s3"]["object"]["key"]
        print(f"Processing file from s3://{s3_bucket}/{s3_key}")

        if s3_bucket != RAW_BUCKET:
            print(f"Skipping bucket {s3_bucket}, expected {RAW_BUCKET}")
            continue

        obj = s3.get_object(Bucket=s3_bucket, Key=s3_key)
        body = obj["Body"].read().decode("utf-8")

        try:
            transactions = json.loads(body)
        except json.JSONDecodeError as e:
            print(f"JSON decode error for {s3_key}: {e}")
            continue

        if not isinstance(transactions, list):
            print(f"Unexpected JSON format in {s3_key}: expected list of transactions")
            continue

        print(f"Loaded {len(transactions)} transactions from {s3_key}")

        for txn in transactions:
            amount = txn.get("amount", 0)
            is_anomaly = amount > 10000  # simple rule

            if is_anomaly:
                print(f"Flagging anomaly: {txn}")
                anomalies_table.put_item(
                    Item={
                        "transaction_id": txn["transaction_id"],
                        "user_id": txn.get("user_id", ""),
                        # convert to Decimal here:
                        "amount": Decimal(str(amount)),
                        "currency": txn.get("currency", ""),
                        "merchant_category": txn.get("merchant_category", ""),
                        "country": txn.get("country", ""),
                        "device_type": txn.get("device_type", ""),
                        "timestamp": txn.get("timestamp", ""),
                        "reason": "amount_gt_10000_rule",
                    }
                )

    return {"statusCode": 200, "body": "Processed S3 event"}