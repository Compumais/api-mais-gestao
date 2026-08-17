import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { SCHEMA_INDEXES_SQL, SCHEMA_TABLES_SQL } from "./schema";

export const DATABASE_URL_PADRAO =
	"postgresql://pdv:pdv@127.0.0.1:5433/pdv_local";

export class BancoIndisponivelError extends Error {
	constructor(
		message = "PostgreSQL local indisponível. Inicie o banco (docker compose up -d em pdv/) e tente novamente.",
	) {
		super(message);
		this.name = "BancoIndisponivelError";
	}
}

let pool: Pool | null = null;

export function isDbReady(): boolean {
	return pool !== null;
}

function arquivoUrlPath(): string {
	return join(app.getPath("userData"), "database-url.txt");
}

export function obterDatabaseUrl(): string {
	const env = process.env.PDV_DATABASE_URL?.trim();
	if (env) {
		return env;
	}
	try {
		const path = arquivoUrlPath();
		if (existsSync(path)) {
			const txt = readFileSync(path, "utf8").trim();
			if (txt) {
				return txt;
			}
		}
	} catch {
		// arquivo ausente ou ilegível — usa o default
	}
	return DATABASE_URL_PADRAO;
}

export function salvarDatabaseUrlArquivo(url: string): void {
	const dir = app.getPath("userData");
	mkdirSync(dir, { recursive: true });
	writeFileSync(arquivoUrlPath(), `${url.trim()}\n`, "utf8");
}

export function isBancoIndisponivelError(err: unknown): boolean {
	return err instanceof BancoIndisponivelError;
}

function wrapPgError(err: unknown): Error {
	if (err instanceof BancoIndisponivelError) {
		return err;
	}
	if (err && typeof err === "object") {
		const code = (err as { code?: string }).code;
		if (
			code === "ECONNREFUSED" ||
			code === "ENOTFOUND" ||
			code === "ETIMEDOUT" ||
			code === "ECONNRESET" ||
			code === "57P01" ||
			code === "57P03"
		) {
			return new BancoIndisponivelError();
		}
		if (code === "3D000" || code === "28P01" || code === "28000") {
			const message = err instanceof Error ? err.message : String(err);
			return new BancoIndisponivelError(
				`PostgreSQL local indisponível: ${message}`,
			);
		}
	}
	return err instanceof Error ? err : new Error(String(err));
}

function getPool(): Pool {
	if (!pool) {
		throw new BancoIndisponivelError();
	}
	return pool;
}

export async function query<T extends QueryResultRow>(
	text: string,
	params: unknown[] = [],
	client?: PoolClient,
): Promise<T[]> {
	try {
		const executor = client ?? getPool();
		const result = await executor.query<T>(text, params);
		return result.rows;
	} catch (err) {
		throw wrapPgError(err);
	}
}

export async function queryOne<T extends QueryResultRow>(
	text: string,
	params: unknown[] = [],
	client?: PoolClient,
): Promise<T | undefined> {
	const rows = await query<T>(text, params, client);
	return rows[0];
}

export async function execute(
	text: string,
	params: unknown[] = [],
	client?: PoolClient,
): Promise<void> {
	await query(text, params, client);
}

export async function withTransaction<T>(
	fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
	const client = await getPool().connect();
	try {
		await client.query("BEGIN");
		const result = await fn(client);
		await client.query("COMMIT");
		return result;
	} catch (err) {
		try {
			await client.query("ROLLBACK");
		} catch {
			// ignora falha no rollback
		}
		throw wrapPgError(err);
	} finally {
		client.release();
	}
}

export async function initDb(): Promise<void> {
	if (pool) {
		return;
	}

	const url = obterDatabaseUrl();
	const next = new Pool({
		connectionString: url,
		max: 8,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 5000,
	});

	try {
		await next.query("SELECT 1");
		await execSql(next, SCHEMA_TABLES_SQL);
		await aplicarMigracoesLeves(next);
		await execSql(next, SCHEMA_INDEXES_SQL);
		await seedDefaults(next);
	} catch (err) {
		await next.end().catch(() => undefined);
		throw wrapPgError(err);
	}

	pool = next;
}

