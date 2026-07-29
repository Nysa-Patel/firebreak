FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
# Training deps (torch/torchvision/scikit-learn/matplotlib) aren't needed to
# serve the API in production -- only onnxruntime is used at inference time.
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] sqlalchemy pydantic pydantic-settings \
    httpx python-multipart Pillow imagehash onnxruntime numpy \
    python-dotenv psycopg2-binary

COPY app/ app/
COPY seed_data/ seed_data/
COPY scripts/ scripts/
COPY ml_pipeline/model/ ml_pipeline/model/

EXPOSE 8000
# Render injects $PORT at runtime and routes traffic to it -- it isn't
# necessarily 8000, so this must be a shell-form CMD to expand the env var
# (exec-form CMD with a literal "--port 8000" would ignore it).
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
