# WhoHas backend — deployable to Render / Railway / Fly.io / any Docker host.
FROM python:3.11-slim

WORKDIR /app

# System deps (build tools for some wheels)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# emergentintegrations ships from a custom index — include the extra index URL.
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

COPY . .

# The platform sets $PORT (Render/Railway/Fly). Default 8001 locally.
ENV PORT=8001
EXPOSE 8001

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}"]
