# Use an official lightweight Python image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

# Set working directory
WORKDIR /app

# Install system dependencies (needed for compiling certain Python packages if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first for caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files into the container
COPY . .

# Ensure outputs directories exist
RUN mkdir -p outputs/models outputs/results outputs/figures

# Run pre-training check or run the main.py pipeline during image build to pre-compile the model.
# Note: Doing this at build time makes the space start up instantly.
RUN python main.py

# Expose Hugging Face Space default port
EXPOSE 7860

# Start FastAPI backend server using uvicorn on port 7860
CMD ["python", "-m", "uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "7860"]