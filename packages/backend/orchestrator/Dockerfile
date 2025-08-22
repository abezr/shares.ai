# Builder
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o orchestrator

# Runtime
FROM gcr.io/distroless/base-debian12
WORKDIR /
COPY --from=builder /app/orchestrator /orchestrator
ENV POSTGRES_URL=postgres://aether:aether@postgres:5432/aether_meta
ENV NATS_URL=nats://nats:4222
USER 65532:65532
ENTRYPOINT ["/orchestrator"]
