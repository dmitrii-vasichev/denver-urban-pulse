FROM python:3.12-slim

WORKDIR /app

# Install dependencies (paths relative to repo root — Railway build context)
COPY data/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all data scripts
COPY data/ ./data/

CMD ["python", "data/pipeline/run_daily.py"]
