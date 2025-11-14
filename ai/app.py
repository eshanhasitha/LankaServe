from flask import Flask, request, jsonify
import pickle

app = Flask(__name__)

# Load model (if trained already)
try:
    model = pickle.load(open("model/sentiment_model.pkl", "rb"))
except:
    model = None


@app.route("/")
def home():
    return {"message": "AI service is running!"}


@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return {"error": "Model not found. Train model first."}, 400

    data = request.json
    text = data.get("text", "")

    result = model.predict([text])[0]
    return {"input": text, "sentiment": result}


if __name__ == "__main__":
    app.run(port=8000, debug=True)
