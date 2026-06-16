import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const file = process.argv[2];
if (!file) {
	console.error("Uso: npx tsx drizzle/apply-migration.ts <arquivo.sql>");
	process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, file);
const sql = readFileSync(sqlPath, "utf-8");

const statements = sql
	.split(/--> statement-breakpoint\n?/)
	.map((s) => s.trim())
	.filter(Boolean);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
	for (const statement of statements) {
		console.log(`Executando: ${statement.slice(0, 80)}...`);
		await pool.query(statement);
	}
	console.log(`Migration ${file} aplicada com sucesso.`);
} finally {
	await pool.end();
}
