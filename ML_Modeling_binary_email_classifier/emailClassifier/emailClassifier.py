from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import string

app = Flask(__name__)
CORS(app)

# Load the model and vectorizer
model = joblib.load('/app/email_classifier.pkl')  # Update with your model path
vectorizer = joblib.load('/app/tfidf_vectorizer.pkl')  # Update with your vectorizer path

print(len(vectorizer.vocabulary_))

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)
        subject = clean_text(data['subject'])
        body = clean_text(data['body'])

        # Combine subject and body and vectorize
        input_vector = vectorizer.transform([subject + ' ' + body])
        prediction = model.predict(input_vector)
        
        return jsonify({'prediction': int(prediction[0])})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
def clean_text(text):
    import nltk
    nltk.download('punkt', quiet=True)  # Ensure it's downloaded
    nltk.download('stopwords', quiet=True)
    # Tokenize and lower case the text
    text = text.lower()
    tokens = word_tokenize(text)
    
    # Remove stopwords and punctuation
    stop_words = set(stopwords.words('english'))
    cleaned_tokens = [word for word in tokens if word not in stop_words and word not in string.punctuation]
    
    return " ".join(cleaned_tokens)

# Apply the cleaning function to both 'email subject' and 'email body'

if __name__ == '__main__':
    app.run(debug=True)
