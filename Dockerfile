# Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Backend + frontend dist
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    ENABLE_NOBG=0

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
# Skip rembg on cloud (heavy); install core deps only
RUN pip install --no-cache-dir \
    "fastapi>=0.116.0" \
    "uvicorn[standard]>=0.35.0" \
    "httpx>=0.28.0" \
    "python-multipart>=0.0.20" \
    "openpyxl>=3.1.5" \
    "pydantic>=2.12.0" \
    "python-dotenv>=1.0.0" \
    "pillow>=10.0.0" \
    "fpdf2>=2.8.2"

COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist ./frontend/dist
COPY frontend/public ./frontend/public

RUN mkdir -p /app/backend/data/images /app/backend/data/catalog

WORKDIR /app/backend
EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
