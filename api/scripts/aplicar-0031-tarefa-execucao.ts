import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const sql = readFileSync(
		join(process.cwd(), "drizzle/0031_tarefa_execucao.sql"),
		"utf8",
	);

	await pool.query(sql);
	console.log("Tabela tarefa_execucao criada (ou já existia).");
	await pool.end();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
