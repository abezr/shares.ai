import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { GraphQLJSON } from "graphql-scalars";
import { readFileSync } from "fs";
import path from "path";
import { Pool } from "pg";
import { connect, StringCodec, NatsConnection } from "nats";
import { v4 as uuidv4 } from "uuid";
import { ServiceProfileCreatedEvent } from "./types";

const POSTGRES_URL = process.env.POSTGRES_URL || "postgres://aether:aether@localhost:5432/aether_meta";
const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";

const pool = new Pool({ connectionString: POSTGRES_URL });

let nc: NatsConnection | null = null;
const sc = StringCodec();

async function initNats() {
  if (!nc) {
    nc = await connect({ servers: NATS_URL });
    console.log(`Connected to NATS at ${NATS_URL}`);
  }
}

const typeDefs = readFileSync(path.resolve(process.cwd(), "schema.graphql"), "utf-8");

const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    _health: () => "ok",
  },
  Mutation: {
    async createServiceProfile(
      _: unknown,
      args: { name: string; goals: any; source_content?: string | null; target_provider?: string | null }
    ) {
      const { name, goals, source_content = null, target_provider = null } = args;
      const client = await pool.connect();
      try {
        const result = await client.query(
          "INSERT INTO service_profiles(name, goals, source_content, target_provider) VALUES ($1, $2, $3, $4) RETURNING id, name, goals, source_content, target_provider, created_at, updated_at",
          [name, goals, source_content, target_provider]
        );
        const profile = result.rows[0];

        const evt: ServiceProfileCreatedEvent = {
          eventId: uuidv4(),
          timestamp: new Date().toISOString(),
          eventType: "ServiceProfileCreated",
          data: {
            serviceProfileId: profile.id,
            name: profile.name,
            goals: profile.goals,
            source_content: profile.source_content ?? null,
            target_provider: profile.target_provider ?? null,
          },
        };

        await initNats();
        await nc!.publish("aether.tasks.new", sc.encode(JSON.stringify(evt)));

        return profile;
      } finally {
        client.release();
      }
    },
  },
};

async function main() {
  await initNats();
  const server = new ApolloServer({ typeDefs, resolvers });
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });
  console.log(`API Gateway running at ${url}`);
}

main().catch(async (err) => {
  console.error("Failed to start API Gateway:", err);
  try { await pool.end(); } catch {}
  try { if (nc) await nc.drain(); } catch {}
  process.exit(1);
});

async function shutdown() {
  console.log("Shutting down API Gateway...");
  try { if (nc) await nc.drain(); } catch {}
  try { await pool.end(); } catch {}
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
