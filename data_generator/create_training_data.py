import pandas as pd
import random
import datetime

def generate_training_row():
    amount = round(random.uniform(1.0, 1000.0), 2)
    if random.random() < 0.05: # 5% anomalies
        amount = round(random.uniform(5000.0, 50000.0), 2)
    
    return {
        "amount": amount,
        "merchant_category_idx": random.randint(0, 4),
        "country_idx": random.randint(0, 4),
        "device_type_idx": random.randint(0, 2),
        "hour": random.randint(0, 23)
    }

# Generate 5000 rows
data = [generate_training_row() for _ in range(5000)]
df = pd.DataFrame(data)
df.to_csv("training_data.csv", index=False)
print("✅ training_data.csv created with 5000 rows.")