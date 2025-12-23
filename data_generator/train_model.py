import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import tarfile
import os

# Load data
df = pd.read_csv("training_data.csv")

# Train Isolation Forest
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(df)

# Save model
joblib.dump(model, "model.joblib")

# SageMaker requires a .tar.gz file
with tarfile.open("model.tar.gz", "w:gz") as tar:
    tar.add("model.joblib")

print("✅ Model trained and packaged as model.tar.gz")