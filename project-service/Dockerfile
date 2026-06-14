FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Add non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application code
COPY . .

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the service port
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1

# Command to run the project service
CMD ["uvicorn", "services.project-service.main:app", "--host", "0.0.0.0", "--port", "8000"]
