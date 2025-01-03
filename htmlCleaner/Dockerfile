# Use the official Python image as a base
FROM python:3.9-slim

# Set the working directory
WORKDIR /htmlCleaner

# Copy the project files
COPY . /htmlCleaner

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port Flask will run on
EXPOSE 8080

# Run the application using Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8080", "htmlCleaner:app"]