export async function closeDb(): Promise<void> {
	if (pool) {
		const atual = pool;
		pool = null;
		await atual.end().catch(() => undefined);
	}
}

export async function reconectarDb(): Promise<void> {
	await closeDb();
	await initDb();
}

async function execSql(database: Pool, sql: string): Promise<void> {
	const partes = sql
		.split(";")
		.map((parte) => parte.trim())
		.filter((parte) => parte.length > 0);
	for (const parte of partes) {
		await database.query(parte);
	}
}

async function aplicarMigracoesLeves(database: Pool): Promise<void> {
	const colunas = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'produto_cache'`,
	);
	const nomes = new Set(colunas.rows.map((c) => c.column_name));
	if (!nomes.has("idgrupo")) {
		await database.query("ALTER TABLE produto_cache ADD COLUMN idgrupo TEXT");
	}
	if (!nomes.has("imagem")) {
		await database.query("ALTER TABLE produto_cache ADD COLUMN imagem TEXT");
	}
	if (!nomes.has("caminhoimagem")) {
		await database.query(
			"ALTER TABLE produto_cache ADD COLUMN caminhoimagem TEXT",
		);
	}
	if (!nomes.has("idgrupogourmet")) {
		await database.query(
			"ALTER TABLE produto_cache ADD COLUMN idgrupogourmet TEXT",
		);
	}
	if (!nomes.has("espizza")) {
		await database.query(
			"ALTER TABLE produto_cache ADD COLUMN espizza INTEGER NOT NULL DEFAULT 0",
		);
	}

	const itemCols = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'item_conta'`,
	);
	const itemNomes = new Set(itemCols.rows.map((c) => c.column_name));
	if (!itemNomes.has("observacao")) {
		await database.query("ALTER TABLE item_conta ADD COLUMN observacao TEXT");
	}

	const gourmetCols = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'impressora_grupo_gourmet'`,
	);
	if (gourmetCols.rows.length) {
		const gourmetNomes = new Set(gourmetCols.rows.map((c) => c.column_name));
		if (!gourmetNomes.has("destino")) {
			await database.query(
				"ALTER TABLE impressora_grupo_gourmet ADD COLUMN destino TEXT NOT NULL DEFAULT 'sistema'",
			);
		}
		if (!gourmetNomes.has("host")) {
			await database.query(
				"ALTER TABLE impressora_grupo_gourmet ADD COLUMN host TEXT NOT NULL DEFAULT ''",
			);
		}
		if (!gourmetNomes.has("porta")) {
			await database.query(
				"ALTER TABLE impressora_grupo_gourmet ADD COLUMN porta INTEGER NOT NULL DEFAULT 9100",
			);
		}
	}

	const pagCols = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'pagamento'`,
	);
	if (pagCols.rows.length) {
		const pagNomes = new Set(pagCols.rows.map((c) => c.column_name));
		if (!pagNomes.has("nsu")) {
			await database.query("ALTER TABLE pagamento ADD COLUMN nsu TEXT");
		}
		if (!pagNomes.has("autorizacao")) {
			await database.query("ALTER TABLE pagamento ADD COLUMN autorizacao TEXT");
		}
		if (!pagNomes.has("bandeira")) {
			await database.query("ALTER TABLE pagamento ADD COLUMN bandeira TEXT");
		}
		if (!pagNomes.has("status")) {
			await database.query(
				"ALTER TABLE pagamento ADD COLUMN status TEXT NOT NULL DEFAULT 'ok'",
			);
		}
	}
}

