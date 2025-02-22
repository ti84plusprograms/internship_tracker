# Use the official Python 3.11 slim image (to match your local version)
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# Copy the rest of the application code into the container
COPY . .

# Ensure the model file is copied (if it isn't already in the same directory)
COPY email_classifier.pkl /app/
COPY tfidf_vectorizer.pkl /app/

# Expose the port the app runs on
EXPOSE 8080

# Define the command to run the application
CMD ["gunicorn", "-b", "0.0.0.0:8080", "emailClassifier:app"]
