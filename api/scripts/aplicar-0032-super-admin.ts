import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const sql = readFileSync(
		join(process.cwd(), "drizzle/0032_super_admin.sql"),
		"utf8",
	);

	await pool.query(sql);
	console.log("Migration 0032_super_admin aplicada.");
	await pool.end();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
