import json
import os
import boto3
from decimal import Decimal

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
sagemaker_runtime = boto3.client('sagemaker-runtime')

RAW_BUCKET = os.environ['RAW_BUCKET']
ANOMALIES_TABLE_NAME = os.environ['ANOMALIES_TABLE_NAME']
SAGEMAKER_ENDPOINT = os.environ.get('SAGEMAKER_ENDPOINT_NAME', '')

def lambda_handler(event, context):
    """
    Triggered by S3 ObjectCreated event.
    Reads transaction batch, calls SageMaker for anomaly score, writes to DynamoDB.
    """
    table = dynamodb.Table(ANOMALIES_TABLE_NAME)
    
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        
        print(f"Processing s3://{bucket}/{key}")
        
        # Download and parse JSON
        obj = s3.get_object(Bucket=bucket, Key=key)
        transactions = json.loads(obj['Body'].read().decode('utf-8'))
        
        for txn in transactions:
            # Extract features for model
            features = [
                float(txn.get('amount', 0)),
                1 if txn.get('country') != 'GB' else 0,  # is_foreign
                1 if txn.get('device_type') == 'web' else 0,  # is_web
            ]
            
            # Call SageMaker endpoint if configured
            anomaly_score = -1.0  # default
            if SAGEMAKER_ENDPOINT:
                try:
                    response = sagemaker_runtime.invoke_endpoint(
                        EndpointName=SAGEMAKER_ENDPOINT,
                        ContentType='application/json',
                        Body=json.dumps({'instances': [features]})
                    )
                    result = json.loads(response['Body'].read().decode('utf-8'))
                    # Isolation Forest returns -1 for anomalies, 1 for normal
                    anomaly_score = float(result['predictions'][0])
                except Exception as e:
                    print(f"SageMaker invocation failed: {e}")
                    anomaly_score = -1.0  # treat as anomaly if model fails
            
            # Simple rule-based flagging (fallback or combined with model)
            is_anomaly = (
                float(txn.get('amount', 0)) > 10000 or
                anomaly_score == -1.0
            )
            
            if is_anomaly:
                item = {
                    'transaction_id': txn['transaction_id'],
                    'user_id': txn['user_id'],
                    'amount': Decimal(str(txn['amount'])),
                    'currency': txn.get('currency', 'GBP'),
                    'merchant_category': txn.get('merchant_category', 'unknown'),
                    'country': txn.get('country', 'unknown'),
                    'device_type': txn.get('device_type', 'unknown'),
                    'timestamp': txn['timestamp'],
                    'anomaly_score': Decimal(str(anomaly_score)),
                    'flagged_reason': 'high_amount_or_model'
                }
                
                table.put_item(Item=item)
                print(f"Flagged anomaly: {txn['transaction_id']}")
    
    return {
        'statusCode': 200,
        'body': json.dumps('Processing complete')
    }