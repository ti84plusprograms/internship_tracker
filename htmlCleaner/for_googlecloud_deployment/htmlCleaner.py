from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app)

@app.route('/clean-email', methods=['POST'])
def clean_email():
    try:
        data = request.get_json(force=True)
        if not data or 'email_body' not in data:
            return jsonify({'error': 'Missing email_body'}), 400

        raw_html = data['email_body']
        soup = BeautifulSoup(raw_html, 'html.parser')
        clean_text = soup.get_text(separator=' ')
        clean_text = ' '.join(clean_text.split())  # Remove extra spaces

        return jsonify({'cleaned_body': clean_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == "__main__":
    app.run(debug=False)
