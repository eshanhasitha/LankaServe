import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
import pickle
import os

# Sample training dataset
data = {
    "text": [
        "Very good job",
        "Excellent service",
        "Bad experience",
        "Terrible work",
        "Loved the service"
    ],
    "sentiment": ["positive", "positive", "negative", "negative", "positive"]
}

df = pd.DataFrame(data)

# Convert text → numbers
vectorizer = CountVectorizer()
X = vectorizer.fit_transform(df["text"])
y = df["sentiment"]

# Model
model = MultinomialNB()
model.fit(X, y)

# Create model folder if not exist
os.makedirs("model", exist_ok=True)

# Save model + vectorizer
pickle.dump(model, open("model/sentiment_model.pkl", "wb"))
pickle.dump(vectorizer, open("model/vectorizer.pkl", "wb"))

print("Model trained and saved successfully!")
