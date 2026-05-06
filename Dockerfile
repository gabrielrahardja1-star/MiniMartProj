# ── Backend Dockerfile ──────────────────────────────────────────────────────
# Uses Python 3.11 slim as the base image to keep the image small.
# Installs Tesseract OCR (required by pytesseract) as a system package.

FROM python:3.11-slim

# Install system dependencies:
# - tesseract-ocr: the OCR engine pytesseract wraps
# - libpq-dev / gcc: needed if you later switch to PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy and install Python dependencies first (Docker caches this layer
# so it won't re-run pip install unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create a directory for the SQLite database file to persist data
RUN mkdir -p /app/data

# Expose the port the app runs on
EXPOSE 8000

# On startup: run Alembic migrations, then start the server
CMD alembic upgrade head && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000
