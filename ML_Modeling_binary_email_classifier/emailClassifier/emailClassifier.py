from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer

app = Flask(__name__)
CORS(app)

# Load the model and vectorizer
model = joblib.load('/app/email_classifier.pkl')  # Update with your model path
vectorizer = joblib.load('/app/tfidf_vectorizer.pkl')  # Update with your vectorizer path

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)
        subject = data['subject']
        body = data['body']
        
        # Combine subject and body and vectorize
        input_vector = vectorizer.transform([subject + ' ' + body])
        prediction = model.predict(input_vector)
        
        return jsonify({'prediction': int(prediction[0])})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False)