/** Host antigo do seed que aponta para o front, não para a API. */
const API_URL_LEGADA = "https://api.maisgestao.com.br";
const API_URL_PADRAO = "https://api.compuchat.space";

async function seedDefaults(database: Pool): Promise<void> {
	const agora = new Date().toISOString();
	const defaults: Array<[string, string]> = [
		["api_url", API_URL_PADRAO],
		["numeropdv", "1"],
		["qtd_mesas", "20"],
		["modelo_atendimento", "mesa"],
		["tempo_ociosidade_min", "15"],
		["filtro_apenas_abertas", "0"],
		["emitir_nfce", "1"],
		["tema", "light"],
		["pix_chave", ""],
		["impressora_nome", ""],
		["impressora_tipo", "sistema"],
		["impressora_host", ""],
		["impressora_porta", "9100"],
		["certificado_path", ""],
		["certificado_senha", ""],
		["lan_habilitada", "1"],
		["lan_porta", "5050"],
		["tecnibra_habilitada", "0"],
		["tecnibra_xml_path", "C:\\Tecnibra\\IHM Receptora\\Comandas.xml"],
		["tecnibra_intervalo_ms", "3000"],
		["tecnibra_xml_root", "Comandas"],
		["tecnibra_xml_item", "Comanda"],
	];

	for (const [chave, valor] of defaults) {
		await database.query(
			"INSERT INTO config (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING",
			[chave, valor],
		);
	}

	const apiAtual = await database.query<{ valor: string }>(
		"SELECT valor FROM config WHERE chave = 'api_url'",
	);
	if (apiAtual.rows[0]?.valor === API_URL_LEGADA) {
		await database.query(
			"UPDATE config SET valor = $1 WHERE chave = 'api_url'",
			[API_URL_PADRAO],
		);
	}

	const sessao = await database.query<{ id: number }>(
		"SELECT id FROM sessao WHERE id = 1",
	);
	if (!sessao.rows[0]) {
		await database.query(
			"INSERT INTO sessao (id, token, userid, username, idempresa, nomeempresa, atualizadoem) VALUES (1, NULL, NULL, NULL, NULL, NULL, $1)",
			[agora],
		);
	}

	const num = await database.query<{ id: number }>(
		"SELECT id FROM numeracao_nfce WHERE id = 1",
	);
	if (!num.rows[0]) {
		await database.query(
			"INSERT INTO numeracao_nfce (id, serie, proximo_numero, ambiente, atualizadoem) VALUES (1, 1, 1, 2, $1)",
			[agora],
		);
	}

	const qtdRow = await database.query<{ valor: string }>(
		"SELECT valor FROM config WHERE chave = 'qtd_mesas'",
	);
	const qtdMesas = Number(qtdRow.rows[0]?.valor ?? "20");
	await garantirMesasCom(database, qtdMesas);
}

async function garantirMesasCom(
	database: Pool | PoolClient,
	qtd: number,
): Promise<void> {
	const n = Math.max(1, qtd);
	for (let i = 1; i <= n; i++) {
		await database.query(
			"INSERT INTO mesa (numero, status) VALUES ($1, 'livre') ON CONFLICT (numero) DO NOTHING",
			[i],
		);
	}
}

export async function garantirMesas(qtd: number): Promise<void> {
	await garantirMesasCom(getPool(), qtd);
}

export async function getConfig(chave: string, fallback = ""): Promise<string> {
	const row = await queryOne<{ valor: string }>(
		"SELECT valor FROM config WHERE chave = $1",
		[chave],
	);
	return row?.valor ?? fallback;
}

export async function setConfig(chave: string, valor: string): Promise<void> {
	await execute(
		`INSERT INTO config (chave, valor) VALUES ($1, $2)
		 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
		[chave, valor],
	);
}

export async function getAllConfig(): Promise<Record<string, string>> {
	const rows = await query<{ chave: string; valor: string }>(
		"SELECT chave, valor FROM config",
	);
	return Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
}
