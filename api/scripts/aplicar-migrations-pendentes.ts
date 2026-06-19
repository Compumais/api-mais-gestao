import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

dotenv.config();

const migrationsFolder = join(process.cwd(), "drizzle");
const TAG_MIGRATION_NF = "0023_notafiscalitem_campos_nf";

async function garantirTabelaMigrations(pool: Pool) {
	await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at bigint
		)
	`);
}

async function listarMigrationsAplicadas(pool: Pool) {
	try {
		const resultado = await pool.query(
			`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at ASC`,
		);
		return resultado.rows as Array<{
			id: number;
			hash: string;
			created_at: string;
		}>;
	} catch {
		return [];
	}
}

async function baselineMigrations(pool: Pool) {
	await garantirTabelaMigrations(pool);

	const journal = JSON.parse(
		readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
	) as { entries: Array<{ tag: string; when: number }> };

	const migrations = readMigrationFiles({ migrationsFolder });
	const aplicadas = await pool.query(`SELECT hash FROM drizzle.__drizzle_migrations`);
	const hashesAplicados = new Set(
		aplicadas.rows.map((row: { hash: string }) => row.hash),
	);

	let registradas = 0;

	for (let i = 0; i < journal.entries.length; i++) {
		const entrada = journal.entries[i];
		const migration = migrations[i];

		if (!entrada || !migration) continue;
		if (entrada.tag === TAG_MIGRATION_NF) continue;
		if (hashesAplicados.has(migration.hash)) continue;

		await pool.query(
			`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
			[migration.hash, entrada.when],
		);
		console.log(`  ✓ baseline: ${entrada.tag}`);
		registradas++;
	}

	return registradas;
}

async function executarDrizzleMigrate(pool: Pool) {
	const db = drizzle(pool);
	await migrate(db, { migrationsFolder });
}

async function main() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error("DATABASE_URL não definida no .env");
		process.exit(1);
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const comando = process.argv[2] ?? "status";

	try {
		if (comando === "status") {
			console.log("Migrations registradas no banco:");
			const aplicadas = await listarMigrationsAplicadas(pool);
			if (aplicadas.length === 0) {
				console.log(
					"  (nenhuma — o banco provavelmente foi criado via push/seed sem registrar migrations)",
				);
				console.log(
					"\nExecute: pnpm run db:migrate:baseline",
				);
			} else {
				for (const row of aplicadas) {
					console.log(`  - #${row.id} (${row.created_at})`);
				}
			}
			return;
		}

		if (comando === "baseline") {
			console.log("Registrando migrations anteriores à 0022 como já aplicadas...");
			const total = await baselineMigrations(pool);
			console.log(`\n${total} migration(s) registrada(s) no baseline.`);

			console.log("\nAplicando migration 0022 (campos NF)...");
			await executarDrizzleMigrate(pool);
			console.log("\nConcluído. Agora pnpm run db:migrate deve funcionar normalmente.");
			return;
		}

		if (comando === "drizzle") {
			console.log("Executando drizzle migrate...");
			await executarDrizzleMigrate(pool);
			console.log("drizzle migrate concluído.");
			return;
		}

		console.log("Comandos disponíveis:");
		console.log("  pnpm run db:migrate:status");
		console.log("  pnpm run db:migrate:baseline   → corrige histórico + aplica 0022");
		console.log("  pnpm run db:migrate:diagnostico → tenta migrate e mostra erro");
	} catch (erro) {
		console.error("\nFalha:");
		console.error(erro instanceof Error ? erro.message : erro);
		if (erro instanceof Error && erro.cause instanceof Error) {
			console.error("Causa:", erro.cause.message);
		}
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
}

main();
