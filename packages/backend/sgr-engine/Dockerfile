# Builder: generate gRPC code
FROM python:3.11-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir grpcio grpcio-tools
COPY protos ./protos
RUN python -m grpc_tools.protoc -I./protos --python_out=. --grpc_python_out=. ./protos/sgr.proto

# Runtime
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir grpcio grpcio-health-checking
COPY --from=builder /app/sgr_pb2.py ./
COPY --from=builder /app/sgr_pb2_grpc.py ./
COPY sgr ./sgr
ENV SGR_PORT=50051
EXPOSE 50051
CMD ["python", "-m", "sgr.server"]
