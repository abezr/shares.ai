import asyncio
import json
import os
import signal
from dataclasses import dataclass
from typing import Any, Dict

import asyncpg
import nats
from nats.aio.client import Client as NATS
from nats.aio.msg import Msg
import uuid

POSTGRES_URL = os.getenv("POSTGRES_URL", "postgres://aether:aether@localhost:5432/aether_meta")
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")
QUEUE_GROUP = os.getenv("NATS_QUEUE", "generic-agent-workers")

@dataclass
class EchoTaskEvent:
    eventId: str
    eventType: str
    runId: str
    message: str

async def handle_message(nc: NATS, pool: asyncpg.Pool, msg: Msg):
    try:
        data = json.loads(msg.data.decode())
        event = EchoTaskEvent(**data)
    except Exception as e:
        print(f"Invalid EchoTaskEvent: {e}")
        return

    print(f"Agent received task {event.runId} with message: {event.message}")

    async with pool.acquire() as conn:
        # Set status to running
        await conn.execute("UPDATE run_ledger SET status=$1, updated_at=now() WHERE id=$2", 'running', event.runId)
        # Simulate work
        await asyncio.sleep(2)
        # Append step and set status to success
        step = {
            "step": 1,
            "action": "Echo",
            "status": "SUCCESS",
            "timestamp": asyncio.get_event_loop().time()
        }
        # Ensure steps is an array and append
        await conn.execute(
            "UPDATE run_ledger SET status=$1, steps = COALESCE(steps, '[]'::jsonb) || $2::jsonb, updated_at=now() WHERE id=$3",
            'success', json.dumps([step]), event.runId
        )

    # Publish result event
    result = {
        "eventId": str(uuid.uuid4()),
        "eventType": "EchoTaskCompleted",
        "runId": event.runId,
        "status": "SUCCESS",
        "output": "Agent successfully processed the echo task."
    }
    await nc.publish("aether.agent.results", json.dumps(result).encode())

async def main_async():
    nc = await nats.connect(servers=[NATS_URL], name="agent-worker")
    print(f"Connected to NATS at {NATS_URL}")
    pool = await asyncpg.create_pool(dsn=POSTGRES_URL, min_size=1, max_size=5)
    print("Connected to Postgres")

    # Graceful shutdown
    should_stop = asyncio.Event()

    async def shutdown():
        if not should_stop.is_set():
            should_stop.set()
            await nc.drain()
            await pool.close()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(shutdown()))

    async def msg_handler(msg: Msg):
        await handle_message(nc, pool, msg)

    sub = await nc.subscribe("aether.agent.tasks", queue=QUEUE_GROUP, cb=msg_handler)
    print("Subscribed to aether.agent.tasks with queue 'generic-agent-workers'")

    await should_stop.wait()
    await nc.unsubscribe(sub)


def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
