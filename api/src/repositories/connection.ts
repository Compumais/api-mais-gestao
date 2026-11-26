import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as relations from "../../drizzle/relations.js";
import * as schema from "../../drizzle/schema.js";

dotenv.config();

function lerInteiroEnv(valor: string | undefined, padrao: number): number {
	const numero = Number.parseInt(valor ?? "", 10);
	return Number.isFinite(numero) && numero > 0 ? numero : padrao;
}

const configBase: Omit<PoolConfig, "connectionString" | "max"> = {
	keepAlive: true,
	idleTimeoutMillis: lerInteiroEnv(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
	connectionTimeoutMillis: lerInteiroEnv(
		process.env.DB_CONNECTION_TIMEOUT_MS,
		10_000,
	),
	application_name: process.env.DB_APPLICATION_NAME || "api-mais-gestao",
};

export const pool = new Pool({
	...configBase,
	connectionString: process.env.DATABASE_URL,
	max: lerInteiroEnv(process.env.DB_POOL_MAX, 20),
});

export const directPool = new Pool({
	...configBase,
	connectionString:
		process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL,
	max: lerInteiroEnv(process.env.DB_DIRECT_POOL_MAX, 5),
	application_name: `${configBase.application_name}-direct`,
});

export const biReadOnlyPool = new Pool({
	...configBase,
	connectionString:
		process.env.DATABASE_BI_READONLY_URL || process.env.DATABASE_URL,
	max: lerInteiroEnv(process.env.DB_BI_POOL_MAX, 5),
	application_name: `${configBase.application_name}-bi-ro`,
});

pool.on("error", (err) => {
	console.error(
		"Erro inesperado no cliente idle do pool PostgreSQL (pooled):",
		err.message,
	);
});

directPool.on("error", (err) => {
	console.error(
		"Erro inesperado no cliente idle do pool PostgreSQL (direct):",
		err.message,
	);
});

biReadOnlyPool.on("error", (err) => {
	console.error(
		"Erro inesperado no cliente idle do pool PostgreSQL (bi-ro):",
		err.message,
	);
});

export const db = drizzle(pool, { schema, ...relations });

export function obterMetricasPool() {
	return {
		pooled: {
			total: pool.totalCount,
			idle: pool.idleCount,
			waiting: pool.waitingCount,
		},
		direct: {
			total: directPool.totalCount,
			idle: directPool.idleCount,
			waiting: directPool.waitingCount,
		},
		biReadOnly: {
			total: biReadOnlyPool.totalCount,
			idle: biReadOnlyPool.idleCount,
			waiting: biReadOnlyPool.waitingCount,
		},
	};
}

let encerrandoPools = false;

export async function fecharConexoesBanco(): Promise<void> {
	if (encerrandoPools) return;
	encerrandoPools = true;
	await Promise.allSettled([
		pool.end(),
		directPool.end(),
		biReadOnlyPool.end(),
	]);
}
