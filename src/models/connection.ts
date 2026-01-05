import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as relations from "../../drizzle/relations.js";
import * as schema from "../../drizzle/schema.js";

dotenv.config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema, ...relations });
