# app.py (Flask version)
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Initialize Classifier ---
MODEL_NAME = os.environ.get("ZERO_SHOT_MODEL_NAME", "facebook/bart-large-mnli")
classifier = None # Initialize to None

def load_model():
    global classifier
    try:
        print(f"Loading zero-shot classification model: {MODEL_NAME}...")
        # Ensure sentencepiece is available if needed by the tokenizer
        classifier = pipeline("zero-shot-classification", model=MODEL_NAME)
        print("Zero-shot classifier loaded successfully.")
    except Exception as e:
        print(f"Major error loading zero-shot classifier ({MODEL_NAME}): {e}")
        # In a real app, you might want to retry or have a more robust startup check
        # For now, the /health endpoint will reflect this failure.

# Load the model when the Flask app starts
# This is better than loading on first request for Gunicorn with multiple workers.
load_model()

# --- Define Candidate Labels ---
REFINED_CANDIDATE_LABELS = [
    "direct application or process for a job internship",
    "university or academic program application or inquiry",
    "general full-time job application or job search advice (non-internship)",
    "hackathon, fellowship, or non-internship competition/program application",
    "financial account, software access, or service-related application/notification (non-recruitment)",
    "survey or feedback request regarding recruitment or company branding",
    "general newsletter, marketing email, or other unrelated communication"
]
INTERNSHIP_SPECIFIC_LABEL = "direct application or process for a job internship"


@app.route('/predict', methods=['POST'])
def predict():
    if not classifier:
        return jsonify({'error': 'Classifier model is not available. Please check server logs.'}), 503

    try:
        data = request.get_json()
        if not data or 'subject' not in data or 'body' not in data:
            return jsonify({'error': 'Request must be JSON and include "subject" and "body" fields.'}), 400

        email_subject = data['subject']
        email_body = data['body']
        full_text = f"Subject: {email_subject}\nBody: {email_body}"
        
        candidate_labels_to_use = REFINED_CANDIDATE_LABELS

        result = classifier(full_text, candidate_labels_to_use, multi_label=False)
        
        top_label = result['labels'][0]
        top_score = result['scores'][0]

        classification_output = 0  # Default
        if top_label == INTERNSHIP_SPECIFIC_LABEL:
            classification_output = 1
            # Optional: Confidence threshold
            # if top_score < 0.5:
            #     classification_output = 0

        print(f"Processed: '{full_text[:100]}...' -> Top Label: {top_label} ({top_score:.4f}) -> Classification: {classification_output}")

        return jsonify({
            "classification": classification_output,
            "predicted_label": top_label,
            "score": top_score,
            "all_scores": list(zip(result['labels'], result['scores']))
        })

    except Exception as e:
        app.logger.error(f"Error during prediction: {e}", exc_info=True)
        return jsonify({'error': f"Error processing email: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    if classifier:
        return jsonify({"status": "ok", "message": "Zero-shot classifier is loaded.", "model_name": MODEL_NAME})
    else:
        return jsonify({"status": "error", "message": "Zero-shot classifier failed to load.", "model_name": MODEL_NAME}), 503

# For local testing with `python app.py` (Flask development server)
# if __name__ == '__main__':
#     app.run(debug=True, host='0.0.0.0', port=8000)
# Gunicorn will be used for production via the Dockerfile CMD.