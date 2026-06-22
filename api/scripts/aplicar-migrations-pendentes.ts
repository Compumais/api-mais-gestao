import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

dotenv.config();

const migrationsFolder = join(process.cwd(), "drizzle");
const PRIMEIRA_MIGRATION_PENDENTE_PRODUCAO = "0028_controle_acesso";

type Journal = {
	entries: Array<{ tag: string; when: number }>;
};

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

async function carregarMigrations() {
	const journal = JSON.parse(
		readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
	) as Journal;
	const arquivos = readMigrationFiles({ migrationsFolder });

	return journal.entries.map((entrada, indice) => ({
		entrada,
		arquivo: arquivos[indice],
	}));
}

async function listarHashesAplicados(pool: Pool) {
	const aplicadas = await pool.query<{ hash: string }>(
		`SELECT hash FROM drizzle.__drizzle_migrations`,
	);
	return new Set(aplicadas.rows.map((row) => row.hash));
}

async function bancoPareceProducao(pool: Pool) {
	const resultado = await pool.query<{ existe: boolean }>(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'produtos'
		) AS existe
	`);
	return resultado.rows[0]?.existe === true;
}

async function listarStatus(pool: Pool) {
	await garantirTabelaMigrations(pool);
	const migrations = await carregarMigrations();
	const hashesAplicados = await listarHashesAplicados(pool);

	console.log("Migrations no journal vs banco:\n");

	let pendentes = 0;

	for (const { entrada, arquivo } of migrations) {
		if (!arquivo) {
			console.log(`  ? ${entrada.tag} (arquivo não encontrado)`);
			continue;
		}

		const aplicada = hashesAplicados.has(arquivo.hash);
		console.log(`  ${aplicada ? "✓" : "○"} ${entrada.tag}`);
		if (!aplicada) pendentes++;
	}

	console.log(`\nTotal pendente: ${pendentes}`);

	if (pendentes > 0) {
		const emProducao = await bancoPareceProducao(pool);
		if (emProducao && pendentes > 2) {
			console.log(
				"\n⚠️  Banco já tem tabelas (provavelmente criado com db:push).",
			);
			console.log(
				"   Execute: pnpm run db:migrate:producao",
			);
		}
	}

	return pendentes;
}

async function registrarMigrationsComoAplicadas(
	pool: Pool,
	ateTagExclusiva?: string,
) {
	await garantirTabelaMigrations(pool);
	const migrations = await carregarMigrations();
	const hashesAplicados = await listarHashesAplicados(pool);

	let registradas = 0;

	for (const { entrada, arquivo } of migrations) {
		if (!arquivo) continue;
		if (ateTagExclusiva && entrada.tag === ateTagExclusiva) break;
		if (hashesAplicados.has(arquivo.hash)) continue;

		await pool.query(
			`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
			[arquivo.hash, entrada.when],
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

function exibirErro(erro: unknown) {
	console.error("\n--- Erro completo ---");
	if (erro instanceof Error) {
		console.error(erro.message);
		if (erro.cause) {
			console.error("Causa:", erro.cause);
		}
		console.error(erro.stack);
	} else {
		console.error(erro);
	}
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
			await listarStatus(pool);
			return;
		}

		if (comando === "baseline-producao") {
			if (!(await bancoPareceProducao(pool))) {
				console.error(
					"Tabela produtos não encontrada. Este baseline é só para banco já existente.",
				);
				process.exit(1);
			}

			console.log(
				`Registrando migrations anteriores a ${PRIMEIRA_MIGRATION_PENDENTE_PRODUCAO}...`,
			);
			const total = await registrarMigrationsComoAplicadas(
				pool,
				PRIMEIRA_MIGRATION_PENDENTE_PRODUCAO,
			);
			console.log(`\n${total} migration(s) registrada(s).`);
			console.log("\nPendentes agora:");
			await listarStatus(pool);
			return;
		}

		if (comando === "producao") {
			console.log("1/3 — Status inicial");
			const pendentesAntes = await listarStatus(pool);

			if (pendentesAntes > 2) {
				console.log("\n2/3 — Baseline de produção");
				await registrarMigrationsComoAplicadas(
					pool,
					PRIMEIRA_MIGRATION_PENDENTE_PRODUCAO,
				);
			} else {
				console.log("\n2/3 — Baseline não necessário");
			}

			console.log("\n3/3 — Aplicando migrations pendentes");
			await executarDrizzleMigrate(pool);
			console.log("\n✅ Migrations concluídas.");

			console.log("\nStatus final:");
			await listarStatus(pool);
			return;
		}

		if (comando === "baseline") {
			console.log("Registrando migrations anteriores à 0023 como já aplicadas...");
			const migrations = await carregarMigrations();
			await garantirTabelaMigrations(pool);
			const hashesAplicados = await listarHashesAplicados(pool);
			let registradas = 0;

			for (const { entrada, arquivo } of migrations) {
				if (!arquivo) continue;
				if (entrada.tag === "0023_notafiscalitem_campos_nf") continue;
				if (hashesAplicados.has(arquivo.hash)) continue;

				await pool.query(
					`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
					[arquivo.hash, entrada.when],
				);
				console.log(`  ✓ baseline: ${entrada.tag}`);
				registradas++;
			}

			console.log(`\n${registradas} migration(s) registrada(s) no baseline.`);
			console.log("\nAplicando migrations pendentes...");
			await executarDrizzleMigrate(pool);
			console.log("\nConcluído.");
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
		console.log(
			"  pnpm run db:migrate:producao     → baseline + aplica 0028/0029 (recomendado)",
		);
		console.log(
			"  pnpm run db:migrate:baseline-producao → só registra histórico até 0027",
		);
		console.log("  pnpm run db:migrate:diagnostico  → migrate com log de erro");
		console.log("  pnpm run db:migrate:baseline       → fluxo legado (0023)");
	} catch (erro) {
		exibirErro(erro);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
}

main();
