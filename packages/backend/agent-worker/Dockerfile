FROM python:3.11-slim

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir build && \
    pip install --no-cache-dir nats-py asyncpg

COPY agent_worker ./agent_worker

ENV POSTGRES_URL=postgres://aether:aether@postgres:5432/aether_meta
ENV NATS_URL=nats://nats:4222
ENV NATS_QUEUE=generic-agent-workers

CMD ["python", "-m", "agent_worker.main"]
