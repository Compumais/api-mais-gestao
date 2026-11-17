import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as relations from "../../drizzle/relations.js";
import * as schema from "../../drizzle/schema.js";

dotenv.config();

export const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	keepAlive: true,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
	console.error("Erro inesperado no cliente idle do pool PostgreSQL:", err.message);
});

export const db = drizzle(pool, { schema, ...relations });
