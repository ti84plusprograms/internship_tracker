# Use the official Python 3.11 slim image (to match your local version)
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV HF_HOME=/app/.cache/huggingface
RUN mkdir -p /app/.cache/huggingface

ARG HF_MODEL_NAME="facebook/bart-large-mnli"
ENV ZERO_SHOT_MODEL_NAME=${HF_MODEL_NAME}

# Download Hugging Face model
RUN python -c "from transformers import pipeline; import os; print(f'Downloading HF model: {os.environ.get(\"ZERO_SHOT_MODEL_NAME\")}'); pipeline('zero-shot-classification', model=os.environ.get('ZERO_SHOT_MODEL_NAME'))"

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the application
CMD ["gunicorn", "-b", "0.0.0.0:8000", "emailClassifier:app"]
