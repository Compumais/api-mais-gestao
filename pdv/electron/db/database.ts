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
	const { restartLanServer } = await import("../lan-api/server");
	await restartLanServer();
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
	if (!nomes.has("codigo")) {
		await database.query("ALTER TABLE produto_cache ADD COLUMN codigo INTEGER");
	}
	const colunasFiscais: Array<{ nome: string; ddl: string }> = [
		{ nome: "ncm", ddl: "ALTER TABLE produto_cache ADD COLUMN ncm TEXT" },
		{ nome: "cest", ddl: "ALTER TABLE produto_cache ADD COLUMN cest TEXT" },
		{ nome: "cfop", ddl: "ALTER TABLE produto_cache ADD COLUMN cfop TEXT" },
		{ nome: "cst", ddl: "ALTER TABLE produto_cache ADD COLUMN cst TEXT" },
		{ nome: "csosn", ddl: "ALTER TABLE produto_cache ADD COLUMN csosn TEXT" },
		{
			nome: "origem",
			ddl: "ALTER TABLE produto_cache ADD COLUMN origem INTEGER",
		},
		{
			nome: "aliquotaicms",
			ddl: "ALTER TABLE produto_cache ADD COLUMN aliquotaicms TEXT",
		},
	];
	for (const coluna of colunasFiscais) {
		if (!nomes.has(coluna.nome)) {
			await database.query(coluna.ddl);
		}
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

	const pedidoFilaCols = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'pedido_fila'`,
	);
	if (pedidoFilaCols.rows.length) {
		const pedidoFilaNomes = new Set(
			pedidoFilaCols.rows.map((c) => c.column_name),
		);
		if (!pedidoFilaNomes.has("observacao_pedido")) {
			await database.query(
				"ALTER TABLE pedido_fila ADD COLUMN observacao_pedido TEXT",
			);
		}
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
		if (!pagNomes.has("descricao")) {
			await database.query("ALTER TABLE pagamento ADD COLUMN descricao TEXT");
		}
		if (!pagNomes.has("formapagamentonfe")) {
			await database.query(
				"ALTER TABLE pagamento ADD COLUMN formapagamentonfe TEXT",
			);
		}
		if (!pagNomes.has("idtipodocumentofinanceiro")) {
			await database.query(
				"ALTER TABLE pagamento ADD COLUMN idtipodocumentofinanceiro TEXT",
			);
		}
		if (!pagNomes.has("aprazo")) {
			await database.query(
				"ALTER TABLE pagamento ADD COLUMN aprazo INTEGER NOT NULL DEFAULT 0",
			);
		}
	}

	const contaCols = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'conta_mesa'`,
	);
	if (contaCols.rows.length) {
		const contaNomes = new Set(contaCols.rows.map((c) => c.column_name));
		if (!contaNomes.has("numeropessoas")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN numeropessoas INTEGER NOT NULL DEFAULT 1",
			);
		}
		if (!contaNomes.has("valordesconto")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN valordesconto DOUBLE PRECISION NOT NULL DEFAULT 0",
			);
		}
		if (!contaNomes.has("valortaxaservico")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN valortaxaservico DOUBLE PRECISION NOT NULL DEFAULT 0",
			);
		}
		if (!contaNomes.has("valorcouvert")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN valorcouvert DOUBLE PRECISION NOT NULL DEFAULT 0",
			);
		}
		if (!contaNomes.has("taxa_ativa")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN taxa_ativa INTEGER NOT NULL DEFAULT 0",
			);
		}
		if (!contaNomes.has("modalidade")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN modalidade TEXT NOT NULL DEFAULT 'mesa'",
			);
		}
		if (!contaNomes.has("telefone")) {
			await database.query("ALTER TABLE conta_mesa ADD COLUMN telefone TEXT");
		}
		if (!contaNomes.has("endereco")) {
			await database.query("ALTER TABLE conta_mesa ADD COLUMN endereco TEXT");
		}
		if (!contaNomes.has("bairro")) {
			await database.query("ALTER TABLE conta_mesa ADD COLUMN bairro TEXT");
		}
		if (!contaNomes.has("complemento")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN complemento TEXT",
			);
		}
		if (!contaNomes.has("referencia")) {
			await database.query("ALTER TABLE conta_mesa ADD COLUMN referencia TEXT");
		}
		if (!contaNomes.has("valorentrega")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN valorentrega DOUBLE PRECISION NOT NULL DEFAULT 0",
			);
		}
		if (!contaNomes.has("status_entrega")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN status_entrega TEXT",
			);
		}
		if (!contaNomes.has("senha_chamada")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN senha_chamada TEXT",
			);
		}
		if (!contaNomes.has("idcliente")) {
			await database.query("ALTER TABLE conta_mesa ADD COLUMN idcliente TEXT");
		}
		if (!contaNomes.has("orderidintegracao")) {
			await database.query(
				"ALTER TABLE conta_mesa ADD COLUMN orderidintegracao TEXT",
			);
		}
		if (!contaNomes.has("obs")) {
			await database.query("ALTER TABLE conta_mesa ADD COLUMN obs TEXT");
		}
	}

	await database.query(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_conta_mesa_orderidintegracao_aberta
		ON conta_mesa (orderidintegracao)
		WHERE orderidintegracao IS NOT NULL AND status = 'aberta'
	`);

	await database.query(`
		CREATE TABLE IF NOT EXISTS cliente_pdv (
			id TEXT PRIMARY KEY NOT NULL,
			nome TEXT NOT NULL,
			telefone TEXT,
			cnpjcpf TEXT,
			endereco TEXT,
			bairro TEXT,
			complemento TEXT,
			referencia TEXT,
			atualizadoem TEXT NOT NULL
		)
	`);
	await database.query(
		`CREATE INDEX IF NOT EXISTS idx_cliente_pdv_telefone ON cliente_pdv(telefone)`,
	);
	await database.query(
		`CREATE INDEX IF NOT EXISTS idx_cliente_pdv_nome ON cliente_pdv(nome)`,
	);

	if (!itemNomes.has("pago")) {
		await database.query(
			"ALTER TABLE item_conta ADD COLUMN pago INTEGER NOT NULL DEFAULT 0",
		);
	}

	const vendaCols = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'venda'`,
	);
	if (vendaCols.rows.length) {
		const vendaNomes = new Set(vendaCols.rows.map((c) => c.column_name));
		if (!vendaNomes.has("valordesconto")) {
			await database.query(
				"ALTER TABLE venda ADD COLUMN valordesconto DOUBLE PRECISION NOT NULL DEFAULT 0",
			);
		}
		if (!vendaNomes.has("valortaxaservico")) {
			await database.query(
				"ALTER TABLE venda ADD COLUMN valortaxaservico DOUBLE PRECISION NOT NULL DEFAULT 0",
			);
		}
		if (!vendaNomes.has("valorcouvert")) {
			await database.query(
				"ALTER TABLE venda ADD COLUMN valorcouvert DOUBLE PRECISION NOT NULL DEFAULT 0",
			);
		}
		if (!vendaNomes.has("valorentrega")) {
			await database.query(
				"ALTER TABLE venda ADD COLUMN valorentrega DOUBLE PRECISION NOT NULL DEFAULT 0",
			);
		}
		if (!vendaNomes.has("idcliente")) {
			await database.query("ALTER TABLE venda ADD COLUMN idcliente TEXT");
		}
		if (!vendaNomes.has("nomecliente")) {
			await database.query("ALTER TABLE venda ADD COLUMN nomecliente TEXT");
		}
		if (!vendaNomes.has("cnpjcpf")) {
			await database.query("ALTER TABLE venda ADD COLUMN cnpjcpf TEXT");
		}
	}

	await database.query(`
		CREATE TABLE IF NOT EXISTS conta_pagamento (
			id TEXT PRIMARY KEY NOT NULL,
			idconta TEXT NOT NULL,
			meio TEXT NOT NULL,
			valor DOUBLE PRECISION NOT NULL,
			nsu TEXT,
			autorizacao TEXT,
			bandeira TEXT,
			status TEXT NOT NULL DEFAULT 'ok',
			criadoem TEXT NOT NULL
		)
	`);

	const sessaoCols = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'sessao'`,
	);
	if (sessaoCols.rows.length) {
		const sessaoNomes = new Set(sessaoCols.rows.map((c) => c.column_name));
		if (!sessaoNomes.has("roles")) {
			await database.query("ALTER TABLE sessao ADD COLUMN roles TEXT");
		}
		if (!sessaoNomes.has("modulogourmet")) {
			await database.query("ALTER TABLE sessao ADD COLUMN modulogourmet TEXT");
		}
	}

	const caixaCols = await database.query<{ column_name: string }>(
		`SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'caixa_turno'`,
	);
	if (caixaCols.rows.length) {
		const caixaNomes = new Set(caixaCols.rows.map((c) => c.column_name));
		if (!caixaNomes.has("idusuario")) {
			await database.query("ALTER TABLE caixa_turno ADD COLUMN idusuario TEXT");
		}
		if (!caixaNomes.has("username")) {
			await database.query("ALTER TABLE caixa_turno ADD COLUMN username TEXT");
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
		["modal_abrir_mesa_habilitado", "1"],
		["tempo_ociosidade_min", "15"],
		["filtro_apenas_abertas", "0"],
		["emitir_nfce", "1"],
		[
			"nfce_meios_pagamento",
			'{"dinheiro":true,"cartao":true,"pix":true,"prepago":false}',
		],
		["tema", "light"],
		["pix_chave", ""],
		["impressora_nome", ""],
		["impressora_tipo", "sistema"],
		["impressora_host", ""],
		["impressora_porta", "9100"],
		["certificado_path", ""],
		["certificado_senha", ""],
		["certificado_apelido", ""],
		["certificado_validade", ""],
		["fiscal_ultima_sync", ""],
		["fiscal_sync_erro", ""],
		["lan_habilitada", "1"],
		["lan_porta", "5050"],
		["pdv_modo", "principal"],
		["pdv_principal_host", ""],
		["pdv_principal_porta", "5050"],
		["tecnibra_habilitada", "0"],
		["tecnibra_xml_path", "C:\\Tecnibra\\IHM Receptora\\Comandas.xml"],
		["tecnibra_intervalo_ms", "3000"],
		["tecnibra_xml_root", "Comandas"],
		["tecnibra_xml_item", "Comanda"],
		["taxa_servico_percentual", "10"],
		["couvert_valor", "0"],
		["balanca_habilitada", "0"],
		["balanca_porta", ""],
		["balanca_baud", "9600"],
		["balanca_protocolo", "toledo"],
		["etiqueta_balanca_habilitada", "0"],
		["etiqueta_balanca_prefixo", "2"],
		["etiqueta_balanca_digitos_codigo", "4"],
		["etiqueta_balanca_conteudo", "preco"],
		["etiqueta_balanca_centavos", "1"],
		["etiqueta_balanca_indicador_uso", "0"],
		["taxa_entrega_padrao", "0"],
		["bairros_entrega", "[]"],
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
