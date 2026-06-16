import fs from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const sqlPath = path.resolve(import.meta.dirname, "../drizzle/0015_integracao_vendas_plano_contas.sql");

async function main() {
	const client = new pg.Client({
		connectionString: process.env.DATABASE_URL,
		connectionTimeoutMillis: 15_000,
	});

	await client.connect();
	console.log("Conectado ao banco.");

	const sql = fs.readFileSync(sqlPath, "utf8");
	const statements = sql
		.split(";")
		.map((s) => s.trim())
		.filter(Boolean);

	for (const stmt of statements) {
		try {
			await client.query(stmt);
			console.log("OK:", stmt.slice(0, 100));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.log("SKIP/ERR:", message.slice(0, 150));
		}
	}

	await client.end();
	console.log("Concluído.");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
