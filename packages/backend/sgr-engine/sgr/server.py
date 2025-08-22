import logging
import os
import re
from datetime import date
from concurrent import futures

import grpc

from grpc_health.v1 import health, health_pb2_grpc

# Generated imports will be available after code generation step in Docker build
from sgr_pb2 import ReasoningResponse
import sgr_pb2_grpc

class SGRService(sgr_pb2_grpc.SGRServiceServicer):
    def ReasonWithSchema(self, request, context):
        # Validate target provider
        if request.target_provider != "cloudflare-workers":
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Unsupported target_provider. Only 'cloudflare-workers' is supported in this stub.")

        dockerfile = request.source_content or ""
        # Defaults
        main_script = "src/index.js"
        port = 8787

        # Try to extract CMD instruction (e.g., CMD ["node","src/index.js"]) and pick the script path argument
        try:
            cmd_match = re.search(r"CMD\s*\[(.*?)\]", dockerfile, re.IGNORECASE)
            if cmd_match:
                inner = cmd_match.group(1)
                parts = re.findall(r"\"([^\"]+)\"|([^,\s]+)", inner)
                # Flatten and filter empty
                flat = [p[0] or p[1] for p in parts if (p[0] or p[1])]
                # Heuristic: last arg may be the script file
                if flat:
                    candidate = flat[-1]
                    if candidate.endswith('.js') or '/' in candidate:
                        main_script = candidate
        except Exception:
            pass

        # Try to extract EXPOSE <port>
        try:
            expose_match = re.search(r"EXPOSE\s+(\d+)", dockerfile, re.IGNORECASE)
            if expose_match:
                port = int(expose_match.group(1))
        except Exception:
            pass

        comp_date = date.today().strftime("%Y-%m-%d")
        wrangler_toml = f"""
name = "aether-converted-service"
main = "{main_script}"
compatibility_date = "{comp_date}"

[dev]
port = {port}
"""

        logging.info("Generated wrangler.toml with main=%s port=%d", main_script, port)
        return ReasoningResponse(status="SUCCESS", explanation="Generated wrangler.toml", generated_content=wrangler_toml)

def serve():
    port = os.getenv("SGR_PORT", "50051")
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Health checking
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)

    # SGR service
    sgr_pb2_grpc.add_SGRServiceServicer_to_server(SGRService(), server)

    server.add_insecure_port(f"[::]:{port}")
    server.start()
    logging.info("SGR Engine listening on %s", port)
    server.wait_for_termination()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    serve()
