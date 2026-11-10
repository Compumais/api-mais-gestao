"use strict";
const node_path = require("node:path");
const electron = require("electron");
const node_fs = require("node:fs");
const pg = require("pg");
const node_crypto = require("node:crypto");
const uuid = require("uuid");
const promises = require("node:fs/promises");
const node_http = require("node:http");
const node_buffer = require("node:buffer");
const net = require("node:net");
const node_child_process = require("node:child_process");
const node_util = require("node:util");
const node_module = require("node:module");
const node_stream = require("node:stream");
const promises$1 = require("node:stream/promises");
const node_zlib = require("node:zlib");
const node_os = require("node:os");
const SCHEMA_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS config (
	chave TEXT PRIMARY KEY NOT NULL,
	valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessao (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	token TEXT,
	userid TEXT,
	username TEXT,
	idempresa TEXT,
	nomeempresa TEXT,
	roles TEXT,
	modulogourmet TEXT,
	atualizadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grupo (
	id TEXT PRIMARY KEY NOT NULL,
	nome TEXT NOT NULL,
	atualizadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grupo_gourmet (
	id TEXT PRIMARY KEY NOT NULL,
	nome TEXT NOT NULL,
	atualizadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS impressora_grupo_gourmet (
	idgrupogourmet TEXT PRIMARY KEY NOT NULL,
	impressora_nome TEXT NOT NULL DEFAULT '',
	destino TEXT NOT NULL DEFAULT 'sistema',
	host TEXT NOT NULL DEFAULT '',
	porta INTEGER NOT NULL DEFAULT 9100
);

CREATE TABLE IF NOT EXISTS produto_cache (
	id TEXT PRIMARY KEY NOT NULL,
	descricao TEXT NOT NULL,
	preco DOUBLE PRECISION NOT NULL DEFAULT 0,
	unidademedida TEXT,
	idunidademedida TEXT,
	ean TEXT,
	codigo INTEGER,
	idgrupo TEXT,
	idgrupogourmet TEXT,
	espizza INTEGER NOT NULL DEFAULT 0,
	imagem TEXT,
	caminhoimagem TEXT,
	inativo INTEGER NOT NULL DEFAULT 0,
	atualizadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atalho (
	ordem INTEGER NOT NULL,
	idproduto TEXT NOT NULL,
	PRIMARY KEY (ordem)
);

CREATE TABLE IF NOT EXISTS cliente (
	id TEXT PRIMARY KEY NOT NULL,
	nome TEXT NOT NULL,
	razaosocial TEXT,
	cnpjcpf TEXT,
	telefone TEXT,
	email TEXT,
	inativo INTEGER NOT NULL DEFAULT 0,
	atualizadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bandeira_cartao (
	id TEXT PRIMARY KEY NOT NULL,
	codigo TEXT,
	descricao TEXT NOT NULL,
	inativo INTEGER NOT NULL DEFAULT 0,
	atualizadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meio_pagamento (
	id TEXT PRIMARY KEY NOT NULL,
	descricao TEXT NOT NULL,
	formapagamentonfe TEXT,
	aprazo INTEGER NOT NULL DEFAULT 0,
	inativo INTEGER NOT NULL DEFAULT 0,
	atualizadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS caixa_turno (
	id TEXT PRIMARY KEY NOT NULL,
	idempresa TEXT NOT NULL,
	numeropdv INTEGER NOT NULL DEFAULT 1,
	idusuario TEXT,
	username TEXT,
	abertoem TEXT NOT NULL,
	fechadoem TEXT,
	valorabertura DOUBLE PRECISION NOT NULL DEFAULT 0,
	valorfechamento DOUBLE PRECISION,
	status TEXT NOT NULL DEFAULT 'aberto',
	idremoto TEXT,
	sync_status TEXT NOT NULL DEFAULT 'pendente'
);

CREATE TABLE IF NOT EXISTS mesa (
	numero INTEGER PRIMARY KEY NOT NULL,
	status TEXT NOT NULL DEFAULT 'livre',
	idconta TEXT,
	nomecliente TEXT
);

CREATE TABLE IF NOT EXISTS conta_mesa (
	id TEXT PRIMARY KEY NOT NULL,
	numero_mesa INTEGER NOT NULL,
	idempresa TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'aberta',
	nomecliente TEXT,
	abertoem TEXT NOT NULL,
	fechadoem TEXT,
	valortotal DOUBLE PRECISION NOT NULL DEFAULT 0,
	numeropessoas INTEGER NOT NULL DEFAULT 1,
	valordesconto DOUBLE PRECISION NOT NULL DEFAULT 0,
	valortaxaservico DOUBLE PRECISION NOT NULL DEFAULT 0,
	valorcouvert DOUBLE PRECISION NOT NULL DEFAULT 0,
	taxa_ativa INTEGER NOT NULL DEFAULT 0,
	modalidade TEXT NOT NULL DEFAULT 'mesa',
	telefone TEXT,
	endereco TEXT,
	bairro TEXT,
	complemento TEXT,
	referencia TEXT,
	valorentrega DOUBLE PRECISION NOT NULL DEFAULT 0,
	status_entrega TEXT,
	senha_chamada TEXT,
	idcliente TEXT,
	orderidintegracao TEXT,
	obs TEXT,
	idremoto TEXT,
	sync_status TEXT NOT NULL DEFAULT 'pendente'
);

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
);

CREATE TABLE IF NOT EXISTS item_conta (
	id TEXT PRIMARY KEY NOT NULL,
	idconta TEXT NOT NULL,
	idproduto TEXT NOT NULL,
	descricao TEXT NOT NULL,
	quantidade DOUBLE PRECISION NOT NULL,
	precounitario DOUBLE PRECISION NOT NULL,
	precototal DOUBLE PRECISION NOT NULL,
	observacao TEXT,
	pago INTEGER NOT NULL DEFAULT 0,
	criadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pedido_fila (
	id TEXT PRIMARY KEY NOT NULL,
	client_order_id TEXT NOT NULL,
	idconta TEXT NOT NULL,
	numero_mesa INTEGER NOT NULL,
	nomecliente TEXT,
	idproduto TEXT NOT NULL,
	descricao TEXT NOT NULL,
	quantidade DOUBLE PRECISION NOT NULL,
	observacao TEXT,
	status TEXT NOT NULL DEFAULT 'pendente',
	criadoem TEXT NOT NULL,
	entregueem TEXT
);

CREATE TABLE IF NOT EXISTS venda (
	id TEXT PRIMARY KEY NOT NULL,
	idempresa TEXT NOT NULL,
	numeropdv INTEGER NOT NULL DEFAULT 1,
	origem TEXT NOT NULL DEFAULT 'rapida',
	idconta TEXT,
	status TEXT NOT NULL DEFAULT 'fechada',
	meio_pagamento TEXT NOT NULL,
	valortotal DOUBLE PRECISION NOT NULL,
	valordinheiro DOUBLE PRECISION NOT NULL DEFAULT 0,
	valorpix DOUBLE PRECISION NOT NULL DEFAULT 0,
	valorcartao DOUBLE PRECISION NOT NULL DEFAULT 0,
	valortroco DOUBLE PRECISION NOT NULL DEFAULT 0,
	valordesconto DOUBLE PRECISION NOT NULL DEFAULT 0,
	valortaxaservico DOUBLE PRECISION NOT NULL DEFAULT 0,
	valorcouvert DOUBLE PRECISION NOT NULL DEFAULT 0,
	valorentrega DOUBLE PRECISION NOT NULL DEFAULT 0,
	criadoem TEXT NOT NULL,
	idremoto TEXT,
	sync_status TEXT NOT NULL DEFAULT 'pendente',
	nfce_status TEXT NOT NULL DEFAULT 'nenhuma',
	idnfce_local TEXT,
	idcliente TEXT,
	nomecliente TEXT,
	cnpjcpf TEXT
);

CREATE TABLE IF NOT EXISTS item_venda (
	id TEXT PRIMARY KEY NOT NULL,
	idvenda TEXT NOT NULL,
	idproduto TEXT NOT NULL,
	descricao TEXT NOT NULL,
	quantidade DOUBLE PRECISION NOT NULL,
	precounitario DOUBLE PRECISION NOT NULL,
	precototal DOUBLE PRECISION NOT NULL
);

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
);

CREATE TABLE IF NOT EXISTS pagamento (
	id TEXT PRIMARY KEY NOT NULL,
	idvenda TEXT NOT NULL,
	meio TEXT NOT NULL,
	valor DOUBLE PRECISION NOT NULL,
	nsu TEXT,
	autorizacao TEXT,
	bandeira TEXT,
	status TEXT NOT NULL DEFAULT 'ok',
	descricao TEXT,
	formapagamentonfe TEXT,
	idtipodocumentofinanceiro TEXT,
	aprazo INTEGER NOT NULL DEFAULT 0,
	criadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nfce_local (
	id TEXT PRIMARY KEY NOT NULL,
	idvenda TEXT NOT NULL,
	serie INTEGER NOT NULL,
	numero INTEGER NOT NULL,
	chave TEXT,
	tpemis INTEGER NOT NULL DEFAULT 1,
	status TEXT NOT NULL DEFAULT 'pendente',
	xml TEXT,
	qrcode TEXT,
	protocolo TEXT,
	motivo_contingencia TEXT,
	data_contingencia TEXT,
	transmitida INTEGER NOT NULL DEFAULT 0,
	criadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS numeracao_nfce (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	serie INTEGER NOT NULL DEFAULT 1,
	proximo_numero INTEGER NOT NULL DEFAULT 1,
	csc_id TEXT,
	csc_token TEXT,
	cnpj TEXT,
	uf TEXT,
	ambiente INTEGER NOT NULL DEFAULT 2,
	atualizadoem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
	id TEXT PRIMARY KEY NOT NULL,
	tipo TEXT NOT NULL,
	payload TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'pendente',
	tentativas INTEGER NOT NULL DEFAULT 0,
	ultimo_erro TEXT,
	criadoem TEXT NOT NULL,
	processadoem TEXT
);

CREATE TABLE IF NOT EXISTS sync_meta (
	chave TEXT PRIMARY KEY NOT NULL,
	valor TEXT NOT NULL,
	atualizadoem TEXT NOT NULL
);
`;
const SCHEMA_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status, criadoem);
CREATE INDEX IF NOT EXISTS idx_venda_criadoem ON venda(criadoem DESC);
CREATE INDEX IF NOT EXISTS idx_produto_descricao ON produto_cache(descricao);
CREATE INDEX IF NOT EXISTS idx_produto_grupo ON produto_cache(idgrupo);
CREATE INDEX IF NOT EXISTS idx_produto_grupo_gourmet ON produto_cache(idgrupogourmet);
CREATE INDEX IF NOT EXISTS idx_produto_ean ON produto_cache(ean);
CREATE INDEX IF NOT EXISTS idx_produto_codigo ON produto_cache(codigo);
CREATE INDEX IF NOT EXISTS idx_conta_status ON conta_mesa(status);
CREATE INDEX IF NOT EXISTS idx_pedido_fila_status ON pedido_fila(status, criadoem);
CREATE INDEX IF NOT EXISTS idx_pedido_fila_client ON pedido_fila(client_order_id);
CREATE INDEX IF NOT EXISTS idx_pagamento_idvenda ON pagamento(idvenda);
CREATE INDEX IF NOT EXISTS idx_conta_pagamento_idconta ON conta_pagamento(idconta);
CREATE INDEX IF NOT EXISTS idx_item_conta_pago ON item_conta(idconta, pago);
CREATE INDEX IF NOT EXISTS idx_cliente_nome ON cliente(nome);
CREATE INDEX IF NOT EXISTS idx_cliente_cnpjcpf ON cliente(cnpjcpf);
CREATE INDEX IF NOT EXISTS idx_bandeira_descricao ON bandeira_cartao(descricao);
CREATE INDEX IF NOT EXISTS idx_meio_pagamento_descricao ON meio_pagamento(descricao);
CREATE INDEX IF NOT EXISTS idx_conta_mesa_modalidade ON conta_mesa(modalidade, status);
CREATE INDEX IF NOT EXISTS idx_cliente_pdv_telefone ON cliente_pdv(telefone);
CREATE INDEX IF NOT EXISTS idx_cliente_pdv_nome ON cliente_pdv(nome);
`;
const DATABASE_URL_PADRAO = "postgresql://pdv:pdv@127.0.0.1:5433/pdv_local";
class BancoIndisponivelError extends Error {
  constructor(message = "PostgreSQL local indisponível. Inicie o banco (docker compose up -d em pdv/) e tente novamente.") {
    super(message);
    this.name = "BancoIndisponivelError";
  }
}
let pool = null;
function isDbReady() {
  return pool !== null;
}
function arquivoUrlPath() {
  return node_path.join(electron.app.getPath("userData"), "database-url.txt");
}
function obterDatabaseUrl() {
  const env = process.env.PDV_DATABASE_URL?.trim();
  if (env) {
    return env;
  }
  try {
    const path = arquivoUrlPath();
    if (node_fs.existsSync(path)) {
      const txt = node_fs.readFileSync(path, "utf8").trim();
      if (txt) {
        return txt;
      }
    }
  } catch {
  }
  return DATABASE_URL_PADRAO;
}
function salvarDatabaseUrlArquivo(url) {
  const dir = electron.app.getPath("userData");
  node_fs.mkdirSync(dir, { recursive: true });
  node_fs.writeFileSync(arquivoUrlPath(), `${url.trim()}
`, "utf8");
}
function isBancoIndisponivelError(err) {
  return err instanceof BancoIndisponivelError;
}
function wrapPgError(err) {
  if (err instanceof BancoIndisponivelError) {
    return err;
  }
  if (err && typeof err === "object") {
    const code = err.code;
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT" || code === "ECONNRESET" || code === "57P01" || code === "57P03") {
      return new BancoIndisponivelError();
    }
    if (code === "3D000" || code === "28P01" || code === "28000") {
      const message = err instanceof Error ? err.message : String(err);
      return new BancoIndisponivelError(
        `PostgreSQL local indisponível: ${message}`
      );
    }
  }
  return err instanceof Error ? err : new Error(String(err));
}
function getPool() {
  if (!pool) {
    throw new BancoIndisponivelError();
  }
  return pool;
}
async function query(text, params = [], client) {
  try {
    const executor = client ?? getPool();
    const result = await executor.query(text, params);
    return result.rows;
  } catch (err) {
    throw wrapPgError(err);
  }
}
async function queryOne(text, params = [], client) {
  const rows = await query(text, params, client);
  return rows[0];
}
async function execute(text, params = [], client) {
  await query(text, params, client);
}
async function withTransaction(fn) {
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
    }
    throw wrapPgError(err);
  } finally {
    client.release();
  }
}
async function initDb() {
  if (pool) {
    return;
  }
  const url = obterDatabaseUrl();
  const next = new pg.Pool({
    connectionString: url,
    max: 8,
    idleTimeoutMillis: 3e4,
    connectionTimeoutMillis: 5e3
  });
  try {
    await next.query("SELECT 1");
    await execSql(next, SCHEMA_TABLES_SQL);
    await aplicarMigracoesLeves(next);
    await execSql(next, SCHEMA_INDEXES_SQL);
    await seedDefaults(next);
  } catch (err) {
    await next.end().catch(() => void 0);
    throw wrapPgError(err);
  }
  pool = next;
}
async function closeDb() {
  if (pool) {
    const atual = pool;
    pool = null;
    await atual.end().catch(() => void 0);
  }
}
async function reconectarDb() {
  await closeDb();
  await initDb();
  const { restartLanServer: restartLanServer2 } = await Promise.resolve().then(() => server$1);
  await restartLanServer2();
}
async function execSql(database, sql) {
  const partes = sql.split(";").map((parte) => parte.trim()).filter((parte) => parte.length > 0);
  for (const parte of partes) {
    await database.query(parte);
  }
}
async function aplicarMigracoesLeves(database) {
  const colunas = await database.query(
    `SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'produto_cache'`
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
      "ALTER TABLE produto_cache ADD COLUMN caminhoimagem TEXT"
    );
  }
  if (!nomes.has("idgrupogourmet")) {
    await database.query(
      "ALTER TABLE produto_cache ADD COLUMN idgrupogourmet TEXT"
    );
  }
  if (!nomes.has("espizza")) {
    await database.query(
      "ALTER TABLE produto_cache ADD COLUMN espizza INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!nomes.has("codigo")) {
    await database.query("ALTER TABLE produto_cache ADD COLUMN codigo INTEGER");
  }
  const itemCols = await database.query(
    `SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'item_conta'`
  );
  const itemNomes = new Set(itemCols.rows.map((c) => c.column_name));
  if (!itemNomes.has("observacao")) {
    await database.query("ALTER TABLE item_conta ADD COLUMN observacao TEXT");
  }
  const gourmetCols = await database.query(
    `SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'impressora_grupo_gourmet'`
  );
  if (gourmetCols.rows.length) {
    const gourmetNomes = new Set(gourmetCols.rows.map((c) => c.column_name));
    if (!gourmetNomes.has("destino")) {
      await database.query(
        "ALTER TABLE impressora_grupo_gourmet ADD COLUMN destino TEXT NOT NULL DEFAULT 'sistema'"
      );
    }
    if (!gourmetNomes.has("host")) {
      await database.query(
        "ALTER TABLE impressora_grupo_gourmet ADD COLUMN host TEXT NOT NULL DEFAULT ''"
      );
    }
    if (!gourmetNomes.has("porta")) {
      await database.query(
        "ALTER TABLE impressora_grupo_gourmet ADD COLUMN porta INTEGER NOT NULL DEFAULT 9100"
      );
    }
  }
  const pagCols = await database.query(
    `SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'pagamento'`
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
        "ALTER TABLE pagamento ADD COLUMN status TEXT NOT NULL DEFAULT 'ok'"
      );
    }
    if (!pagNomes.has("descricao")) {
      await database.query("ALTER TABLE pagamento ADD COLUMN descricao TEXT");
    }
    if (!pagNomes.has("formapagamentonfe")) {
      await database.query(
        "ALTER TABLE pagamento ADD COLUMN formapagamentonfe TEXT"
      );
    }
    if (!pagNomes.has("idtipodocumentofinanceiro")) {
      await database.query(
        "ALTER TABLE pagamento ADD COLUMN idtipodocumentofinanceiro TEXT"
      );
    }
    if (!pagNomes.has("aprazo")) {
      await database.query(
        "ALTER TABLE pagamento ADD COLUMN aprazo INTEGER NOT NULL DEFAULT 0"
      );
    }
  }
  const contaCols = await database.query(
    `SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'conta_mesa'`
  );
  if (contaCols.rows.length) {
    const contaNomes = new Set(contaCols.rows.map((c) => c.column_name));
    if (!contaNomes.has("numeropessoas")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN numeropessoas INTEGER NOT NULL DEFAULT 1"
      );
    }
    if (!contaNomes.has("valordesconto")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN valordesconto DOUBLE PRECISION NOT NULL DEFAULT 0"
      );
    }
    if (!contaNomes.has("valortaxaservico")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN valortaxaservico DOUBLE PRECISION NOT NULL DEFAULT 0"
      );
    }
    if (!contaNomes.has("valorcouvert")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN valorcouvert DOUBLE PRECISION NOT NULL DEFAULT 0"
      );
    }
    if (!contaNomes.has("taxa_ativa")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN taxa_ativa INTEGER NOT NULL DEFAULT 0"
      );
    }
    if (!contaNomes.has("modalidade")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN modalidade TEXT NOT NULL DEFAULT 'mesa'"
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
        "ALTER TABLE conta_mesa ADD COLUMN complemento TEXT"
      );
    }
    if (!contaNomes.has("referencia")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN referencia TEXT"
      );
    }
    if (!contaNomes.has("valorentrega")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN valorentrega DOUBLE PRECISION NOT NULL DEFAULT 0"
      );
    }
    if (!contaNomes.has("status_entrega")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN status_entrega TEXT"
      );
    }
    if (!contaNomes.has("senha_chamada")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN senha_chamada TEXT"
      );
    }
    if (!contaNomes.has("idcliente")) {
      await database.query("ALTER TABLE conta_mesa ADD COLUMN idcliente TEXT");
    }
    if (!contaNomes.has("orderidintegracao")) {
      await database.query(
        "ALTER TABLE conta_mesa ADD COLUMN orderidintegracao TEXT"
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
    `CREATE INDEX IF NOT EXISTS idx_cliente_pdv_telefone ON cliente_pdv(telefone)`
  );
  await database.query(
    `CREATE INDEX IF NOT EXISTS idx_cliente_pdv_nome ON cliente_pdv(nome)`
  );
  if (!itemNomes.has("pago")) {
    await database.query(
      "ALTER TABLE item_conta ADD COLUMN pago INTEGER NOT NULL DEFAULT 0"
    );
  }
  const vendaCols = await database.query(
    `SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'venda'`
  );
  if (vendaCols.rows.length) {
    const vendaNomes = new Set(vendaCols.rows.map((c) => c.column_name));
    if (!vendaNomes.has("valordesconto")) {
      await database.query(
        "ALTER TABLE venda ADD COLUMN valordesconto DOUBLE PRECISION NOT NULL DEFAULT 0"
      );
    }
    if (!vendaNomes.has("valortaxaservico")) {
      await database.query(
        "ALTER TABLE venda ADD COLUMN valortaxaservico DOUBLE PRECISION NOT NULL DEFAULT 0"
      );
    }
    if (!vendaNomes.has("valorcouvert")) {
      await database.query(
        "ALTER TABLE venda ADD COLUMN valorcouvert DOUBLE PRECISION NOT NULL DEFAULT 0"
      );
    }
    if (!vendaNomes.has("valorentrega")) {
      await database.query(
        "ALTER TABLE venda ADD COLUMN valorentrega DOUBLE PRECISION NOT NULL DEFAULT 0"
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
  const sessaoCols = await database.query(
    `SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'sessao'`
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
  const caixaCols = await database.query(
    `SELECT column_name
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'caixa_turno'`
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
const API_URL_LEGADA = "https://api.maisgestao.com.br";
const API_URL_PADRAO = "https://api.compuchat.space";
async function seedDefaults(database) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  const defaults = [
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
    ["bairros_entrega", "[]"]
  ];
  for (const [chave, valor] of defaults) {
    await database.query(
      "INSERT INTO config (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING",
      [chave, valor]
    );
  }
  const apiAtual = await database.query(
    "SELECT valor FROM config WHERE chave = 'api_url'"
  );
  if (apiAtual.rows[0]?.valor === API_URL_LEGADA) {
    await database.query(
      "UPDATE config SET valor = $1 WHERE chave = 'api_url'",
      [API_URL_PADRAO]
    );
  }
  const sessao = await database.query(
    "SELECT id FROM sessao WHERE id = 1"
  );
  if (!sessao.rows[0]) {
    await database.query(
      "INSERT INTO sessao (id, token, userid, username, idempresa, nomeempresa, atualizadoem) VALUES (1, NULL, NULL, NULL, NULL, NULL, $1)",
      [agora]
    );
  }
  const num = await database.query(
    "SELECT id FROM numeracao_nfce WHERE id = 1"
  );
  if (!num.rows[0]) {
    await database.query(
      "INSERT INTO numeracao_nfce (id, serie, proximo_numero, ambiente, atualizadoem) VALUES (1, 1, 1, 2, $1)",
      [agora]
    );
  }
  const qtdRow = await database.query(
    "SELECT valor FROM config WHERE chave = 'qtd_mesas'"
  );
  const qtdMesas = Number(qtdRow.rows[0]?.valor ?? "20");
  await garantirMesasCom(database, qtdMesas);
}
async function garantirMesasCom(database, qtd) {
  const n = Math.max(1, qtd);
  for (let i = 1; i <= n; i++) {
    await database.query(
      "INSERT INTO mesa (numero, status) VALUES ($1, 'livre') ON CONFLICT (numero) DO NOTHING",
      [i]
    );
  }
}
async function garantirMesas(qtd) {
  await garantirMesasCom(getPool(), qtd);
}
async function getConfig(chave, fallback = "") {
  const row = await queryOne(
    "SELECT valor FROM config WHERE chave = $1",
    [chave]
  );
  return row?.valor ?? fallback;
}
async function setConfig(chave, valor) {
  await execute(
    `INSERT INTO config (chave, valor) VALUES ($1, $2)
		 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
    [chave, valor]
  );
}
async function getAllConfig() {
  const rows = await query(
    "SELECT chave, valor FROM config"
  );
  return Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
}
function dirDadosPdv() {
  return electron.app.getPath("userData");
}
function dirXmlNfce() {
  return node_path.join(dirDadosPdv(), "xml-nfce");
}
function dirCertificadosPdv() {
  return node_path.join(dirDadosPdv(), "certificados");
}
function dirBackupsEmpresa() {
  return node_path.join(dirDadosPdv(), "backups-empresa");
}
function nomeArquivoXmlNfce(params) {
  const chave = (params.chave ?? "").replace(/\D/g, "");
  if (chave.length === 44) {
    return `${chave}.xml`;
  }
  return `S${params.serie}-N${params.numero}.xml`;
}
async function gravarXmlNfceArquivo(params) {
  const xml = params.xml.trim();
  if (!xml) return;
  const dir = dirXmlNfce();
  await promises.mkdir(dir, { recursive: true });
  await promises.writeFile(node_path.join(dir, nomeArquivoXmlNfce(params)), xml, "utf8");
}
async function esvaziarPasta(dir) {
  if (!node_fs.existsSync(dir)) {
    return;
  }
  const entradas = await promises.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entradas.map(
      (entrada) => promises.rm(node_path.join(dir, entrada.name), { recursive: true, force: true })
    )
  );
}
const DESCRICAO_NFCE_MAX = 120;
function produtoEhPizza(produto) {
  return Number(produto.espizza) === 1 || produto.espizza === true;
}
function montarDescricaoPizzaMeioAMeio(primeiro, segundo) {
  const texto = `Pizza meio a meio: ${primeiro.trim()} / ${segundo.trim()}`;
  if (texto.length <= DESCRICAO_NFCE_MAX) {
    return texto;
  }
  return texto.slice(0, DESCRICAO_NFCE_MAX);
}
function montarItemPizzaMeioAMeio(primeiro, segundo) {
  const precoPrimeiro = Number(primeiro.preco) || 0;
  const precoSegundo = Number(segundo.preco) || 0;
  const principal = precoPrimeiro >= precoSegundo ? primeiro : segundo;
  const outro = principal.id === primeiro.id ? segundo : primeiro;
  const precounitario = Math.max(precoPrimeiro, precoSegundo);
  return {
    idproduto: principal.id,
    idprodutomeio: outro.id,
    descricao: montarDescricaoPizzaMeioAMeio(
      primeiro.descricao,
      segundo.descricao
    ),
    quantidade: 1,
    precounitario,
    precototal: precounitario
  };
}
function arredondarMoeda(valor) {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor * 100) / 100;
}
function normalizarPessoas(valor) {
  const n = Math.floor(Number(valor));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}
function somarSubtotalItens(itens) {
  return arredondarMoeda(
    itens.reduce((acc, item) => acc + Number(item.precototal || 0), 0)
  );
}
function recalcularTotaisConta(itens, ajustes) {
  const subtotal = somarSubtotalItens(itens);
  const numeropessoas = normalizarPessoas(ajustes.numeropessoas);
  const desconto = arredondarMoeda(
    Math.min(Math.max(0, Number(ajustes.desconto) || 0), subtotal)
  );
  const percentual = Math.max(0, Number(ajustes.percentualTaxa) || 0);
  const valortaxaservico = ajustes.taxaAtiva ? arredondarMoeda(subtotal * (percentual / 100)) : 0;
  const valorcouvert = arredondarMoeda(
    Math.max(0, Number(ajustes.couvertUnitario) || 0) * numeropessoas
  );
  const valorentrega = arredondarMoeda(
    Math.max(0, Number(ajustes.valorentrega) || 0)
  );
  const valortotal = arredondarMoeda(
    Math.max(
      0,
      subtotal - desconto + valortaxaservico + valorcouvert + valorentrega
    )
  );
  return {
    subtotal,
    valordesconto: desconto,
    valortaxaservico,
    valorcouvert,
    valorentrega,
    valortotal,
    numeropessoas
  };
}
function ratearAjustes(subtotalFatia, totais) {
  const fatia = arredondarMoeda(subtotalFatia);
  if (totais.subtotal <= 0) {
    return { desconto: 0, taxa: 0, couvert: 0, entrega: 0, total: 0 };
  }
  const r = fatia / totais.subtotal;
  const desconto = arredondarMoeda(totais.valordesconto * r);
  const taxa = arredondarMoeda(totais.valortaxaservico * r);
  const couvert = arredondarMoeda(totais.valorcouvert * r);
  const entrega = arredondarMoeda((totais.valorentrega || 0) * r);
  const total = arredondarMoeda(fatia - desconto + taxa + couvert + entrega);
  return { desconto, taxa, couvert, entrega, total };
}
function partirPorItens(itens, grupos, totais) {
  if (!grupos.length) {
    throw new Error("Informe os itens de cada pagador");
  }
  const porId = new Map(itens.map((i) => [i.id, i]));
  const usados = /* @__PURE__ */ new Set();
  const fatias = [];
  let accDesconto = 0;
  let accTaxa = 0;
  let accCouvert = 0;
  let accEntrega = 0;
  let accTotal = 0;
  for (let i = 0; i < grupos.length; i += 1) {
    const ids = [...new Set(grupos[i] ?? [])];
    if (!ids.length) {
      throw new Error("Cada pagador precisa de ao menos um item");
    }
    let subtotal = 0;
    for (const id of ids) {
      if (usados.has(id)) {
        throw new Error("O mesmo item não pode ir para dois pagadores");
      }
      const item = porId.get(id);
      if (!item) {
        throw new Error("Item não encontrado na conta");
      }
      usados.add(id);
      subtotal = arredondarMoeda(subtotal + item.precototal);
    }
    const ultima = i === grupos.length - 1;
    if (ultima) {
      const desconto = arredondarMoeda(totais.valordesconto - accDesconto);
      const taxa = arredondarMoeda(totais.valortaxaservico - accTaxa);
      const couvert = arredondarMoeda(totais.valorcouvert - accCouvert);
      const entrega = arredondarMoeda(
        (totais.valorentrega || 0) - accEntrega
      );
      const total = arredondarMoeda(totais.valortotal - accTotal);
      fatias.push({
        ids,
        subtotal,
        desconto,
        taxa,
        couvert,
        entrega,
        total
      });
    } else {
      const rateio = ratearAjustes(subtotal, totais);
      accDesconto = arredondarMoeda(accDesconto + rateio.desconto);
      accTaxa = arredondarMoeda(accTaxa + rateio.taxa);
      accCouvert = arredondarMoeda(accCouvert + rateio.couvert);
      accEntrega = arredondarMoeda(accEntrega + rateio.entrega);
      accTotal = arredondarMoeda(accTotal + rateio.total);
      fatias.push({
        ids,
        subtotal,
        desconto: rateio.desconto,
        taxa: rateio.taxa,
        couvert: rateio.couvert,
        entrega: rateio.entrega,
        total: rateio.total
      });
    }
  }
  return fatias;
}
function valorRestante(total, pago) {
  return arredondarMoeda(Math.max(0, arredondarMoeda(total) - arredondarMoeda(pago)));
}
function mensagemErroCancelarItem(params) {
  if (!params.contaValida) {
    return "Conta inválida";
  }
  if (!params.itemEncontrado) {
    return "Item não encontrado na conta";
  }
  if (params.itemPago) {
    return "Item já pago não pode ser cancelado";
  }
  if (params.valorPago != null && params.totalAposCancelar != null && params.valorPago > params.totalAposCancelar + 9e-3) {
    return "Não é possível cancelar: o valor já pago ficaria maior que o total da conta.";
  }
  return null;
}
const contaGourmet = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  arredondarMoeda,
  mensagemErroCancelarItem,
  normalizarPessoas,
  partirPorItens,
  ratearAjustes,
  recalcularTotaisConta,
  somarSubtotalItens,
  valorRestante
}, Symbol.toStringTag, { value: "Module" }));
const MEIOS = ["DINHEIRO", "PIX", "CARTAO", "OUTROS"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS = [
  "ok",
  "pendente",
  "cancelado"
];
function arredondarDinheiro(valor) {
  return Math.round(valor * 100) / 100;
}
function ehMeioPagamento(valor) {
  return typeof valor === "string" && MEIOS.includes(valor.toUpperCase());
}
function ehStatusLancamento(valor) {
  return typeof valor === "string" && STATUS.includes(valor);
}
function lancamentoUnico(meio, valor) {
  return {
    meio,
    valor: arredondarDinheiro(valor),
    status: "ok"
  };
}
function normalizarMeioPagamento(valor, fallback = "DINHEIRO") {
  const meio = String(valor ?? "").trim().toUpperCase();
  return ehMeioPagamento(meio) ? meio : fallback;
}
function normalizarLancamento(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const item = raw;
  const meio = String(item.meio ?? "").trim().toUpperCase();
  if (!ehMeioPagamento(meio)) {
    return null;
  }
  const valor = arredondarDinheiro(Number(item.valor ?? 0));
  if (!Number.isFinite(valor) || valor <= 0) {
    return null;
  }
  const statusRaw = item.status ?? "ok";
  const status2 = ehStatusLancamento(statusRaw) ? statusRaw : "ok";
  const nsu = textoOpcional(item.nsu);
  const autorizacao = textoOpcional(item.autorizacao);
  const bandeira = textoOpcional(item.bandeira);
  const descricao = textoOpcional(item.descricao);
  const formapagamentonfe = textoOpcional(item.formapagamentonfe);
  const idtipodocumentofinanceiro = textoOpcional(
    item.idtipodocumentofinanceiro
  );
  const aprazo = Number(item.aprazo ?? 0) === 1 ? 1 : 0;
  const id = textoOpcional(item.id);
  return {
    ...id ? { id } : {},
    meio,
    valor,
    status: status2,
    nsu,
    autorizacao,
    bandeira,
    descricao,
    formapagamentonfe,
    idtipodocumentofinanceiro,
    aprazo
  };
}
function normalizarLancamentos(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizarLancamento).filter((item) => item !== null);
}
function lancamentosDeBody(body, fallback) {
  const lista = normalizarLancamentos(body.pagamentos ?? body.lancamentos);
  if (lista.length) {
    return lista;
  }
  const meio = body.meio != null ? normalizarMeioPagamento(body.meio) : null;
  const valor = Number(body.valor ?? 0);
  if (meio && valor > 0) {
    return [lancamentoUnico(meio, valor)];
  }
  return [];
}
function lancamentosEfetivos(lancamentos) {
  return lancamentos.filter((item) => (item.status ?? "ok") === "ok");
}
function somarLancamentos(lancamentos) {
  return arredondarDinheiro(
    lancamentosEfetivos(lancamentos).reduce((acc, item) => acc + item.valor, 0)
  );
}
function totaisPorMeio(lancamentos) {
  const totais = {
    dinheiro: 0,
    pix: 0,
    cartao: 0,
    outros: 0
  };
  for (const item of lancamentosEfetivos(lancamentos)) {
    if (item.meio === "DINHEIRO") {
      totais.dinheiro = arredondarDinheiro(totais.dinheiro + item.valor);
    } else if (item.meio === "PIX") {
      totais.pix = arredondarDinheiro(totais.pix + item.valor);
    } else if (item.meio === "CARTAO") {
      totais.cartao = arredondarDinheiro(totais.cartao + item.valor);
    } else {
      totais.outros = arredondarDinheiro(totais.outros + item.valor);
    }
  }
  return totais;
}
function meioPrincipal(lancamentos) {
  const meios = new Set(
    lancamentosEfetivos(lancamentos).map((item) => item.meio)
  );
  if (meios.size === 1) {
    return [...meios][0];
  }
  if (meios.size > 1) {
    return "MISTO";
  }
  return "DINHEIRO";
}
function totaisParaSync(lancamentos, troco) {
  let credito = 0;
  let debito = 0;
  for (const item of lancamentosEfetivos(lancamentos)) {
    if (item.meio !== "CARTAO") continue;
    const tPag = String(item.formapagamentonfe ?? "").replace(/\D/g, "").padStart(2, "0");
    if (tPag === "04") {
      debito = arredondarDinheiro(debito + item.valor);
    } else {
      credito = arredondarDinheiro(credito + item.valor);
    }
  }
  const totais = totaisPorMeio(lancamentos);
  return {
    valordinheiro: totais.dinheiro,
    valorpix: totais.pix,
    valorcartaocredito: credito,
    valorcartaodebito: debito,
    valorcartao: 0,
    valorprepago: totais.outros,
    valortroco: arredondarDinheiro(troco)
  };
}
function ehPagamentoAPrazo(params) {
  const meio = String(params.meio ?? "").trim().toUpperCase();
  if (meio === "DINHEIRO" || meio === "PIX" || meio === "CARTAO") {
    return false;
  }
  const tPag = String(params.formapagamentonfe ?? "").replace(/\D/g, "").padStart(2, "0");
  if (tPag === "01" || tPag === "17" || tPag === "03" || tPag === "04") {
    return false;
  }
  return Number(params.aprazo) === 1;
}
function pagamentosErpDosLancamentos(lancamentos) {
  return lancamentosEfetivos(lancamentos).filter(
    (item) => ehPagamentoAPrazo(item) && UUID_RE.test(item.idtipodocumentofinanceiro ?? "")
  ).map((item) => ({
    idtipodocumentofinanceiro: item.idtipodocumentofinanceiro,
    valor: item.valor
  }));
}
function pagamentosNativosParaApi(lancamentos) {
  return lancamentosEfetivos(lancamentos).filter(
    (item) => item.meio !== "OUTROS"
  );
}
function validarFechamentoPagamentos(params) {
  const total = arredondarDinheiro(params.total);
  if (total <= 0) {
    throw new Error("Total da venda inválido");
  }
  if (!params.lancamentos.length) {
    throw new Error("Informe ao menos um lançamento de pagamento");
  }
  if (params.lancamentos.some((item) => (item.status ?? "ok") === "pendente")) {
    throw new Error(
      "Há pagamento pendente; finalize ou cancele antes de fechar"
    );
  }
  const efetivos = lancamentosEfetivos(params.lancamentos);
  if (!efetivos.length) {
    throw new Error("Informe ao menos um lançamento de pagamento");
  }
  const soma = somarLancamentos(efetivos);
  if (soma < total) {
    throw new Error(
      `Pagamento insuficiente: ${soma.toFixed(2)} de ${total.toFixed(2)}`
    );
  }
  const totais = totaisPorMeio(efetivos);
  const trocoCalculado = arredondarDinheiro(Math.max(0, soma - total));
  const trocoInformado = params.troco != null ? arredondarDinheiro(params.troco) : null;
  const troco = trocoInformado != null && trocoInformado > 0 ? trocoInformado : trocoCalculado;
  if (troco > 0 && totais.dinheiro <= 0) {
    throw new Error("Troco só é permitido em dinheiro");
  }
  if (trocoInformado != null && trocoInformado > 0 && trocoCalculado === 0) {
    if (totais.dinheiro <= 0) {
      throw new Error("Troco só é permitido em dinheiro");
    }
  }
  return {
    efetivos,
    totais,
    troco,
    meio: meioPrincipal(efetivos),
    soma
  };
}
function textoOpcional(valor) {
  if (valor == null) {
    return null;
  }
  const texto = String(valor).trim();
  return texto.length ? texto : null;
}
function numero(valor) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? arredondarDinheiro(n) : 0;
}
function valoresVendaParaResumo(venda) {
  const lancDinheiro = numero(venda.lanc_dinheiro);
  const lancPix = numero(venda.lanc_pix);
  const lancCartao = numero(venda.lanc_cartao);
  if (lancDinheiro + lancPix + lancCartao > 0) {
    return {
      valortotal: numero(venda.valortotal),
      valordinheiro: lancDinheiro,
      valorpix: lancPix,
      valorcartao: lancCartao,
      valortroco: numero(venda.valortroco)
    };
  }
  return {
    valortotal: numero(venda.valortotal),
    valordinheiro: numero(venda.valordinheiro),
    valorpix: numero(venda.valorpix),
    valorcartao: numero(venda.valorcartao),
    valortroco: numero(venda.valortroco)
  };
}
function pagamentosVendaTurno(venda) {
  const origem = valoresVendaParaResumo(venda);
  const dinheiroBruto = origem.valordinheiro;
  const troco = origem.valortroco;
  const dinheiro = Math.max(0, arredondarDinheiro(dinheiroBruto - troco));
  const cartao = origem.valorcartao;
  const pix = origem.valorpix;
  const prepago = 0;
  const totalInformado = numero(venda.valortotal);
  const total = totalInformado > 0 ? totalInformado : arredondarDinheiro(dinheiro + cartao + pix + prepago);
  return { dinheiro, cartao, pix, prepago, total };
}
function montarResumoTurnoCaixa(params) {
  const pagamentos = {
    dinheiro: 0,
    cartao: 0,
    pix: 0,
    prepago: 0,
    total: 0
  };
  for (const venda of params.vendas) {
    const parcela = pagamentosVendaTurno(venda);
    pagamentos.dinheiro = arredondarDinheiro(
      pagamentos.dinheiro + parcela.dinheiro
    );
    pagamentos.cartao = arredondarDinheiro(pagamentos.cartao + parcela.cartao);
    pagamentos.pix = arredondarDinheiro(pagamentos.pix + parcela.pix);
    pagamentos.prepago = arredondarDinheiro(
      pagamentos.prepago + parcela.prepago
    );
    pagamentos.total = arredondarDinheiro(pagamentos.total + parcela.total);
  }
  const suprimento = numero(params.valorabertura);
  const saldoapurado = pagamentos.total;
  const saldoCaixaFisico = arredondarDinheiro(suprimento + pagamentos.dinheiro);
  return {
    qtdVendas: params.vendas.length,
    pagamentos,
    totalVendas: pagamentos.total,
    suprimento,
    saldoapurado,
    saldoCaixaFisico
  };
}
function calcularConferenciaCaixa(saldoinformado, saldoCaixaFisico) {
  const informado = numero(saldoinformado);
  const esperado = numero(saldoCaixaFisico);
  const diferenca = arredondarDinheiro(informado - esperado);
  return {
    saldoinformado: informado,
    diferenca,
    sobra: Math.max(0, diferenca),
    falta: Math.max(0, arredondarDinheiro(-diferenca))
  };
}
function normalizarModalidade(valor) {
  const v = String(valor ?? "").trim().toLowerCase();
  if (v === "delivery" || v === "retirada" || v === "mesa") {
    return v;
  }
  return "mesa";
}
function ehModalidadeEntrega(modalidade) {
  return modalidade === "delivery" || modalidade === "retirada";
}
function gerarSenhaChamada(seq) {
  const n = Math.max(1, Math.floor(Number(seq) || 1));
  return String(n).padStart(3, "0").slice(-4);
}
function parseBairrosEntrega(raw) {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const row = item;
      const bairro = String(row.bairro ?? "").trim();
      const taxa = arredondarMoeda(Number(row.taxa ?? 0));
      if (!bairro || !Number.isFinite(taxa) || taxa < 0) return null;
      return { bairro, taxa };
    }).filter((b) => b != null);
  } catch {
    return [];
  }
}
function resolverTaxaEntrega(params) {
  const padrao = arredondarMoeda(Math.max(0, Number(params.padrao) || 0));
  const bairro = String(params.bairro ?? "").trim().toLowerCase();
  if (!bairro || !params.tabelaBairros.length) {
    return padrao;
  }
  const hit = params.tabelaBairros.find(
    (b) => b.bairro.trim().toLowerCase() === bairro
  );
  return hit ? arredondarMoeda(hit.taxa) : padrao;
}
function podeFecharDelivery(params) {
  if (params.modalidade === "delivery") {
    const endereco = String(params.endereco ?? "").trim();
    if (!endereco) {
      return { ok: false, motivo: "Delivery exige endereço de entrega" };
    }
  }
  return { ok: true };
}
function proximoStatusEntrega(atual, modalidade) {
  const status2 = atual;
  if (modalidade === "retirada") {
    const ordem = ["recebido", "producao", "entregue"];
    const idx = ordem.indexOf(status2);
    if (idx < 0 || idx >= ordem.length - 1) return null;
    return ordem[idx + 1] ?? null;
  }
  if (modalidade === "delivery") {
    const ordem = [
      "recebido",
      "producao",
      "saiu",
      "entregue"
    ];
    const idx = ordem.indexOf(status2);
    if (idx < 0 || idx >= ordem.length - 1) return null;
    return ordem[idx + 1] ?? null;
  }
  return null;
}
function origemVendaPorModalidade(modalidade) {
  if (modalidade === "delivery") return "delivery";
  if (modalidade === "retirada") return "retirada";
  return "mesa";
}
function rotuloProducaoEntrega(params) {
  const senha = String(params.senhaChamada ?? "").trim();
  const protocolo = String(params.protocolo ?? "").trim();
  if (params.modalidade === "delivery") {
    if (senha) return `Delivery #${senha}`;
    if (protocolo) return `Delivery ${protocolo}`;
    return "Delivery";
  }
  if (params.modalidade === "retirada") {
    if (senha) return `Retirada #${senha}`;
    return "Retirada";
  }
  return "Mesa";
}
function dadosClienteVenda(cliente) {
  if (!cliente?.id) {
    return { idcliente: null, nomecliente: null, cnpjcpf: null };
  }
  const nome = cliente.nome.trim();
  return {
    idcliente: cliente.id,
    nomecliente: nome || null,
    cnpjcpf: cliente.cnpjcpf?.trim() || null
  };
}
async function obterSessao() {
  const row = await queryOne("SELECT * FROM sessao WHERE id = 1");
  if (!row) {
    throw new Error("Sessão local não inicializada");
  }
  return row;
}
async function salvarSessao(dados) {
  const atual = await obterSessao();
  const next = { ...atual, ...dados };
  await execute(
    `UPDATE sessao SET token = $1, userid = $2, username = $3, idempresa = $4, nomeempresa = $5, roles = $6, modulogourmet = $7, atualizadoem = $8 WHERE id = 1`,
    [
      next.token,
      next.userid,
      next.username,
      next.idempresa,
      next.nomeempresa,
      next.roles,
      next.modulogourmet,
      (/* @__PURE__ */ new Date()).toISOString()
    ]
  );
  return obterSessao();
}
async function limparSessao() {
  await salvarSessao({
    token: null,
    userid: null,
    username: null,
    idempresa: null,
    nomeempresa: null,
    roles: null,
    modulogourmet: null
  });
}
const PRODUTO_SELECT = "id, descricao, preco, unidademedida, idunidademedida, ean, codigo, idgrupo, idgrupogourmet, espizza, imagem, caminhoimagem";
function padraoIlike(termo) {
  return `%${termo.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}
function padraoIlikePrefixo(termo) {
  return `${termo.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}
async function upsertProdutos(produtos) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    for (const p of produtos) {
      await execute(
        `INSERT INTO produto_cache (id, descricao, preco, unidademedida, idunidademedida, ean, codigo, idgrupo, idgrupogourmet, espizza, imagem, caminhoimagem, inativo, atualizadoem)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13)
				 ON CONFLICT (id) DO UPDATE SET
					descricao = excluded.descricao,
					preco = excluded.preco,
					unidademedida = excluded.unidademedida,
					idunidademedida = excluded.idunidademedida,
					ean = excluded.ean,
					codigo = excluded.codigo,
					idgrupo = excluded.idgrupo,
					idgrupogourmet = excluded.idgrupogourmet,
					espizza = excluded.espizza,
					imagem = excluded.imagem,
					caminhoimagem = excluded.caminhoimagem,
					atualizadoem = excluded.atualizadoem`,
        [
          p.id,
          p.descricao,
          p.preco,
          p.unidademedida ?? null,
          p.idunidademedida ?? null,
          p.ean ?? null,
          p.codigo ?? null,
          p.idgrupo ?? null,
          p.idgrupogourmet ?? null,
          p.espizza ? 1 : 0,
          p.imagem ?? null,
          p.caminhoimagem ?? null,
          agora
        ],
        client
      );
    }
  });
}
async function upsertGrupos(grupos) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    for (const g of grupos) {
      await execute(
        `INSERT INTO grupo (id, nome, atualizadoem)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (id) DO UPDATE SET
					nome = excluded.nome,
					atualizadoem = excluded.atualizadoem`,
        [g.id, g.nome, agora],
        client
      );
    }
  });
}
async function listarGruposLocal() {
  return query(
    `SELECT DISTINCT g.id, g.nome
		 FROM grupo g
		 JOIN produto_cache p ON p.idgrupo = g.id AND p.inativo = 0
		 ORDER BY g.nome`
  );
}
async function upsertGruposGourmet(grupos) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    for (const g of grupos) {
      await execute(
        `INSERT INTO grupo_gourmet (id, nome, atualizadoem)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (id) DO UPDATE SET
					nome = excluded.nome,
					atualizadoem = excluded.atualizadoem`,
        [g.id, g.nome, agora],
        client
      );
    }
  });
}
async function listarGruposGourmetLocal() {
  return query(
    `SELECT DISTINCT g.id, g.nome
		 FROM grupo_gourmet g
		 JOIN produto_cache p ON p.idgrupogourmet = g.id AND p.inativo = 0
		 ORDER BY g.nome`
  );
}
async function upsertClientes(clientes) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    for (const item of clientes) {
      await execute(
        `INSERT INTO cliente (id, nome, razaosocial, cnpjcpf, telefone, email, inativo, atualizadoem)
				 VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
				 ON CONFLICT (id) DO UPDATE SET
					nome = excluded.nome,
					razaosocial = excluded.razaosocial,
					cnpjcpf = excluded.cnpjcpf,
					telefone = excluded.telefone,
					email = excluded.email,
					inativo = 0,
					atualizadoem = excluded.atualizadoem`,
        [
          item.id,
          item.nome,
          item.razaosocial ?? null,
          item.cnpjcpf ?? null,
          item.telefone ?? null,
          item.email ?? null,
          agora
        ],
        client
      );
    }
  });
}
async function buscarClientesLocal(termo = "", limit = 20) {
  const q = termo.trim();
  if (!q) {
    return query(
      `SELECT id, nome, razaosocial, cnpjcpf, telefone, email
			 FROM cliente WHERE inativo = 0
			 ORDER BY nome LIMIT $1`,
      [limit]
    );
  }
  const contem = padraoIlike(q);
  const prefixo = padraoIlikePrefixo(q);
  return query(
    `SELECT id, nome, razaosocial, cnpjcpf, telefone, email
		 FROM cliente
		 WHERE inativo = 0 AND (
			nome ILIKE $1 ESCAPE '\\'
			OR COALESCE(razaosocial, '') ILIKE $1 ESCAPE '\\'
			OR COALESCE(cnpjcpf, '') ILIKE $1 ESCAPE '\\'
			OR COALESCE(telefone, '') ILIKE $1 ESCAPE '\\'
		 )
		 ORDER BY
			CASE WHEN nome ILIKE $2 ESCAPE '\\' THEN 0 ELSE 1 END,
			nome
		 LIMIT $3`,
    [contem, prefixo, limit]
  );
}
async function upsertBandeirasCartao(bandeiras) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    for (const item of bandeiras) {
      await execute(
        `INSERT INTO bandeira_cartao (id, codigo, descricao, inativo, atualizadoem)
				 VALUES ($1, $2, $3, 0, $4)
				 ON CONFLICT (id) DO UPDATE SET
					codigo = excluded.codigo,
					descricao = excluded.descricao,
					inativo = 0,
					atualizadoem = excluded.atualizadoem`,
        [item.id, item.codigo ?? null, item.descricao, agora],
        client
      );
    }
  });
}
async function listarBandeirasCartaoLocal() {
  return query(
    `SELECT id, codigo, descricao
		 FROM bandeira_cartao WHERE inativo = 0
		 ORDER BY descricao`
  );
}
async function upsertMeiosPagamento(meios) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    for (const item of meios) {
      await execute(
        `INSERT INTO meio_pagamento (id, descricao, formapagamentonfe, aprazo, inativo, atualizadoem)
				 VALUES ($1, $2, $3, $4, 0, $5)
				 ON CONFLICT (id) DO UPDATE SET
					descricao = excluded.descricao,
					formapagamentonfe = excluded.formapagamentonfe,
					aprazo = excluded.aprazo,
					inativo = 0,
					atualizadoem = excluded.atualizadoem`,
        [
          item.id,
          item.descricao,
          item.formapagamentonfe ?? null,
          Number(item.aprazo) === 1 ? 1 : 0,
          agora
        ],
        client
      );
    }
  });
}
async function listarMeiosPagamentoLocal() {
  return query(
    `SELECT id, descricao, formapagamentonfe, aprazo
		 FROM meio_pagamento WHERE inativo = 0
		 ORDER BY descricao`
  );
}
async function listarProdutosPorGrupoGourmet(idgrupogourmet, termo = "", limit = 200) {
  const q = termo.trim();
  if (!idgrupogourmet) {
    if (!q) {
      return query(
        `SELECT ${PRODUTO_SELECT}
				 FROM produto_cache
				 WHERE inativo = 0 AND idgrupogourmet IS NOT NULL AND idgrupogourmet <> ''
				 ORDER BY descricao LIMIT $1`,
        [limit]
      );
    }
    return query(
      `SELECT ${PRODUTO_SELECT}
			 FROM produto_cache
			 WHERE inativo = 0 AND idgrupogourmet IS NOT NULL AND idgrupogourmet <> ''
				AND (descricao ILIKE $1 ESCAPE '\\' OR ean ILIKE $2 ESCAPE '\\')
			 ORDER BY descricao LIMIT $3`,
      [padraoIlike(q), padraoIlike(q), limit]
    );
  }
  if (!q) {
    return query(
      `SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0 AND idgrupogourmet = $1
			 ORDER BY descricao LIMIT $2`,
      [idgrupogourmet, limit]
    );
  }
  return query(
    `SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND idgrupogourmet = $1
		   AND (descricao ILIKE $2 ESCAPE '\\' OR ean ILIKE $3 ESCAPE '\\')
		 ORDER BY descricao LIMIT $4`,
    [idgrupogourmet, padraoIlike(q), padraoIlike(q), limit]
  );
}
async function listarPizzasLocal(excetoId = "", limit = 200) {
  if (!excetoId) {
    return query(
      `SELECT ${PRODUTO_SELECT}
			 FROM produto_cache
			 WHERE inativo = 0 AND espizza = 1
			 ORDER BY descricao LIMIT $1`,
      [limit]
    );
  }
  return query(
    `SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND espizza = 1 AND id <> $1
		 ORDER BY descricao LIMIT $2`,
    [excetoId, limit]
  );
}
async function listarMapeamentoImpressorasGourmet() {
  const rows = await query(
    `SELECT g.id AS idgrupogourmet, g.nome,
			COALESCE(i.destino, '') AS destino,
			COALESCE(i.impressora_nome, '') AS impressora_nome,
			COALESCE(i.host, '') AS host,
			COALESCE(i.porta, 9100) AS porta
		 FROM grupo_gourmet g
		 LEFT JOIN impressora_grupo_gourmet i ON i.idgrupogourmet = g.id
		 ORDER BY g.nome`
  );
  return rows.map((row) => ({
    ...row,
    destino: row.destino || (row.impressora_nome ? "sistema" : ""),
    impressora_nome: row.impressora_nome ?? "",
    host: row.host ?? "",
    porta: Number(row.porta) || 9100
  }));
}
async function salvarMapeamentoImpressorasGourmet(itens) {
  await withTransaction(async (client) => {
    await execute("DELETE FROM impressora_grupo_gourmet", [], client);
    for (const item of itens) {
      const destino = (item.destino ?? "").trim();
      if (destino !== "sistema" && destino !== "rede") {
        continue;
      }
      const nome = (item.impressora_nome ?? "").trim();
      const host = (item.host ?? "").trim();
      const porta = Number(item.porta) > 0 ? Number(item.porta) : 9100;
      if (destino === "sistema" && !nome) {
        continue;
      }
      if (destino === "rede" && !host) {
        continue;
      }
      await execute(
        `INSERT INTO impressora_grupo_gourmet (idgrupogourmet, impressora_nome, destino, host, porta)
				 VALUES ($1, $2, $3, $4, $5)`,
        [item.idgrupogourmet, nome, destino, host, porta],
        client
      );
    }
  });
}
async function obterDestinoGrupoGourmet(idgrupogourmet) {
  const row = await queryOne(
    `SELECT destino, impressora_nome, host, porta
		 FROM impressora_grupo_gourmet WHERE idgrupogourmet = $1`,
    [idgrupogourmet]
  );
  if (!row) {
    return null;
  }
  const destino = row.destino?.trim() || (row.impressora_nome ? "sistema" : "");
  if (destino === "rede") {
    const host = row.host?.trim();
    if (!host) {
      return null;
    }
    return {
      tipo: "rede",
      host,
      porta: Number(row.porta) || 9100
    };
  }
  if (destino === "sistema") {
    const nome = row.impressora_nome?.trim();
    if (!nome) {
      return null;
    }
    return { tipo: "sistema", nome };
  }
  return null;
}
async function buscarProdutosLocal(termo = "", limit = 50) {
  const q = termo.trim();
  if (!q) {
    return query(
      `SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0
			 ORDER BY descricao LIMIT $1`,
      [limit]
    );
  }
  const contem = padraoIlike(q);
  const prefixo = padraoIlikePrefixo(q);
  return query(
    `SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND (
			descricao ILIKE $1 ESCAPE '\\'
			OR ean ILIKE $1 ESCAPE '\\'
			OR id ILIKE $1 ESCAPE '\\'
			OR CAST(codigo AS TEXT) ILIKE $1 ESCAPE '\\'
		 )
		 ORDER BY
			CASE WHEN descricao ILIKE $2 ESCAPE '\\' THEN 0 ELSE 1 END,
			descricao
		 LIMIT $3`,
    [contem, prefixo, limit]
  );
}
async function listarProdutosPorGrupo(idgrupo, termo = "", limit = 200) {
  const q = termo.trim();
  if (!q) {
    return query(
      `SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0 AND idgrupo = $1
			 ORDER BY descricao LIMIT $2`,
      [idgrupo, limit]
    );
  }
  return query(
    `SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND idgrupo = $1
		   AND (descricao ILIKE $2 ESCAPE '\\' OR ean ILIKE $3 ESCAPE '\\')
		 ORDER BY descricao LIMIT $4`,
    [idgrupo, padraoIlike(q), padraoIlike(q), limit]
  );
}
async function buscarProdutoPorCodigo(codigo) {
  if (!Number.isInteger(codigo) || codigo < 1) {
    return null;
  }
  return await queryOne(
    `SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0 AND codigo = $1
			 LIMIT 1`,
    [codigo]
  ) ?? null;
}
async function buscarProdutoPorEan(ean) {
  const codigo = ean.trim();
  if (!codigo) {
    return null;
  }
  return await queryOne(
    `SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0 AND (ean = $1 OR id = $2)
			 LIMIT 1`,
    [codigo, codigo]
  ) ?? null;
}
async function buscarProdutoPorId(id) {
  if (!id) {
    return null;
  }
  return await queryOne(
    `SELECT ${PRODUTO_SELECT} FROM produto_cache WHERE id = $1 LIMIT 1`,
    [id]
  ) ?? null;
}
async function listarAtalhos() {
  return query(
    `SELECT p.id, p.descricao, p.preco, p.unidademedida, p.idunidademedida, p.ean, p.codigo, p.idgrupo, p.idgrupogourmet, p.espizza, p.imagem, p.caminhoimagem
		 FROM atalho a
		 JOIN produto_cache p ON p.id = a.idproduto
		 WHERE p.inativo = 0
		 ORDER BY a.ordem`
  );
}
async function listarCatalogoCarga() {
  const grupos = await query(
    "SELECT id, nome FROM grupo ORDER BY nome"
  );
  const gruposGourmet = await query(
    "SELECT id, nome FROM grupo_gourmet ORDER BY nome"
  );
  const produtos = await query(
    `SELECT ${PRODUTO_SELECT} FROM produto_cache WHERE inativo = 0 ORDER BY descricao`
  );
  const atalhos = await listarAtalhos();
  const clientes = await buscarClientesLocal("", 5e3);
  const bandeiras = await listarBandeirasCartaoLocal();
  const meiosPagamento = await listarMeiosPagamentoLocal();
  return {
    grupos,
    gruposGourmet,
    produtos,
    atalhos,
    clientes,
    bandeiras,
    meiosPagamento,
    atualizadoem: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function salvarAtalhos(ids) {
  await withTransaction(async (client) => {
    await execute("DELETE FROM atalho", [], client);
    for (let i = 0; i < ids.length; i++) {
      await execute(
        "INSERT INTO atalho (ordem, idproduto) VALUES ($1, $2)",
        [i + 1, ids[i]],
        client
      );
    }
  });
}
async function enfileirarOutbox(tipo, payload, client) {
  const id = uuid.v4();
  await execute(
    `INSERT INTO outbox (id, tipo, payload, status, tentativas, criadoem)
		 VALUES ($1, $2, $3, 'pendente', 0, $4)`,
    [id, tipo, JSON.stringify(payload), (/* @__PURE__ */ new Date()).toISOString()],
    client
  );
  return id;
}
async function listarOutboxPendentes(limit = 50) {
  return query(
    `SELECT id, tipo, payload, status, tentativas, ultimo_erro, criadoem
		 FROM outbox WHERE status = 'pendente'
		 ORDER BY criadoem ASC LIMIT $1`,
    [limit]
  );
}
async function marcarOutboxConcluido(id) {
  await execute(
    `UPDATE outbox SET status = 'concluido', processadoem = $1, ultimo_erro = NULL WHERE id = $2`,
    [(/* @__PURE__ */ new Date()).toISOString(), id]
  );
}
async function marcarOutboxErro(id, erro) {
  await execute(
    `UPDATE outbox SET tentativas = tentativas + 1, ultimo_erro = $1 WHERE id = $2`,
    [erro, id]
  );
}
async function contarOutboxPendentes() {
  const row = await queryOne(
    `SELECT COUNT(*)::int as total FROM outbox WHERE status = 'pendente'`
  );
  return row?.total ?? 0;
}
async function concluirOutboxCriarVendaLocal(idlocal) {
  for (const item of await listarOutboxPendentes(200)) {
    if (item.tipo !== "criar_venda") continue;
    try {
      const payload = JSON.parse(item.payload);
      if (payload.idlocal === idlocal) {
        await marcarOutboxConcluido(item.id);
      }
    } catch {
    }
  }
}
async function caixaAberto() {
  const sessao = await obterSessao();
  if (!sessao.userid) {
    return null;
  }
  const numeropdv = Number(await getConfig("numeropdv", "1"));
  return await queryOne(
    `SELECT id, numeropdv, abertoem, valorabertura, idusuario, username, idremoto
			 FROM caixa_turno
			 WHERE status = 'aberto' AND idusuario = $1 AND numeropdv = $2
			 ORDER BY abertoem DESC LIMIT 1`,
    [sessao.userid, numeropdv]
  ) ?? null;
}
async function caixaAbertoOutroOperador() {
  const sessao = await obterSessao();
  const numeropdv = Number(await getConfig("numeropdv", "1"));
  if (!sessao.userid) {
    return await queryOne(
      `SELECT username, abertoem FROM caixa_turno
				 WHERE status = 'aberto' AND numeropdv = $1
				 ORDER BY abertoem DESC LIMIT 1`,
      [numeropdv]
    ) ?? null;
  }
  return await queryOne(
    `SELECT username, abertoem FROM caixa_turno
			 WHERE status = 'aberto' AND numeropdv = $1
			   AND (idusuario IS NULL OR idusuario <> $2)
			 ORDER BY abertoem DESC LIMIT 1`,
    [numeropdv, sessao.userid]
  ) ?? null;
}
async function abrirCaixa(valorabertura) {
  const existente = await caixaAberto();
  if (existente) {
    return existente;
  }
  const sessao = await obterSessao();
  if (!sessao.idempresa || !sessao.userid) {
    throw new Error("Faça login antes de abrir o caixa");
  }
  const id = uuid.v4();
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  const numeropdv = Number(await getConfig("numeropdv", "1"));
  await execute(
    `INSERT INTO caixa_turno (
			id, idempresa, numeropdv, idusuario, username, abertoem, valorabertura, status, sync_status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'aberto', 'pendente')`,
    [
      id,
      sessao.idempresa,
      numeropdv,
      sessao.userid,
      sessao.username,
      agora,
      valorabertura
    ]
  );
  await enfileirarOutbox("abrir_caixa", {
    idlocal: id,
    idempresa: sessao.idempresa,
    idusuario: sessao.userid,
    numeropdv,
    valorabertura,
    abertoem: agora
  });
  return { id, abertoem: agora, valorabertura };
}
async function obterCaixaTurno(id) {
  return await queryOne(
    `SELECT id, idempresa, numeropdv, idusuario, username, abertoem, fechadoem,
		        valorabertura, valorfechamento, status, idremoto
		 FROM caixa_turno WHERE id = $1`,
    [id]
  ) ?? null;
}
async function atualizarCaixaIdRemoto(id, idremoto) {
  await execute(
    `UPDATE caixa_turno SET idremoto = $1, sync_status = 'sincronizado' WHERE id = $2`,
    [idremoto, id]
  );
}
async function calcularResumoTurno(caixa) {
  const vendas = await query(
    `SELECT
			v.valortotal,
			v.valordinheiro,
			v.valorpix,
			v.valorcartao,
			v.valortroco,
			COALESCE((
				SELECT SUM(p.valor) FROM pagamento p
				WHERE p.idvenda = v.id
					AND p.meio = 'DINHEIRO'
					AND COALESCE(p.status, 'ok') = 'ok'
			), 0) AS lanc_dinheiro,
			COALESCE((
				SELECT SUM(p.valor) FROM pagamento p
				WHERE p.idvenda = v.id
					AND p.meio = 'PIX'
					AND COALESCE(p.status, 'ok') = 'ok'
			), 0) AS lanc_pix,
			COALESCE((
				SELECT SUM(p.valor) FROM pagamento p
				WHERE p.idvenda = v.id
					AND p.meio = 'CARTAO'
					AND COALESCE(p.status, 'ok') = 'ok'
			), 0) AS lanc_cartao
		 FROM venda v
		 WHERE v.numeropdv = $1 AND v.criadoem >= $2 AND v.status = 'fechada'
		 ORDER BY v.criadoem`,
    [caixa.numeropdv, caixa.abertoem]
  );
  return montarResumoTurnoCaixa({
    valorabertura: caixa.valorabertura,
    vendas
  });
}
async function calcularResumoTurnoAberto() {
  const caixa = await caixaAberto();
  if (!caixa) {
    throw new Error("Nenhum caixa aberto para este operador");
  }
  return calcularResumoTurno(caixa);
}
async function fecharCaixa(params) {
  const caixa = await caixaAberto();
  if (!caixa) {
    throw new Error("Nenhum caixa aberto para este operador");
  }
  const resumo = await calcularResumoTurno(caixa);
  const conferencia = calcularConferenciaCaixa(
    params.saldoinformado,
    resumo.saldoCaixaFisico
  );
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  const observacao = params.observacao?.trim() || null;
  await execute(
    `UPDATE caixa_turno SET status = 'fechado', fechadoem = $1, valorfechamento = $2, sync_status = 'pendente' WHERE id = $3`,
    [agora, conferencia.saldoinformado, caixa.id]
  );
  const sessao = await obterSessao();
  await enfileirarOutbox("fechamento_caixa", {
    idlocal: caixa.id,
    idremoto: caixa.idremoto,
    idempresa: sessao.idempresa,
    idusuario: caixa.idusuario,
    numeropdv: caixa.numeropdv,
    valorabertura: caixa.valorabertura,
    abertoem: caixa.abertoem,
    fechadoem: agora,
    saldoinformado: conferencia.saldoinformado,
    saldoconferido: conferencia.saldoinformado,
    saldoapurado: resumo.saldoapurado,
    saldoCaixaFisico: resumo.saldoCaixaFisico,
    sobra: conferencia.sobra,
    falta: conferencia.falta,
    observacao,
    qtdVendas: resumo.qtdVendas,
    pagamentos: resumo.pagamentos,
    valorfechamento: conferencia.saldoinformado
  });
  return {
    numeropdv: caixa.numeropdv,
    username: caixa.username,
    abertoem: caixa.abertoem,
    fechadoem: agora,
    resumo,
    conferencia,
    observacao,
    nomeempresa: sessao.nomeempresa
  };
}
async function listarLancamentosVenda(idvenda, client) {
  const rows = await query(
    `SELECT id, meio, valor, nsu, autorizacao, bandeira, status,
		        descricao, formapagamentonfe, idtipodocumentofinanceiro, aprazo
		 FROM pagamento WHERE idvenda = $1 ORDER BY criadoem`,
    [idvenda],
    client
  );
  return rows.map((row) => ({
    id: row.id,
    meio: row.meio,
    valor: Number(row.valor),
    nsu: row.nsu,
    autorizacao: row.autorizacao,
    bandeira: row.bandeira,
    status: row.status ?? "ok",
    descricao: row.descricao,
    formapagamentonfe: row.formapagamentonfe,
    idtipodocumentofinanceiro: row.idtipodocumentofinanceiro,
    aprazo: Number(row.aprazo ?? 0) === 1 ? 1 : 0
  }));
}
async function gravarLancamentosVenda(client, idvenda, lancamentos, agora) {
  for (const lanc of lancamentos) {
    await execute(
      `INSERT INTO pagamento (
				id, idvenda, meio, valor, nsu, autorizacao, bandeira, status,
				descricao, formapagamentonfe, idtipodocumentofinanceiro, aprazo, criadoem
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        lanc.id ?? uuid.v4(),
        idvenda,
        lanc.meio,
        lanc.valor,
        lanc.nsu ?? null,
        lanc.autorizacao ?? null,
        lanc.bandeira ?? null,
        lanc.status ?? "ok",
        lanc.descricao ?? null,
        lanc.formapagamentonfe ?? null,
        lanc.idtipodocumentofinanceiro ?? null,
        lanc.aprazo === 1 ? 1 : 0,
        agora
      ],
      client
    );
  }
}
async function percentualTaxaConfig() {
  const n = Number(await getConfig("taxa_servico_percentual", "10"));
  return Number.isFinite(n) && n >= 0 ? n : 10;
}
async function couvertConfig() {
  const n = Number(await getConfig("couvert_valor", "0"));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
async function listarItensAbertos(idconta, client) {
  return query(
    `SELECT id, idproduto, descricao, quantidade, precounitario, precototal, observacao
		 FROM item_conta
		 WHERE idconta = $1 AND COALESCE(pago, 0) = 0
		 ORDER BY criadoem`,
    [idconta],
    client
  );
}
async function somarPagoConta(idconta, client) {
  const row = await queryOne(
    `SELECT COALESCE(SUM(valor), 0) as total
		 FROM conta_pagamento
		 WHERE idconta = $1 AND COALESCE(status, 'ok') = 'ok'`,
    [idconta],
    client
  );
  return arredondarMoeda(Number(row?.total ?? 0));
}
async function listarPagamentosConta(idconta, client) {
  const rows = await query(
    `SELECT id, meio, valor, nsu, autorizacao, bandeira, status
		 FROM conta_pagamento WHERE idconta = $1 ORDER BY criadoem`,
    [idconta],
    client
  );
  return rows.map((row) => ({
    id: row.id,
    meio: row.meio,
    valor: Number(row.valor),
    nsu: row.nsu,
    autorizacao: row.autorizacao,
    bandeira: row.bandeira,
    status: row.status ?? "ok"
  }));
}
async function persistirTotaisConta(idconta, totais, taxaAtiva, client) {
  await execute(
    `UPDATE conta_mesa SET
			valortotal = $1,
			numeropessoas = $2,
			valordesconto = $3,
			valortaxaservico = $4,
			valorcouvert = $5,
			taxa_ativa = $6,
			valorentrega = $7,
			sync_status = 'pendente'
		 WHERE id = $8`,
    [
      totais.valortotal,
      totais.numeropessoas,
      totais.valordesconto,
      totais.valortaxaservico,
      totais.valorcouvert,
      taxaAtiva ? 1 : 0,
      totais.valorentrega || 0,
      idconta
    ],
    client
  );
}
async function recalcularContaPersistida(idconta, client) {
  const conta = await queryOne(
    "SELECT * FROM conta_mesa WHERE id = $1",
    [idconta],
    client
  );
  if (!conta) {
    throw new Error("Conta inválida");
  }
  const itens = await listarItensAbertos(idconta, client);
  const modalidade = normalizarModalidade(conta.modalidade);
  const percentualTaxa = ehModalidadeEntrega(modalidade) ? 0 : await percentualTaxaConfig();
  const pessoas = ehModalidadeEntrega(modalidade) ? 1 : Number(conta.numeropessoas) || 1;
  const valorcouvert = ehModalidadeEntrega(modalidade) ? 0 : Number(conta.valorcouvert) || 0;
  const valorentrega = ehModalidadeEntrega(modalidade) ? arredondarMoeda(Number(conta.valorentrega) || 0) : 0;
  const totais = recalcularTotaisConta(itens, {
    numeropessoas: pessoas,
    taxaAtiva: ehModalidadeEntrega(modalidade) ? false : Number(conta.taxa_ativa) === 1,
    percentualTaxa,
    couvertUnitario: valorcouvert / Math.max(1, pessoas),
    desconto: Number(conta.valordesconto) || 0,
    valorentrega
  });
  await persistirTotaisConta(
    idconta,
    totais,
    ehModalidadeEntrega(modalidade) ? false : Number(conta.taxa_ativa) === 1,
    client
  );
  return totais;
}
function montarContaLocal(conta, itens, valorpago) {
  const subtotal = arredondarMoeda(
    itens.reduce((acc, i) => acc + Number(i.precototal), 0)
  );
  const valortotal = arredondarMoeda(Number(conta.valortotal) || 0);
  const modalidade = normalizarModalidade(conta.modalidade);
  return {
    id: conta.id,
    numero_mesa: conta.numero_mesa,
    status: conta.status,
    nomecliente: conta.nomecliente,
    abertoem: conta.abertoem,
    valortotal,
    numeropessoas: Number(conta.numeropessoas) || 1,
    subtotal,
    valordesconto: arredondarMoeda(Number(conta.valordesconto) || 0),
    valortaxaservico: arredondarMoeda(Number(conta.valortaxaservico) || 0),
    valorcouvert: arredondarMoeda(Number(conta.valorcouvert) || 0),
    valorentrega: arredondarMoeda(Number(conta.valorentrega) || 0),
    taxa_ativa: Number(conta.taxa_ativa) === 1 ? 1 : 0,
    valorpago,
    valorrestante: valorRestante(valortotal, valorpago),
    modalidade,
    telefone: conta.telefone ?? null,
    endereco: conta.endereco ?? null,
    bairro: conta.bairro ?? null,
    complemento: conta.complemento ?? null,
    referencia: conta.referencia ?? null,
    status_entrega: conta.status_entrega ?? null,
    senha_chamada: conta.senha_chamada ?? null,
    idcliente: conta.idcliente ?? null,
    orderidintegracao: conta.orderidintegracao ?? null,
    obs: conta.obs ?? null,
    itens
  };
}
async function criarVendaRapida(params) {
  const sessao = await obterSessao();
  if (!sessao.idempresa || !sessao.userid) {
    throw new Error("Sessão inválida");
  }
  if (!await caixaAberto()) {
    throw new Error("Abra o caixa antes de vender");
  }
  if (!params.itens.length) {
    throw new Error("Carrinho vazio");
  }
  const id = uuid.v4();
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  const subtotal = arredondarMoeda(
    params.itens.reduce((acc, i) => acc + i.precototal, 0)
  );
  const desconto = arredondarMoeda(
    Math.min(Math.max(0, Number(params.valordesconto) || 0), subtotal)
  );
  const total = arredondarMoeda(Math.max(0, subtotal - desconto));
  const fechamento = validarFechamentoPagamentos({
    total,
    lancamentos: params.lancamentos,
    troco: params.troco
  });
  const sync = totaisParaSync(fechamento.efetivos, fechamento.troco);
  const numeropdv = Number(await getConfig("numeropdv", "1"));
  const cliente = dadosClienteVenda(params.cliente);
  const venda = await withTransaction(async (client) => {
    await execute(
      `INSERT INTO venda (
				id, idempresa, numeropdv, origem, status, meio_pagamento,
				valortotal, valordinheiro, valorpix, valorcartao, valortroco,
				valordesconto,
				criadoem, sync_status, nfce_status, idcliente, nomecliente, cnpjcpf
			) VALUES ($1, $2, $3, 'rapida', 'fechada', $4, $5, $6, $7, $8, $9, $10, $11, 'pendente', 'pendente', $12, $13, $14)`,
      [
        id,
        sessao.idempresa,
        numeropdv,
        fechamento.meio,
        total,
        sync.valordinheiro,
        sync.valorpix,
        sync.valorcartaocredito,
        fechamento.troco,
        desconto,
        agora,
        cliente.idcliente,
        cliente.nomecliente,
        cliente.cnpjcpf
      ],
      client
    );
    for (const item of params.itens) {
      await execute(
        `INSERT INTO item_venda (id, idvenda, idproduto, descricao, quantidade, precounitario, precototal)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuid.v4(),
          id,
          item.idproduto,
          item.descricao,
          item.quantidade,
          item.precounitario,
          item.precototal
        ],
        client
      );
    }
    await gravarLancamentosVenda(client, id, fechamento.efetivos, agora);
    const row = await queryOne(
      "SELECT * FROM venda WHERE id = $1",
      [id],
      client
    );
    if (!row) {
      throw new Error("Falha ao gravar venda");
    }
    return row;
  });
  await enfileirarOutbox("criar_venda", {
    idlocal: id,
    meio: fechamento.meio,
    pagamentos: fechamento.efetivos,
    valordinheiro: sync.valordinheiro,
    valorpix: sync.valorpix,
    valorcartao: sync.valorcartaocredito,
    itens: params.itens,
    valortotal: total,
    valortroco: fechamento.troco,
    valordesconto: desconto,
    identidade: cliente.idcliente
  });
  return venda;
}
async function listarVendas(limit = 100) {
  return query(
    `SELECT v.*,
			c.numero_mesa AS numero_mesa,
			c.senha_chamada AS senha_chamada
		 FROM venda v
		 LEFT JOIN conta_mesa c ON c.id = v.idconta
		 ORDER BY v.criadoem DESC
		 LIMIT $1`,
    [limit]
  );
}
async function listarVendasComRemoto(limit = 40) {
  return query(
    `SELECT id, idremoto, nfce_status FROM venda
		 WHERE idremoto IS NOT NULL AND nfce_status <> 'nao_fiscal'
		 ORDER BY criadoem DESC LIMIT $1`,
    [limit]
  );
}
async function obterVenda(id) {
  const venda = await queryOne(
    "SELECT * FROM venda WHERE id = $1",
    [id]
  );
  if (!venda) {
    return null;
  }
  const itens = await query(
    `SELECT idproduto, descricao, quantidade, precounitario, precototal
		 FROM item_venda WHERE idvenda = $1`,
    [id]
  );
  const pagamentos = await listarLancamentosVenda(id);
  return { ...venda, itens, pagamentos };
}
async function atualizarVendaSync(idlocal, dados) {
  const atual = await obterVenda(idlocal);
  if (!atual) {
    return;
  }
  await execute(
    `UPDATE venda SET idremoto = COALESCE($1, idremoto), sync_status = COALESCE($2, sync_status),
		 nfce_status = COALESCE($3, nfce_status), idnfce_local = COALESCE($4, idnfce_local) WHERE id = $5`,
    [
      dados.idremoto ?? null,
      dados.sync_status ?? null,
      dados.nfce_status ?? null,
      dados.idnfce_local ?? null,
      idlocal
    ]
  );
}
async function limparContasVazias() {
  const vazias = await query(
    `SELECT c.id, c.numero_mesa
		 FROM conta_mesa c
		 WHERE c.status = 'aberta'
		   AND NOT EXISTS (
		     SELECT 1 FROM item_conta i
		     WHERE i.idconta = c.id AND COALESCE(i.pago, 0) = 0
		   )
		   AND NOT EXISTS (
		     SELECT 1 FROM conta_pagamento p
		     WHERE p.idconta = c.id AND COALESCE(p.status, 'ok') = 'ok'
		   )`
  );
  await withTransaction(async (client) => {
    for (const conta of vazias) {
      if (conta.numero_mesa > 0) {
        await execute(
          `UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL
					 WHERE numero = $1 AND (idconta = $2 OR idconta IS NULL)`,
          [conta.numero_mesa, conta.id],
          client
        );
      }
      await execute("DELETE FROM conta_mesa WHERE id = $1", [conta.id], client);
      const pendentes = await query(
        `SELECT id, payload FROM outbox WHERE status = 'pendente' AND tipo = 'conta_mesa'`,
        [],
        client
      );
      const agora = (/* @__PURE__ */ new Date()).toISOString();
      for (const o of pendentes) {
        try {
          const p = JSON.parse(o.payload);
          if (p.idlocal === conta.id || p.idconta === conta.id) {
            await execute(
              `UPDATE outbox SET status = 'cancelado', processadoem = $1 WHERE id = $2`,
              [agora, o.id],
              client
            );
          }
        } catch {
        }
      }
    }
    await execute(
      `UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL
			 WHERE status = 'ocupada'
			   AND (
			     idconta IS NULL
			     OR idconta NOT IN (SELECT id FROM conta_mesa WHERE status = 'aberta')
			   )`,
      [],
      client
    );
  });
  return vazias.length;
}
async function cancelarContaMesa(idconta) {
  const conta = await obterContaMesa(idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  if (conta.modalidade && conta.modalidade !== "mesa") {
    throw new Error("Cancelamento disponível apenas para mesa/comanda");
  }
  if (conta.valorpago > 0) {
    throw new Error(
      "Conta com pagamento parcial não pode ser cancelada. Finalize ou estorne os pagamentos."
    );
  }
  const rotulo = await getConfig("modelo_atendimento", "mesa") === "comanda" ? "Comanda" : "Mesa";
  const numero2 = conta.numero_mesa;
  if (numero2 <= 0) {
    throw new Error(`${rotulo} inválida para cancelamento`);
  }
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    await execute("DELETE FROM item_conta WHERE idconta = $1", [idconta], client);
    await execute(
      "DELETE FROM conta_pagamento WHERE idconta = $1",
      [idconta],
      client
    );
    await execute(
      `UPDATE pedido_fila SET status = 'entregue', entregueem = $1
			 WHERE idconta = $2 AND status = 'pendente'`,
      [agora, idconta],
      client
    );
    await execute(
      `UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL
			 WHERE numero = $1 AND (idconta = $2 OR idconta IS NULL)`,
      [numero2, idconta],
      client
    );
    await execute("DELETE FROM conta_mesa WHERE id = $1", [idconta], client);
    const pendentes = await query(
      `SELECT id, payload FROM outbox WHERE status = 'pendente' AND tipo = 'conta_mesa'`,
      [],
      client
    );
    for (const o of pendentes) {
      try {
        const p = JSON.parse(o.payload);
        if (p.idlocal === idconta || p.idconta === idconta) {
          await execute(
            `UPDATE outbox SET status = 'cancelado', processadoem = $1 WHERE id = $2`,
            [agora, o.id],
            client
          );
        }
      } catch {
      }
    }
  });
}
async function listarMesas() {
  await limparContasVazias();
  const limiarMin = Number(await getConfig("tempo_ociosidade_min", "15"));
  const limiarMs = (limiarMin === 30 ? 30 : 15) * 60 * 1e3;
  const agora = Date.now();
  const rows = await query(
    `SELECT m.numero, m.status, m.idconta, m.nomecliente,
			COALESCE(c.valortotal, 0) as valortotal,
			c.abertoem as abertoem,
			(
				SELECT MAX(i.criadoem) FROM item_conta i WHERE i.idconta = m.idconta
			) as ultimo_lancamento,
			(
				SELECT COUNT(*)::int FROM item_conta i
				WHERE i.idconta = m.idconta AND COALESCE(i.pago, 0) = 0
			) as qtd_itens
		 FROM mesa m
		 LEFT JOIN conta_mesa c ON c.id = m.idconta AND c.status = 'aberta'
		 ORDER BY m.numero`
  );
  return rows.map((row) => {
    const realmenteOcupada = row.status === "ocupada" && row.idconta && row.qtd_itens > 0;
    let statusAtividade = "livre";
    if (realmenteOcupada) {
      const referencia = row.ultimo_lancamento ?? row.abertoem;
      const refMs = referencia ? new Date(referencia).getTime() : Number.NaN;
      if (!Number.isFinite(refMs) || agora - refMs > limiarMs) {
        statusAtividade = "ociosa";
      } else {
        statusAtividade = "consumindo";
      }
    }
    return {
      numero: row.numero,
      status: realmenteOcupada ? "ocupada" : "livre",
      idconta: realmenteOcupada ? row.idconta : null,
      nomecliente: realmenteOcupada ? row.nomecliente : null,
      valortotal: realmenteOcupada ? row.valortotal : 0,
      abertoem: realmenteOcupada ? row.abertoem : null,
      ultimoLancamento: realmenteOcupada ? row.ultimo_lancamento : null,
      statusAtividade,
      qtdItens: realmenteOcupada ? row.qtd_itens : 0
    };
  });
}
async function listarNumerosComPendencia() {
  const rows = await query(
    `SELECT m.numero
		 FROM mesa m
		 INNER JOIN conta_mesa c ON c.id = m.idconta AND c.status = 'aberta'
		 WHERE m.status = 'ocupada'
		   AND EXISTS (
		     SELECT 1 FROM item_conta i
		     WHERE i.idconta = m.idconta AND COALESCE(i.pago, 0) = 0
		   )
		 ORDER BY m.numero`
  );
  return rows.map((row) => String(row.numero));
}
async function obterMesa(numero2) {
  const lista = await listarMesas();
  const mesa = lista.find((m) => m.numero === numero2);
  if (!mesa) {
    const rotulo = await getConfig("modelo_atendimento", "mesa") === "comanda" ? "Comanda" : "Mesa";
    throw new Error(`${rotulo} não encontrada`);
  }
  return {
    numero: mesa.numero,
    status: mesa.status,
    idconta: mesa.idconta,
    nomecliente: mesa.nomecliente,
    valortotal: mesa.valortotal,
    qtdItens: mesa.qtdItens
  };
}
async function obterContaPorNumero(numero2) {
  await limparContasVazias();
  const mesa = await queryOne(
    "SELECT status, idconta FROM mesa WHERE numero = $1",
    [numero2]
  );
  if (!mesa || mesa.status !== "ocupada" || !mesa.idconta) {
    return null;
  }
  const conta = await obterContaMesa(mesa.idconta);
  if (!conta || conta.status !== "aberta" || conta.itens.length === 0) {
    return null;
  }
  return conta;
}
async function abrirContaMesa(numero2, nomecliente) {
  const sessao = await obterSessao();
  if (!sessao.idempresa) {
    throw new Error("Empresa não selecionada");
  }
  const mesa = await queryOne(
    "SELECT * FROM mesa WHERE numero = $1",
    [numero2]
  );
  if (!mesa) {
    const rotulo = await getConfig("modelo_atendimento", "mesa") === "comanda" ? "Comanda" : "Mesa";
    throw new Error(`${rotulo} não encontrada`);
  }
  if (mesa.status === "ocupada" && mesa.idconta) {
    const existente = await obterContaMesa(mesa.idconta);
    if (existente && existente.itens.length > 0) {
      return existente;
    }
    await limparContasVazias();
  }
  const id = uuid.v4();
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    await execute(
      `INSERT INTO conta_mesa (
				id, numero_mesa, idempresa, status, nomecliente, abertoem, valortotal,
				numeropessoas, valordesconto, valortaxaservico, valorcouvert, taxa_ativa,
				modalidade, valorentrega, sync_status
			) VALUES ($1, $2, $3, 'aberta', $4, $5, 0, 1, 0, 0, 0, 0, 'mesa', 0, 'pendente')`,
      [id, numero2, sessao.idempresa, nomecliente ?? null, agora],
      client
    );
    await execute(
      `UPDATE mesa SET status = 'ocupada', idconta = $1, nomecliente = $2 WHERE numero = $3`,
      [id, nomecliente ?? null, numero2],
      client
    );
  });
  await enfileirarOutbox("conta_mesa", {
    acao: "abrir",
    idlocal: id,
    numero: numero2,
    nomecliente: nomecliente ?? null
  });
  const criada = await obterContaMesa(id);
  if (!criada) {
    throw new Error("Falha ao abrir conta");
  }
  return criada;
}
async function obterContaMesa(id) {
  const conta = await queryOne(
    "SELECT * FROM conta_mesa WHERE id = $1",
    [id]
  );
  if (!conta) {
    return null;
  }
  const itens = await listarItensAbertos(id);
  const valorpago = await somarPagoConta(id);
  return montarContaLocal(conta, itens, valorpago);
}
async function adicionarItemConta(idconta, item) {
  const conta = await obterContaMesa(idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  const id = uuid.v4();
  const precototal = item.quantidade * item.precounitario;
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  const observacao = item.observacao?.trim() || null;
  await withTransaction(async (client) => {
    await execute(
      `INSERT INTO item_conta (id, idconta, idproduto, descricao, quantidade, precounitario, precototal, observacao, criadoem)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        idconta,
        item.idproduto,
        item.descricao,
        item.quantidade,
        item.precounitario,
        precototal,
        observacao,
        agora
      ],
      client
    );
    await execute(
      `UPDATE conta_mesa SET sync_status = 'pendente' WHERE id = $1`,
      [idconta],
      client
    );
    await recalcularContaPersistida(idconta, client);
  });
  await enfileirarOutbox("conta_mesa", {
    acao: "item",
    idconta,
    item: { ...item, precototal }
  });
  const atualizada = await obterContaMesa(idconta);
  if (!atualizada) {
    throw new Error("Falha ao atualizar conta");
  }
  return atualizada;
}
async function cancelarItemConta(idconta, iditem, senha) {
  const conta = await obterContaMesa(idconta);
  const item = await queryOne(
    `SELECT id, idconta, descricao, quantidade, COALESCE(pago, 0)::int as pago
		 FROM item_conta WHERE id = $1`,
    [iditem]
  );
  const erroInicial = mensagemErroCancelarItem({
    contaValida: Boolean(conta && conta.status === "aberta"),
    itemEncontrado: Boolean(item && item.idconta === idconta),
    itemPago: Number(item?.pago) === 1
  });
  if (erroInicial) {
    throw new Error(erroInicial);
  }
  if (await senhaGerencialDefinida()) {
    await exigirSenhaGerencial(senha);
  }
  await withTransaction(async (client) => {
    await execute(
      `DELETE FROM item_conta
			 WHERE id = $1 AND idconta = $2 AND COALESCE(pago, 0) = 0`,
      [iditem, idconta],
      client
    );
    const totais = await recalcularContaPersistida(idconta, client);
    const valorpago = await somarPagoConta(idconta, client);
    const erroTotal = mensagemErroCancelarItem({
      contaValida: true,
      itemEncontrado: true,
      itemPago: false,
      valorPago: valorpago,
      totalAposCancelar: totais.valortotal
    });
    if (erroTotal) {
      throw new Error(erroTotal);
    }
  });
  await enfileirarOutbox("conta_mesa", {
    acao: "cancelar_item",
    idconta,
    iditem
  });
  const atualizada = await obterContaMesa(idconta);
  if (!atualizada) {
    throw new Error("Falha ao cancelar item");
  }
  return atualizada;
}
async function adicionarItemNaMesa(numero2, item, nomecliente) {
  const existente = await obterContaPorNumero(numero2);
  if (existente) {
    return adicionarItemConta(existente.id, item);
  }
  const conta = await abrirContaMesa(numero2, nomecliente);
  return adicionarItemConta(conta.id, item);
}
async function atualizarNomeClienteConta(idconta, nomecliente) {
  const conta = await obterContaMesa(idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  const nome = nomecliente.trim() || "Cliente";
  await execute(
    "UPDATE conta_mesa SET nomecliente = $1, sync_status = 'pendente' WHERE id = $2",
    [nome, idconta]
  );
  await execute("UPDATE mesa SET nomecliente = $1 WHERE idconta = $2", [
    nome,
    idconta
  ]);
  const atualizada = await obterContaMesa(idconta);
  if (!atualizada) {
    throw new Error("Falha ao atualizar nome");
  }
  return atualizada;
}
async function enviarPedidoConta(params) {
  const clientOrderId = params.clientOrderId.trim();
  if (!clientOrderId) {
    throw new Error("Pedido sem identificador");
  }
  if (!params.itens.length) {
    throw new Error("Pedido sem itens");
  }
  const existente = await queryOne(
    "SELECT id FROM pedido_fila WHERE client_order_id = $1 LIMIT 1",
    [clientOrderId]
  );
  if (existente) {
    const conta2 = await obterContaMesa(params.idconta);
    if (!conta2) {
      throw new Error("Conta inválida");
    }
    return { ...conta2, pedidoNovo: false, itensProducao: [] };
  }
  const conta = await obterContaMesa(params.idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  const itensProducao = [];
  for (const linha of params.itens) {
    const produto = await buscarProdutoPorId(linha.idproduto);
    if (!produto) {
      throw new Error("Produto não encontrado no catálogo local");
    }
    const qtd = Number(linha.quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      throw new Error("Quantidade inválida");
    }
    let idproduto = produto.id;
    let descricao = produto.descricao;
    let precounitario = produto.preco;
    let quantidade = qtd;
    const idMeio = linha.idprodutomeio?.trim();
    if (idMeio) {
      const segundo = await buscarProdutoPorId(idMeio);
      if (!segundo) {
        throw new Error("Segundo sabor não encontrado no catálogo local");
      }
      if (!produtoEhPizza(produto) || !produtoEhPizza(segundo)) {
        throw new Error("Meio a meio só é permitido entre produtos pizza");
      }
      if (produto.id === segundo.id) {
        throw new Error("Escolha dois sabores diferentes");
      }
      const montado = montarItemPizzaMeioAMeio(produto, segundo);
      idproduto = montado.idproduto;
      descricao = montado.descricao;
      precounitario = montado.precounitario;
      quantidade = 1;
    }
    await adicionarItemConta(params.idconta, {
      idproduto,
      descricao,
      quantidade,
      precounitario,
      observacao: linha.observacao
    });
    const agora = (/* @__PURE__ */ new Date()).toISOString();
    await execute(
      `INSERT INTO pedido_fila (
				id, client_order_id, idconta, numero_mesa, nomecliente,
				idproduto, descricao, quantidade, observacao, status, criadoem
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendente', $10)`,
      [
        uuid.v4(),
        clientOrderId,
        conta.id,
        conta.numero_mesa,
        conta.nomecliente,
        idproduto,
        descricao,
        quantidade,
        linha.observacao?.trim() || null,
        agora
      ]
    );
    itensProducao.push({
      idproduto,
      descricao,
      quantidade,
      observacao: linha.observacao
    });
  }
  const atualizada = await obterContaMesa(params.idconta);
  if (!atualizada) {
    throw new Error("Falha ao enviar pedido");
  }
  return { ...atualizada, pedidoNovo: true, itensProducao };
}
async function listarPedidosFila(pendentes) {
  const inicioDia = /* @__PURE__ */ new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const since = inicioDia.toISOString();
  if (pendentes) {
    return query(
      `SELECT id, client_order_id, idconta, numero_mesa, nomecliente, idproduto,
				descricao, quantidade, observacao, status, criadoem, entregueem
			 FROM pedido_fila
			 WHERE criadoem >= $1 AND status = 'pendente'
			 ORDER BY criadoem`,
      [since]
    );
  }
  return query(
    `SELECT id, client_order_id, idconta, numero_mesa, nomecliente, idproduto,
			descricao, quantidade, observacao, status, criadoem, entregueem
		 FROM pedido_fila
		 WHERE criadoem >= $1
		 ORDER BY criadoem`,
    [since]
  );
}
async function marcarPedidoEntregue(id) {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await execute(
    `UPDATE pedido_fila SET status = 'entregue', entregueem = $1
		 WHERE id = $2 AND status = 'pendente'`,
    [agora, id]
  );
}
async function limparFilaPedidos() {
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await execute(
    `UPDATE pedido_fila SET status = 'entregue', entregueem = $1
		 WHERE status = 'pendente'`,
    [agora]
  );
}
async function fecharContaMesa(params) {
  await recalcularContaPersistida(params.idconta);
  const conta = await obterContaMesa(params.idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  if (!conta.itens.length) {
    throw new Error("Conta sem itens");
  }
  const pode = podeFecharDelivery({
    modalidade: conta.modalidade,
    endereco: conta.endereco
  });
  if (!pode.ok) {
    throw new Error(pode.motivo);
  }
  if (!await caixaAberto()) {
    throw new Error("Abra o caixa antes de receber");
  }
  const jaPagos = await listarPagamentosConta(conta.id);
  const restante = validarFechamentoPagamentos({
    total: conta.valorrestante,
    lancamentos: params.lancamentos,
    troco: params.troco
  });
  return gravarVendaMesa({
    conta,
    itens: conta.itens,
    lancamentos: [...jaPagos, ...restante.efetivos],
    troco: restante.troco,
    total: conta.valortotal,
    valordesconto: conta.valordesconto,
    valortaxaservico: conta.valortaxaservico,
    valorcouvert: conta.valorcouvert,
    valorentrega: conta.valorentrega,
    fecharConta: true,
    marcarItensIds: conta.itens.map((i) => i.id),
    cliente: params.cliente
  });
}
async function gravarVendaMesa(params) {
  const sessao = await obterSessao();
  if (!sessao.idempresa) {
    throw new Error("Empresa não selecionada");
  }
  if (!await caixaAberto()) {
    throw new Error("Abra o caixa antes de receber");
  }
  const idVenda = uuid.v4();
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  const numeropdv = Number(await getConfig("numeropdv", "1"));
  const fechamento = validarFechamentoPagamentos({
    total: params.total,
    lancamentos: params.lancamentos,
    troco: params.troco
  });
  const sync = totaisParaSync(fechamento.efetivos, fechamento.troco);
  const cliente = dadosClienteVenda(params.cliente);
  const nomecliente = cliente.nomecliente ?? params.conta.nomecliente ?? null;
  const origem = origemVendaPorModalidade(params.conta.modalidade);
  const valorentrega = arredondarMoeda(
    params.valorentrega ?? params.conta.valorentrega ?? 0
  );
  const venda = await withTransaction(async (client) => {
    await execute(
      `INSERT INTO venda (
				id, idempresa, numeropdv, origem, idconta, status, meio_pagamento,
				valortotal, valordinheiro, valorpix, valorcartao, valortroco,
				valordesconto, valortaxaservico, valorcouvert, valorentrega,
				criadoem, sync_status, nfce_status, idcliente, nomecliente, cnpjcpf
			) VALUES ($1, $2, $3, $4, $5, 'fechada', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pendente', 'pendente', $17, $18, $19)`,
      [
        idVenda,
        sessao.idempresa,
        numeropdv,
        origem,
        params.conta.id,
        fechamento.meio,
        params.total,
        sync.valordinheiro,
        sync.valorpix,
        sync.valorcartaocredito,
        fechamento.troco,
        params.valordesconto,
        params.valortaxaservico,
        params.valorcouvert,
        valorentrega,
        agora,
        cliente.idcliente,
        nomecliente,
        cliente.cnpjcpf
      ],
      client
    );
    for (const item of params.itens) {
      await execute(
        `INSERT INTO item_venda (id, idvenda, idproduto, descricao, quantidade, precounitario, precototal)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuid.v4(),
          idVenda,
          item.idproduto,
          item.descricao,
          item.quantidade,
          item.precounitario,
          item.precototal
        ],
        client
      );
    }
    await gravarLancamentosVenda(client, idVenda, fechamento.efetivos, agora);
    if (params.marcarItensIds.length) {
      await execute(
        `UPDATE item_conta SET pago = 1 WHERE id = ANY($1::text[])`,
        [params.marcarItensIds],
        client
      );
    }
    if (params.fecharConta) {
      await execute(
        `DELETE FROM conta_pagamento WHERE idconta = $1`,
        [params.conta.id],
        client
      );
      await execute(
        `UPDATE conta_mesa SET status = 'fechada', fechadoem = $1, sync_status = 'pendente' WHERE id = $2`,
        [agora, params.conta.id],
        client
      );
      if (params.conta.numero_mesa > 0) {
        await execute(
          `UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
          [params.conta.numero_mesa],
          client
        );
      }
    }
    const row = await queryOne(
      "SELECT * FROM venda WHERE id = $1",
      [idVenda],
      client
    );
    if (!row) {
      throw new Error("Falha ao gravar venda da conta");
    }
    return row;
  });
  await enfileirarOutbox("criar_venda", {
    idlocal: idVenda,
    meio: fechamento.meio,
    pagamentos: fechamento.efetivos,
    valordinheiro: sync.valordinheiro,
    valorpix: sync.valorpix,
    valorcartao: sync.valorcartaocredito,
    itens: params.itens.map((i) => ({
      idproduto: i.idproduto,
      descricao: i.descricao,
      quantidade: i.quantidade,
      precounitario: i.precounitario,
      precototal: i.precototal
    })),
    valortotal: params.total,
    valortroco: fechamento.troco,
    valordesconto: params.valordesconto,
    valortaxaservico: params.valortaxaservico,
    valorcouvert: params.valorcouvert,
    valorentrega,
    origem,
    idconta_local: params.conta.id,
    numero_mesa: params.conta.numero_mesa,
    identidade: cliente.idcliente
  });
  return venda;
}
async function aplicarAjustesConta(params) {
  const conta = await obterContaMesa(params.idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  let desconto = conta.valordesconto;
  if (params.desconto !== void 0) {
    const novo = arredondarMoeda(Math.max(0, Number(params.desconto) || 0));
    if (Math.abs(novo - conta.valordesconto) > 9e-3) {
      await exigirSenhaGerencial(params.senha);
      desconto = novo;
    }
  }
  const numeropessoas = params.numeropessoas !== void 0 ? Math.max(1, Math.floor(Number(params.numeropessoas) || 1)) : conta.numeropessoas;
  const taxaAtiva = params.taxaAtiva !== void 0 ? Boolean(params.taxaAtiva) : conta.taxa_ativa === 1;
  const pessoasMudou = params.numeropessoas !== void 0 && numeropessoas !== conta.numeropessoas;
  const valorcouvert = pessoasMudou ? arredondarMoeda(numeropessoas * await couvertConfig()) : conta.valorcouvert;
  await execute(
    `UPDATE conta_mesa SET
			numeropessoas = $1,
			valordesconto = $2,
			valorcouvert = $3,
			taxa_ativa = $4,
			sync_status = 'pendente'
		 WHERE id = $5`,
    [numeropessoas, desconto, valorcouvert, taxaAtiva ? 1 : 0, params.idconta]
  );
  await recalcularContaPersistida(params.idconta);
  const atualizada = await obterContaMesa(params.idconta);
  if (!atualizada) {
    throw new Error("Falha ao atualizar a conta");
  }
  return atualizada;
}
async function exigirSenhaGerencial(senha) {
  const hash = await getConfig("senha_gerencial_hash", "");
  const salt = await getConfig("senha_gerencial_salt", "");
  if (!hash || !salt) {
    throw new Error("Defina a senha gerencial nas configurações do PDV");
  }
  const { senhaGerencialConfere } = await Promise.resolve().then(() => require("./chunks/senha-gerencial-d9aLeKH9.js"));
  if (!senha || !senhaGerencialConfere(senha, salt, hash)) {
    throw new Error("Senha gerencial inválida");
  }
}
async function validarSenhaGerencial(senha) {
  try {
    await exigirSenhaGerencial(senha);
    return true;
  } catch {
    return false;
  }
}
async function senhaGerencialDefinida() {
  const hash = await getConfig("senha_gerencial_hash", "");
  return Boolean(hash);
}
async function registrarPagamentoConta(params) {
  await recalcularContaPersistida(params.idconta);
  const conta = await obterContaMesa(params.idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  if (!conta.itens.length) {
    throw new Error("Conta sem itens");
  }
  if (!await caixaAberto()) {
    throw new Error("Abra o caixa antes de receber");
  }
  const restante = validarFechamentoPagamentos({
    total: conta.valorrestante,
    lancamentos: params.lancamentos,
    troco: params.troco
  });
  if (conta.valorrestante - restante.soma <= 9e-3) {
    const venda = await fecharContaMesa({
      idconta: params.idconta,
      lancamentos: params.lancamentos,
      troco: restante.troco
    });
    return { conta: await obterContaMesa(params.idconta) ?? conta, venda };
  }
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await withTransaction(async (client) => {
    for (const lanc of restante.efetivos) {
      await execute(
        `INSERT INTO conta_pagamento (
					id, idconta, meio, valor, nsu, autorizacao, bandeira, status, criadoem
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          lanc.id ?? uuid.v4(),
          params.idconta,
          lanc.meio,
          lanc.valor,
          lanc.nsu ?? null,
          lanc.autorizacao ?? null,
          lanc.bandeira ?? null,
          lanc.status ?? "ok",
          agora
        ],
        client
      );
    }
  });
  const atualizada = await obterContaMesa(params.idconta);
  if (!atualizada) {
    throw new Error("Falha ao registrar pagamento");
  }
  return { conta: atualizada, venda: null };
}
async function fecharFatiaItens(params) {
  await recalcularContaPersistida(params.idconta);
  const conta = await obterContaMesa(params.idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  const ids = new Set(params.idsItens);
  const itensFatia = conta.itens.filter((i) => ids.has(i.id));
  if (!itensFatia.length) {
    throw new Error("Selecione os itens desta fatia");
  }
  if (itensFatia.length !== ids.size) {
    throw new Error("Há item inválido na fatia");
  }
  const totaisConta = {
    subtotal: conta.subtotal,
    valordesconto: conta.valordesconto,
    valortaxaservico: conta.valortaxaservico,
    valorcouvert: conta.valorcouvert,
    valorentrega: conta.valorentrega,
    valortotal: conta.valortotal,
    numeropessoas: conta.numeropessoas
  };
  const { partirPorItens: partirPorItens2 } = await Promise.resolve().then(() => contaGourmet);
  const restoIds = conta.itens.filter((i) => !ids.has(i.id)).map((i) => i.id);
  const grupos = restoIds.length ? [params.idsItens, restoIds] : [params.idsItens];
  const fatias = partirPorItens2(
    conta.itens.map((i) => ({ id: i.id, precototal: i.precototal })),
    grupos,
    totaisConta
  );
  const fatia = fatias[0];
  if (!fatia) {
    throw new Error("Não foi possível calcular a fatia");
  }
  const venda = await gravarVendaMesa({
    conta,
    itens: itensFatia,
    lancamentos: params.lancamentos,
    troco: params.troco,
    total: fatia.total,
    valordesconto: fatia.desconto,
    valortaxaservico: fatia.taxa,
    valorcouvert: fatia.couvert,
    valorentrega: fatia.entrega,
    fecharConta: restoIds.length === 0,
    marcarItensIds: params.idsItens,
    cliente: params.cliente
  });
  if (restoIds.length === 0) {
    return { conta: null, venda };
  }
  const descontoRestante = arredondarMoeda(
    conta.valordesconto - fatia.desconto
  );
  const couvertRestante = arredondarMoeda(conta.valorcouvert - fatia.couvert);
  const entregaRestante = arredondarMoeda(conta.valorentrega - fatia.entrega);
  await execute(
    `UPDATE conta_mesa SET valordesconto = $1, valorcouvert = $2, valorentrega = $3, sync_status = 'pendente' WHERE id = $4`,
    [
      Math.max(0, descontoRestante),
      Math.max(0, couvertRestante),
      Math.max(0, entregaRestante),
      conta.id
    ]
  );
  await recalcularContaPersistida(conta.id);
  return { conta: await obterContaMesa(conta.id), venda };
}
async function transferirConta(idconta, numeroDestino) {
  const conta = await obterContaMesa(idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  if (conta.numero_mesa === numeroDestino) {
    return conta;
  }
  const destino = await queryOne("SELECT status, idconta FROM mesa WHERE numero = $1", [numeroDestino]);
  if (!destino) {
    throw new Error("Mesa de destino não encontrada");
  }
  if (destino.status === "ocupada" && destino.idconta) {
    const destConta = await obterContaMesa(destino.idconta);
    if (destConta && destConta.itens.length > 0) {
      throw new Error("Destino já tem conta aberta. Use juntar mesas.");
    }
  }
  const origemNumero = conta.numero_mesa;
  await withTransaction(async (client) => {
    await execute(
      "UPDATE conta_mesa SET numero_mesa = $1, sync_status = 'pendente' WHERE id = $2",
      [numeroDestino, idconta],
      client
    );
    await execute(
      `UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
      [origemNumero],
      client
    );
    await execute(
      `UPDATE mesa SET status = 'ocupada', idconta = $1, nomecliente = $2 WHERE numero = $3`,
      [idconta, conta.nomecliente, numeroDestino],
      client
    );
    await execute(
      "UPDATE pedido_fila SET numero_mesa = $1 WHERE idconta = $2",
      [numeroDestino, idconta],
      client
    );
  });
  const atualizada = await obterContaMesa(idconta);
  if (!atualizada) {
    throw new Error("Falha ao transferir a conta");
  }
  return atualizada;
}
async function transferirItens(params) {
  const origem = await obterContaMesa(params.idcontaOrigem);
  if (!origem || origem.status !== "aberta") {
    throw new Error("Conta de origem inválida");
  }
  const ids = new Set(params.idsItens);
  const mover = origem.itens.filter((i) => ids.has(i.id));
  if (!mover.length) {
    throw new Error("Selecione os itens para transferir");
  }
  let destino = await obterContaPorNumero(params.numeroDestino);
  if (!destino) {
    destino = await abrirContaMesa(
      params.numeroDestino,
      origem.nomecliente ?? void 0
    );
  }
  await withTransaction(async (client) => {
    await execute(
      `UPDATE item_conta SET idconta = $1 WHERE id = ANY($2::text[])`,
      [destino.id, mover.map((i) => i.id)],
      client
    );
    await recalcularContaPersistida(origem.id, client);
    await recalcularContaPersistida(destino.id, client);
  });
  const origemAtual = await obterContaMesa(origem.id);
  if (origemAtual && origemAtual.itens.length === 0 && origemAtual.valorpago <= 0) {
    await execute(
      `UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
      [origem.numero_mesa]
    );
    await execute(
      `UPDATE conta_mesa SET status = 'fechada', fechadoem = $1 WHERE id = $2`,
      [(/* @__PURE__ */ new Date()).toISOString(), origem.id]
    );
    return {
      origem: null,
      destino: await obterContaMesa(destino.id)
    };
  }
  const destAtual = await obterContaMesa(destino.id);
  if (!destAtual) {
    throw new Error("Falha ao transferir itens");
  }
  return { origem: origemAtual, destino: destAtual };
}
async function juntarContas(idOrigem, idDestino) {
  if (idOrigem === idDestino) {
    throw new Error("Escolha duas contas diferentes");
  }
  const origem = await obterContaMesa(idOrigem);
  const destino = await obterContaMesa(idDestino);
  if (!origem || origem.status !== "aberta") {
    throw new Error("Conta de origem inválida");
  }
  if (!destino || destino.status !== "aberta") {
    throw new Error("Conta de destino inválida");
  }
  await withTransaction(async (client) => {
    await execute(
      "UPDATE item_conta SET idconta = $1 WHERE idconta = $2 AND COALESCE(pago, 0) = 0",
      [idDestino, idOrigem],
      client
    );
    await execute(
      "UPDATE pedido_fila SET idconta = $1, numero_mesa = $2 WHERE idconta = $3",
      [idDestino, destino.numero_mesa, idOrigem],
      client
    );
    await execute(
      `UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
      [origem.numero_mesa],
      client
    );
    await execute(
      `UPDATE conta_mesa SET status = 'fechada', fechadoem = $1 WHERE id = $2`,
      [(/* @__PURE__ */ new Date()).toISOString(), idOrigem],
      client
    );
    await recalcularContaPersistida(idDestino, client);
  });
  const atualizada = await obterContaMesa(idDestino);
  if (!atualizada) {
    throw new Error("Falha ao juntar as contas");
  }
  return atualizada;
}
async function salvarConfiguracoes(dados) {
  for (const [chave, valor] of Object.entries(dados)) {
    await setConfig(chave, valor);
  }
  if (dados.qtd_mesas) {
    await garantirMesas(Number(dados.qtd_mesas));
  }
  const result = {};
  for (const k of Object.keys(dados)) {
    result[k] = await getConfig(k);
  }
  return result;
}
async function obterNumeracaoNfce() {
  const row = await queryOne("SELECT * FROM numeracao_nfce WHERE id = 1");
  if (!row) {
    throw new Error("Numeração NFC-e não inicializada");
  }
  return row;
}
async function atualizarNumeracaoNfce(dados) {
  const atual = await obterNumeracaoNfce();
  await execute(
    `UPDATE numeracao_nfce SET
			serie = $1, proximo_numero = $2, csc_id = $3, csc_token = $4,
			cnpj = $5, uf = $6, ambiente = $7, atualizadoem = $8
		 WHERE id = 1`,
    [
      dados.serie ?? atual.serie,
      dados.proximo_numero ?? atual.proximo_numero,
      dados.csc_id ?? atual.csc_id,
      dados.csc_token ?? atual.csc_token,
      dados.cnpj ?? atual.cnpj,
      dados.uf ?? atual.uf,
      dados.ambiente ?? atual.ambiente,
      (/* @__PURE__ */ new Date()).toISOString()
    ]
  );
}
async function reservarNumeroNfce() {
  const atual = await obterNumeracaoNfce();
  const numero2 = atual.proximo_numero;
  await atualizarNumeracaoNfce({ proximo_numero: numero2 + 1 });
  return { serie: atual.serie, numero: numero2 };
}
async function avancarNumeracaoNfceAposEmissao(serie, numero2) {
  if (!Number.isFinite(serie) || serie < 1 || !Number.isFinite(numero2) || numero2 < 1) {
    return;
  }
  const atual = await obterNumeracaoNfce();
  const proximo = numero2 + 1;
  if (atual.serie !== serie) {
    await atualizarNumeracaoNfce({
      serie,
      proximo_numero: Math.max(proximo, atual.proximo_numero)
    });
    return;
  }
  if (proximo > atual.proximo_numero) {
    await atualizarNumeracaoNfce({ proximo_numero: proximo });
  }
}
async function persistirXmlNfceEmDisco(params) {
  if (!params.xml?.trim()) {
    return;
  }
  try {
    await gravarXmlNfceArquivo({
      chave: params.chave,
      serie: params.serie,
      numero: params.numero,
      xml: params.xml
    });
  } catch {
  }
}
async function salvarNfceLocal(dados) {
  await execute(
    `INSERT INTO nfce_local (
			id, idvenda, serie, numero, chave, tpemis, status, xml, qrcode, protocolo,
			motivo_contingencia, data_contingencia, transmitida, criadoem
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      dados.id,
      dados.idvenda,
      dados.serie,
      dados.numero,
      dados.chave ?? null,
      dados.tpemis,
      dados.status,
      dados.xml ?? null,
      dados.qrcode ?? null,
      dados.protocolo ?? null,
      dados.motivo_contingencia ?? null,
      dados.data_contingencia ?? null,
      dados.transmitida ? 1 : 0,
      (/* @__PURE__ */ new Date()).toISOString()
    ]
  );
  await persistirXmlNfceEmDisco({
    chave: dados.chave,
    serie: dados.serie,
    numero: dados.numero,
    xml: dados.xml
  });
  await atualizarVendaSync(dados.idvenda, {
    idnfce_local: dados.id,
    nfce_status: dados.status
  });
}
async function obterNfcePorVenda(idvenda) {
  return await queryOne(
    `SELECT id, chave, qrcode, status, tpemis, xml, serie, numero, protocolo, motivo_contingencia
			 FROM nfce_local WHERE idvenda = $1 ORDER BY criadoem DESC LIMIT 1`,
    [idvenda]
  ) ?? null;
}
async function atualizarNfceLocalCampos(id, dados) {
  const atual = await queryOne(
    `SELECT xml, chave, qrcode, protocolo, serie, numero, status, transmitida FROM nfce_local WHERE id = $1`,
    [id]
  );
  if (!atual) return;
  await execute(
    `UPDATE nfce_local SET xml = $1, chave = $2, qrcode = $3, protocolo = $4,
			serie = $5, numero = $6, status = $7, transmitida = $8 WHERE id = $9`,
    [
      dados.xml ?? atual.xml,
      dados.chave ?? atual.chave,
      dados.qrcode ?? atual.qrcode,
      dados.protocolo ?? atual.protocolo,
      dados.serie ?? atual.serie,
      dados.numero ?? atual.numero,
      dados.status ?? atual.status,
      dados.transmitida != null ? dados.transmitida ? 1 : 0 : atual.transmitida,
      id
    ]
  );
  await persistirXmlNfceEmDisco({
    chave: dados.chave ?? atual.chave,
    serie: dados.serie ?? atual.serie,
    numero: dados.numero ?? atual.numero,
    xml: dados.xml ?? atual.xml
  });
}
async function marcarNfceTransmitida(id) {
  await execute(
    `UPDATE nfce_local SET transmitida = 1, status = 'transmitida' WHERE id = $1`,
    [id]
  );
}
async function listarNfceComXml() {
  return query(
    `SELECT id, chave, serie, numero, xml, criadoem
		 FROM nfce_local
		 WHERE xml IS NOT NULL AND btrim(xml) <> ''
		 ORDER BY criadoem`
  );
}
async function proximaSenhaChamadaDoDia() {
  const inicio = /* @__PURE__ */ new Date();
  inicio.setHours(0, 0, 0, 0);
  const row = await queryOne(
    `SELECT COUNT(*)::int as total
		 FROM conta_mesa
		 WHERE modalidade IN ('delivery', 'retirada')
		   AND abertoem >= $1
		   AND senha_chamada IS NOT NULL`,
    [inicio.toISOString()]
  );
  return gerarSenhaChamada((Number(row?.total) || 0) + 1);
}
async function taxaEntregaConfig(bairro) {
  const padrao = Number(await getConfig("taxa_entrega_padrao", "0"));
  const tabela = parseBairrosEntrega(
    await getConfig("bairros_entrega", "[]")
  );
  return resolverTaxaEntrega({
    bairro,
    padrao: Number.isFinite(padrao) ? padrao : 0,
    tabelaBairros: tabela
  });
}
async function buscarClientesPdv(termo = "", limit = 30) {
  const q = termo.trim();
  if (!q) {
    return query(
      `SELECT id, nome, telefone, cnpjcpf, endereco, bairro, complemento, referencia, atualizadoem
			 FROM cliente_pdv ORDER BY atualizadoem DESC LIMIT $1`,
      [limit]
    );
  }
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  return query(
    `SELECT id, nome, telefone, cnpjcpf, endereco, bairro, complemento, referencia, atualizadoem
		 FROM cliente_pdv
		 WHERE nome ILIKE $1 ESCAPE '\\'
		    OR telefone ILIKE $1 ESCAPE '\\'
		    OR COALESCE(cnpjcpf, '') ILIKE $1 ESCAPE '\\'
		 ORDER BY nome
		 LIMIT $2`,
    [like, limit]
  );
}
async function salvarClientePdv(params) {
  const nome = params.nome.trim();
  if (!nome) {
    throw new Error("Informe o nome do cliente");
  }
  const id = params.id?.trim() || uuid.v4();
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  await execute(
    `INSERT INTO cliente_pdv (
			id, nome, telefone, cnpjcpf, endereco, bairro, complemento, referencia, atualizadoem
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (id) DO UPDATE SET
			nome = excluded.nome,
			telefone = excluded.telefone,
			cnpjcpf = excluded.cnpjcpf,
			endereco = excluded.endereco,
			bairro = excluded.bairro,
			complemento = excluded.complemento,
			referencia = excluded.referencia,
			atualizadoem = excluded.atualizadoem`,
    [
      id,
      nome,
      params.telefone?.trim() || null,
      params.cnpjcpf?.trim() || null,
      params.endereco?.trim() || null,
      params.bairro?.trim() || null,
      params.complemento?.trim() || null,
      params.referencia?.trim() || null,
      agora
    ]
  );
  const row = await queryOne(
    `SELECT id, nome, telefone, cnpjcpf, endereco, bairro, complemento, referencia, atualizadoem
		 FROM cliente_pdv WHERE id = $1`,
    [id]
  );
  if (!row) {
    throw new Error("Falha ao salvar cliente");
  }
  return row;
}
async function abrirPedidoEntrega(params) {
  const sessao = await obterSessao();
  if (!sessao.idempresa) {
    throw new Error("Empresa não selecionada");
  }
  const modalidade = params.modalidade;
  if (modalidade !== "delivery" && modalidade !== "retirada") {
    throw new Error("Modalidade inválida");
  }
  const endereco = params.endereco?.trim() || null;
  const pode = podeFecharDelivery({ modalidade, endereco });
  if (modalidade === "delivery" && !pode.ok) {
    throw new Error(pode.motivo);
  }
  const bairro = params.bairro?.trim() || null;
  const valorentrega = params.valorentrega != null && Number.isFinite(Number(params.valorentrega)) ? arredondarMoeda(Math.max(0, Number(params.valorentrega))) : modalidade === "delivery" ? await taxaEntregaConfig(bairro) : 0;
  const id = uuid.v4();
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  const senha = await proximaSenhaChamadaDoDia();
  const orderid = params.orderidintegracao?.trim() || null;
  await execute(
    `INSERT INTO conta_mesa (
			id, numero_mesa, idempresa, status, nomecliente, abertoem, valortotal,
			numeropessoas, valordesconto, valortaxaservico, valorcouvert, taxa_ativa,
			modalidade, telefone, endereco, bairro, complemento, referencia,
			valorentrega, status_entrega, senha_chamada, idcliente, orderidintegracao,
			obs, sync_status
		) VALUES (
			$1, 0, $2, 'aberta', $3, $4, $5, 1, 0, 0, 0, 0,
			$6, $7, $8, $9, $10, $11, $12, 'recebido', $13, $14, $15, $16, 'pendente'
		)`,
    [
      id,
      sessao.idempresa,
      params.nomecliente?.trim() || null,
      agora,
      valorentrega,
      modalidade,
      params.telefone?.trim() || null,
      endereco,
      bairro,
      params.complemento?.trim() || null,
      params.referencia?.trim() || null,
      valorentrega,
      senha,
      params.idcliente?.trim() || null,
      orderid,
      params.obs?.trim() || null
    ]
  );
  const criada = await obterContaMesa(id);
  if (!criada) {
    throw new Error("Falha ao abrir pedido de entrega");
  }
  return criada;
}
async function listarPedidosEntrega(statusFiltro) {
  const params = [];
  let where = "WHERE modalidade IN ('delivery', 'retirada') AND status = 'aberta'";
  if (statusFiltro?.trim()) {
    params.push(statusFiltro.trim());
    where += ` AND status_entrega = $${params.length}`;
  }
  const rows = await query(
    `SELECT * FROM conta_mesa ${where} ORDER BY abertoem DESC`,
    params
  );
  const result = [];
  for (const row of rows) {
    const itens = await listarItensAbertos(row.id);
    const valorpago = await somarPagoConta(row.id);
    result.push(montarContaLocal(row, itens, valorpago));
  }
  return result;
}
async function atualizarStatusEntrega(idconta, status2) {
  const conta = await obterContaMesa(idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  if (!ehModalidadeEntrega(conta.modalidade)) {
    throw new Error("Conta não é delivery/retirada");
  }
  const atual = conta.status_entrega || "recebido";
  const proximo = status2 ?? proximoStatusEntrega(atual, conta.modalidade);
  if (!proximo) {
    throw new Error("Não há próximo status de entrega");
  }
  if (status2) {
    const ordemDelivery = [
      "recebido",
      "producao",
      "saiu",
      "entregue"
    ];
    const ordemRetirada = [
      "recebido",
      "producao",
      "entregue"
    ];
    const ordem = conta.modalidade === "retirada" ? ordemRetirada : ordemDelivery;
    if (!ordem.includes(status2)) {
      throw new Error("Status de entrega inválido");
    }
  }
  await execute(
    `UPDATE conta_mesa SET status_entrega = $1, sync_status = 'pendente' WHERE id = $2`,
    [proximo, idconta]
  );
  const atualizada = await obterContaMesa(idconta);
  if (!atualizada) {
    throw new Error("Falha ao atualizar status");
  }
  return atualizada;
}
async function aplicarTaxaEntrega(idconta, valorentrega) {
  const conta = await obterContaMesa(idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  if (!ehModalidadeEntrega(conta.modalidade)) {
    throw new Error("Conta não é delivery/retirada");
  }
  await execute(
    `UPDATE conta_mesa SET valorentrega = $1, sync_status = 'pendente' WHERE id = $2`,
    [arredondarMoeda(Math.max(0, Number(valorentrega) || 0)), idconta]
  );
  await recalcularContaPersistida(idconta);
  const atualizada = await obterContaMesa(idconta);
  if (!atualizada) {
    throw new Error("Falha ao aplicar taxa de entrega");
  }
  return atualizada;
}
async function atualizarDadosEntrega(idconta, dados) {
  const conta = await obterContaMesa(idconta);
  if (!conta || conta.status !== "aberta") {
    throw new Error("Conta inválida");
  }
  if (!ehModalidadeEntrega(conta.modalidade)) {
    throw new Error("Conta não é delivery/retirada");
  }
  await execute(
    `UPDATE conta_mesa SET
			nomecliente = COALESCE($1, nomecliente),
			telefone = COALESCE($2, telefone),
			endereco = COALESCE($3, endereco),
			bairro = COALESCE($4, bairro),
			complemento = COALESCE($5, complemento),
			referencia = COALESCE($6, referencia),
			obs = COALESCE($7, obs),
			sync_status = 'pendente'
		 WHERE id = $8`,
    [
      dados.nomecliente !== void 0 ? dados.nomecliente?.trim() || null : null,
      dados.telefone !== void 0 ? dados.telefone?.trim() || null : null,
      dados.endereco !== void 0 ? dados.endereco?.trim() || null : null,
      dados.bairro !== void 0 ? dados.bairro?.trim() || null : null,
      dados.complemento !== void 0 ? dados.complemento?.trim() || null : null,
      dados.referencia !== void 0 ? dados.referencia?.trim() || null : null,
      dados.obs !== void 0 ? dados.obs?.trim() || null : null,
      idconta
    ]
  );
  const atualizada = await obterContaMesa(idconta);
  if (!atualizada) {
    throw new Error("Falha ao atualizar dados de entrega");
  }
  return atualizada;
}
function rotuloOrigemConta(conta) {
  if (ehModalidadeEntrega(conta.modalidade)) {
    return rotuloProducaoEntrega({
      modalidade: conta.modalidade,
      senhaChamada: conta.senha_chamada,
      protocolo: conta.orderidintegracao
    });
  }
  return `Mesa ${conta.numero_mesa}`;
}
async function resolverProdutoIngest(codigoOuId) {
  const chave = codigoOuId.trim();
  if (!chave) return null;
  const porId = await buscarProdutoPorId(chave);
  if (porId) {
    return { id: porId.id, descricao: porId.descricao, preco: porId.preco };
  }
  const porEan = await buscarProdutoPorEan(chave);
  if (porEan) {
    return { id: porEan.id, descricao: porEan.descricao, preco: porEan.preco };
  }
  const codigoNum = Number(chave);
  if (Number.isInteger(codigoNum) && codigoNum > 0) {
    const porCodigo = await buscarProdutoPorCodigo(codigoNum);
    if (porCodigo) {
      return {
        id: porCodigo.id,
        descricao: porCodigo.descricao,
        preco: porCodigo.preco
      };
    }
  }
  return null;
}
async function ingestPedidoDelivery(params) {
  const protocol = params.protocol.trim();
  if (!protocol) {
    throw new Error("Protocolo obrigatório");
  }
  const existente = await queryOne(
    `SELECT * FROM conta_mesa
		 WHERE orderidintegracao = $1 AND status = 'aberta'
		 LIMIT 1`,
    [protocol]
  );
  if (existente) {
    const conta2 = await obterContaMesa(existente.id);
    if (!conta2) {
      throw new Error("Conta existente inválida");
    }
    return { action: "already_exists", conta: conta2, itensProducao: [] };
  }
  if (!params.itens.length) {
    throw new Error("Pedido sem itens");
  }
  const faltantes = [];
  const resolvidos = [];
  for (const item of params.itens) {
    const chave = item.idproduto?.trim() || item.ean?.trim() || item.codigo?.trim() || item.codigoproduto?.trim() || "";
    const produto = await resolverProdutoIngest(chave);
    if (!produto) {
      faltantes.push(chave || item.nomeproduto || "(sem código)");
      continue;
    }
    const qtd = Number(item.quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      throw new Error(`Quantidade inválida para ${produto.descricao}`);
    }
    resolvidos.push({
      idproduto: produto.id,
      quantidade: qtd,
      observacao: item.observacao?.trim() || null,
      precounitario: item.precounitario != null && Number.isFinite(Number(item.precounitario)) ? Number(item.precounitario) : void 0
    });
  }
  if (faltantes.length) {
    throw new Error(
      `Produtos não encontrados no catálogo local: ${faltantes.join(", ")}`
    );
  }
  const modalidade = params.modalidade === "retirada" ? "retirada" : "delivery";
  const conta = await abrirPedidoEntrega({
    modalidade,
    nomecliente: params.nomecliente,
    telefone: params.telefone,
    endereco: params.endereco,
    bairro: params.bairro,
    complemento: params.complemento,
    referencia: params.referencia,
    valorentrega: params.valorentrega,
    obs: params.obs,
    orderidintegracao: protocol
  });
  const enviado = await enviarPedidoConta({
    idconta: conta.id,
    clientOrderId: protocol,
    itens: resolvidos.map((r) => ({
      idproduto: r.idproduto,
      quantidade: r.quantidade,
      observacao: r.observacao
    }))
  });
  await execute(
    `UPDATE conta_mesa SET status_entrega = 'producao', sync_status = 'pendente' WHERE id = $1`,
    [conta.id]
  );
  const atualizada = await obterContaMesa(conta.id);
  if (!atualizada) {
    throw new Error("Falha ao ingerir pedido");
  }
  return {
    action: "created",
    conta: atualizada,
    itensProducao: enviado.itensProducao
  };
}
const repos = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  abrirCaixa,
  abrirContaMesa,
  abrirPedidoEntrega,
  adicionarItemConta,
  adicionarItemNaMesa,
  aplicarAjustesConta,
  aplicarTaxaEntrega,
  atualizarCaixaIdRemoto,
  atualizarDadosEntrega,
  atualizarNfceLocalCampos,
  atualizarNomeClienteConta,
  atualizarNumeracaoNfce,
  atualizarStatusEntrega,
  atualizarVendaSync,
  avancarNumeracaoNfceAposEmissao,
  buscarClientesLocal,
  buscarClientesPdv,
  buscarProdutoPorCodigo,
  buscarProdutoPorEan,
  buscarProdutoPorId,
  buscarProdutosLocal,
  caixaAberto,
  caixaAbertoOutroOperador,
  calcularResumoTurno,
  calcularResumoTurnoAberto,
  cancelarContaMesa,
  cancelarItemConta,
  concluirOutboxCriarVendaLocal,
  contarOutboxPendentes,
  criarVendaRapida,
  enfileirarOutbox,
  enviarPedidoConta,
  exigirSenhaGerencial,
  fecharCaixa,
  fecharContaMesa,
  fecharFatiaItens,
  ingestPedidoDelivery,
  juntarContas,
  limparContasVazias,
  limparFilaPedidos,
  limparSessao,
  listarAtalhos,
  listarBandeirasCartaoLocal,
  listarCatalogoCarga,
  listarGruposGourmetLocal,
  listarGruposLocal,
  listarLancamentosVenda,
  listarMapeamentoImpressorasGourmet,
  listarMeiosPagamentoLocal,
  listarMesas,
  listarNfceComXml,
  listarNumerosComPendencia,
  listarOutboxPendentes,
  listarPedidosEntrega,
  listarPedidosFila,
  listarPizzasLocal,
  listarProdutosPorGrupo,
  listarProdutosPorGrupoGourmet,
  listarVendas,
  listarVendasComRemoto,
  marcarNfceTransmitida,
  marcarOutboxConcluido,
  marcarOutboxErro,
  marcarPedidoEntregue,
  obterCaixaTurno,
  obterContaMesa,
  obterContaPorNumero,
  obterDestinoGrupoGourmet,
  obterMesa,
  obterNfcePorVenda,
  obterNumeracaoNfce,
  obterSessao,
  obterVenda,
  registrarPagamentoConta,
  reservarNumeroNfce,
  rotuloOrigemConta,
  salvarAtalhos,
  salvarClientePdv,
  salvarConfiguracoes,
  salvarMapeamentoImpressorasGourmet,
  salvarNfceLocal,
  salvarSessao,
  senhaGerencialDefinida,
  transferirConta,
  transferirItens,
  upsertBandeirasCartao,
  upsertClientes,
  upsertGrupos,
  upsertGruposGourmet,
  upsertMeiosPagamento,
  upsertProdutos,
  validarSenhaGerencial
}, Symbol.toStringTag, { value: "Module" }));
async function escreverArquivoAtomico(destino, conteudo) {
  const pasta = node_path.dirname(destino);
  await promises.mkdir(pasta, { recursive: true });
  const temporario = `${destino}.tmp`;
  await promises.writeFile(temporario, conteudo, "utf-8");
  try {
    await promises.rename(temporario, destino);
  } catch (err) {
    const codigo = err && typeof err === "object" && "code" in err ? err.code : "";
    if (codigo === "EXDEV") {
      await promises.copyFile(temporario, destino);
      await promises.unlink(temporario);
      return;
    }
    try {
      await promises.unlink(destino);
    } catch {
    }
    try {
      await promises.rename(temporario, destino);
    } catch (segundo) {
      const codigo2 = segundo && typeof segundo === "object" && "code" in segundo ? segundo.code : "";
      if (codigo2 === "EXDEV") {
        await promises.copyFile(temporario, destino);
        await promises.unlink(temporario);
        return;
      }
      throw segundo;
    }
  }
}
const LAYOUT_PADRAO = {
  rootElement: "Comandas",
  commandElement: "Comanda"
};
const NOME_ELEM = /^[A-Za-z_][\w.-]*$/;
function normalizarNumerosComanda(comandas) {
  return [
    ...new Set(comandas.map((item) => String(item).trim()).filter(Boolean))
  ].sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
}
function nomeElemento(valor, padrao) {
  const nome = valor?.trim() || padrao;
  return NOME_ELEM.test(nome) ? nome : padrao;
}
function escapeXml$1(valor) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function gerarXmlComandas(comandas, layout = {}) {
  const root = nomeElemento(layout.rootElement, LAYOUT_PADRAO.rootElement);
  const item = nomeElemento(
    layout.commandElement,
    LAYOUT_PADRAO.commandElement
  );
  const numeros = normalizarNumerosComanda(comandas);
  if (numeros.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<${root} />
`;
  }
  const corpo = numeros.map((numero2) => `    <${item}>${escapeXml$1(numero2)}</${item}>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<${root}>
${corpo}
</${root}>
`;
}
let sincronizando$1 = false;
let ultimoHash = "";
let timer$1 = null;
let status = {
  enabled: false,
  commandCount: 0,
  targetPath: "",
  lastError: null
};
function mensagemErro(err) {
  const codigo = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  const detalhe = err instanceof Error ? err.message : String(err);
  if (codigo === "ENOENT") {
    return `[Tecnibra] Diretório não encontrado. ${detalhe}`;
  }
  if (codigo === "EPERM" || codigo === "EACCES") {
    return `[Tecnibra] Sem permissão para escrever. ${detalhe}`;
  }
  if (codigo === "EBUSY" || codigo === "EAGAIN") {
    return `[Tecnibra] Arquivo em uso. ${detalhe}`;
  }
  return `[Tecnibra] Falha ao atualizar arquivo XML. ${detalhe}`;
}
async function obterConfigTecnibra() {
  const enabled = await getConfig("tecnibra_habilitada", "0") === "1";
  const targetPath = (await getConfig(
    "tecnibra_xml_path",
    "C:\\Tecnibra\\IHM Receptora\\Comandas.xml"
  )).trim();
  const intervaloMs = Math.max(
    1e3,
    Number(await getConfig("tecnibra_intervalo_ms", "3000")) || 3e3
  );
  return {
    enabled,
    targetPath,
    intervaloMs,
    rootElement: (await getConfig("tecnibra_xml_root", "Comandas")).trim() || "Comandas",
    commandElement: (await getConfig("tecnibra_xml_item", "Comanda")).trim() || "Comanda"
  };
}
function statusTecnibra() {
  return { ...status };
}
async function syncTecnibra() {
  if (sincronizando$1) {
    return;
  }
  sincronizando$1 = true;
  status = { ...status, lastSyncAt: (/* @__PURE__ */ new Date()).toISOString() };
  try {
    const cfg = await obterConfigTecnibra();
    status = { ...status, enabled: cfg.enabled, targetPath: cfg.targetPath };
    if (!cfg.enabled || !cfg.targetPath) {
      return;
    }
    const pendentes = normalizarNumerosComanda(
      await listarNumerosComPendencia()
    );
    const hash = node_crypto.createHash("sha256").update(JSON.stringify(pendentes)).digest("hex");
    if (hash === ultimoHash && !status.lastError) {
      status = {
        ...status,
        commandCount: pendentes.length,
        lastSuccessAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: null
      };
      return;
    }
    const xml = gerarXmlComandas(pendentes, {
      rootElement: cfg.rootElement,
      commandElement: cfg.commandElement
    });
    await escreverArquivoAtomico(cfg.targetPath, xml);
    ultimoHash = hash;
    status = {
      ...status,
      commandCount: pendentes.length,
      lastSuccessAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastError: null,
      targetPath: cfg.targetPath
    };
  } catch (err) {
    const mensagem = mensagemErro(err);
    status = { ...status, lastError: mensagem };
    console.error("[Tecnibra] Falha ao atualizar arquivo XML");
    console.error(err instanceof Error ? err.message : err);
  } finally {
    sincronizando$1 = false;
  }
}
function pararTecnibra() {
  if (timer$1) {
    clearInterval(timer$1);
    timer$1 = null;
  }
}
async function iniciarTecnibra() {
  pararTecnibra();
  const cfg = await obterConfigTecnibra();
  status = {
    ...status,
    enabled: cfg.enabled,
    targetPath: cfg.targetPath
  };
  if (!cfg.enabled) {
    return;
  }
  await syncTecnibra();
  timer$1 = setInterval(() => {
    void syncTecnibra();
  }, cfg.intervaloMs);
}
async function reiniciarTecnibra() {
  ultimoHash = "";
  await iniciarTecnibra();
}
const PERFIS_CONFIG_PDV = ["admin", "proprietario", "super"];
function normalizarPerfis(valor) {
  if (Array.isArray(valor)) {
    return valor.filter((item) => typeof item === "string").map((item) => item.trim().toLowerCase()).filter(Boolean);
  }
  if (typeof valor === "string" && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) {
        return normalizarPerfis(parsed);
      }
    } catch {
    }
    return valor.split(/[,\s]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}
function podeConfigurarPdv(roles) {
  const perfis = normalizarPerfis(roles);
  return PERFIS_CONFIG_PDV.some((perfil) => perfis.includes(perfil));
}
const MODULO_GOURMET = "gourmet";
function planoTemGourmet(modulos) {
  return normalizarPerfis(modulos).includes(MODULO_GOURMET);
}
function sessaoTemGourmet(valor) {
  if (valor === true || valor === 1) return true;
  if (typeof valor === "string") {
    const v = valor.trim().toLowerCase();
    return v === "1" || v === "true" || v === "sim";
  }
  return false;
}
const CHAVES_CONFIG_GOURMET = [
  "modelo_atendimento",
  "qtd_mesas",
  "taxa_servico_percentual",
  "couvert_valor",
  "taxa_entrega_padrao",
  "bairros_entrega",
  "senha_gerencial",
  "senha_gerencial_hash",
  "senha_gerencial_salt",
  "tecnibra_habilitada",
  "tecnibra_xml_path",
  "tecnibra_intervalo_ms",
  "tecnibra_xml_root",
  "tecnibra_xml_item"
];
const CHAVES_CONFIG_OPERADOR = [
  "filtro_apenas_abertas",
  "teclas_funcao",
  "teclado_virtual_pagamento"
];
const CHAVES_CONFIG_PRE_LOGIN = [
  "api_url",
  "database_url",
  "pdv_modo",
  "pdv_principal_host",
  "pdv_principal_porta",
  "numeropdv"
];
function payloadSoTemChaves(dados, permitidas) {
  const chaves = Object.keys(dados);
  if (!chaves.length) return true;
  const set = new Set(permitidas);
  return chaves.every((chave) => set.has(chave));
}
class ApiError extends Error {
  constructor(message, status2) {
    super(message);
    this.status = status2;
    this.name = "ApiError";
  }
}
function formatarDetalhesValidacao(json) {
  if (!json || typeof json !== "object") return null;
  const details = json.details;
  if (!Array.isArray(details) || details.length === 0) return null;
  return details.map((item) => {
    if (!item || typeof item !== "object") return null;
    const issue = item;
    const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
    const message = issue.message ?? "inválido";
    return path ? `${path}: ${message}` : message;
  }).filter((v) => Boolean(v)).join("; ");
}
function asApiDecimal(value) {
  if (value === null || value === void 0) return "0";
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    return trimmed.length ? trimmed : "0";
  }
  if (!Number.isFinite(value)) return "0";
  return String(value);
}
async function baseUrl() {
  return (await getConfig("api_url", "https://api.compuchat.space")).replace(
    /\/$/,
    ""
  );
}
function mensagemErroApi(json, status2) {
  if (json && typeof json === "object") {
    const obj = json;
    const detailsMsg = formatarDetalhesValidacao(json);
    const candidatos = [obj.error, obj.message, obj.code].filter((v) => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
    if (candidatos.length) {
      const base = candidatos.join(" — ");
      return detailsMsg ? `${base} — ${detailsMsg}` : base;
    }
    if (typeof obj.raw === "string" && obj.raw.trim()) {
      const trecho = obj.raw.replace(/\s+/g, " ").trim().slice(0, 160);
      return `HTTP ${status2} (resposta não-JSON): ${trecho}`;
    }
  }
  return `HTTP ${status2}`;
}
function isEmpresaAcessoNegado(err) {
  if (!(err instanceof ApiError) || err.status !== 403) {
    return false;
  }
  return /EMPRESA_ACESSO_NEGADO|não pertence à empresa/i.test(err.message);
}
async function request(path, options = {}) {
  const { method = "GET", body, auth = true, timeoutMs = 2e4 } = options;
  const headers = {
    Accept: "application/json"
  };
  if (body !== void 0) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = (await obterSessao()).token;
    if (!token) {
      throw new ApiError("Sem token de sessão", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer2 = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${await baseUrl()}${path}`, {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0,
      signal: controller.signal
    });
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }
    if (!res.ok) {
      throw new ApiError(mensagemErroApi(json, res.status), res.status);
    }
    return json;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("Timeout na comunicação com a API", 408);
    }
    throw new ApiError(err instanceof Error ? err.message : "Falha de rede", 0);
  } finally {
    clearTimeout(timer2);
  }
}
async function pingApi() {
  const url = `${await baseUrl()}/health`;
  try {
    const controller = new AbortController();
    const timer2 = setTimeout(() => controller.abort(), 5e3);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!res.ok) return false;
      const ctype = res.headers.get("content-type") ?? "";
      if (!ctype.includes("application/json")) return false;
      const body = await res.json();
      return body.service === "api-mais-gestao" || body.status === "ok" || body.status === "degraded";
    } finally {
      clearTimeout(timer2);
    }
  } catch {
    return false;
  }
}
async function apiBaseUrl() {
  return baseUrl();
}
async function loginEmail(email, password) {
  const data = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: { email, password },
    auth: false
  });
  const token = data.token ?? data.session?.token;
  if (!token) {
    throw new ApiError("Sessão sem token. Verifique a API.");
  }
  return {
    token,
    userid: data.user?.id ?? null,
    username: data.user?.name ?? data.user?.nome ?? data.user?.email ?? email
  };
}
async function obterPerfilUsuario() {
  const data = await request("/api/auth/perfil");
  return { perfil: data.perfil ?? [] };
}
async function obterMeuPlano(idempresa) {
  const path = idempresa ? `/planos/meu-plano?idempresa=${encodeURIComponent(idempresa)}` : "/planos/meu-plano";
  const data = await request(path);
  return { modulos: data.modulos ?? [] };
}
async function listarEmpresas(idusuario) {
  let path = "/empresas?page=1&limit=100";
  if (idusuario) {
    path += `&idusuario=${encodeURIComponent(idusuario)}`;
  }
  const data = await request(path);
  return (data.data ?? []).map((e) => ({
    id: e.id,
    nome: e.nome ?? e.razaosocial ?? e.id,
    cnpj: e.cnpj ?? null
  }));
}
async function buscarEmpresa(idempresa) {
  return request(`/empresas/${idempresa}`);
}
async function buscarEmpresaFiscal(idempresa) {
  return request(`/empresas/${idempresa}/fiscal`);
}
async function listarProdutos(params) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  let path = `/produtos?idempresa=${encodeURIComponent(params.idempresa)}&inativo=0&page=${page}&limit=${limit}`;
  if (params.q?.trim()) {
    path += `&q=${encodeURIComponent(params.q.trim())}`;
  }
  const data = await request(path);
  return (data.data ?? []).map((p) => ({
    id: p.id,
    descricao: p.descricao ?? p.nome ?? "",
    preco: Number(p.preco ?? 0),
    unidademedida: p.unidademedida ?? null,
    idunidademedida: p.idunidademedida ?? null,
    ean: p.ean ?? p.codigoean ?? null,
    codigo: Number(p.codigo) > 0 ? Number(p.codigo) : null,
    idgrupo: p.idgrupo ?? null,
    idgrupogourmet: p.idgrupogourmet ?? null,
    espizza: Number(p.espizza ?? 0) === 1 ? 1 : 0,
    imagem: p.imagem ?? null,
    caminhoimagem: p.caminhoimagem ?? null
  }));
}
async function listarUnidadesMedida(idempresa) {
  const unidades = [];
  let page = 1;
  for (; ; ) {
    const path = `/unidades-medida?idempresa=${encodeURIComponent(idempresa)}&page=${page}&limit=100`;
    const data = await request(path);
    const lote = data.data ?? [];
    for (const u of lote) {
      unidades.push({
        id: u.id,
        codigo: u.codigo ?? null,
        nome: u.nome ?? null
      });
    }
    if (lote.length < 100 || page > 20) break;
    page += 1;
  }
  return unidades;
}
async function listarGrupos(params) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const path = `/hierarquias?idempresa=${encodeURIComponent(params.idempresa)}&page=${page}&limit=${limit}`;
  const data = await request(path);
  return (data.data ?? []).filter((g) => g.nome).map((g) => ({ id: g.id, nome: String(g.nome) }));
}
async function listarGruposGourmet(params) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const path = `/grupos-gourmet?idempresa=${encodeURIComponent(params.idempresa)}&page=${page}&limit=${limit}`;
  const data = await request(path);
  return (data.data ?? []).filter((g) => g.nome && g.inativo !== 1).map((g) => ({ id: g.id, nome: String(g.nome) }));
}
async function listarClientes(params) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const path = `/entidades?idempresa=${encodeURIComponent(params.idempresa)}&cliente=1&page=${page}&limit=${limit}`;
  const data = await request(path);
  return (data.data ?? []).map((c) => ({
    id: c.id,
    nome: (c.nome ?? c.razaosocial ?? "").trim() || c.id,
    razaosocial: c.razaosocial ?? null,
    cnpjcpf: c.cnpjcpf ?? null,
    telefone: c.telefone ?? null,
    email: c.email ?? null
  }));
}
async function listarBandeirasCartao(params) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const path = `/bandeiras-cartao?idempresa=${encodeURIComponent(params.idempresa)}&inativo=0&page=${page}&limit=${limit}`;
  const data = await request(path);
  return (data.data ?? []).filter((b) => b.descricao?.trim()).map((b) => ({
    id: b.id,
    codigo: b.codigo ?? null,
    descricao: String(b.descricao).trim()
  }));
}
async function listarTiposDocumentoFinanceiro(params) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const path = `/tipos-documento-financeiro?idempresa=${encodeURIComponent(params.idempresa)}&inativo=0&page=${page}&limit=${limit}`;
  const data = await request(path);
  return (data.data ?? []).filter((m) => m.descricao?.trim()).map((m) => ({
    id: m.id,
    descricao: String(m.descricao).trim(),
    formapagamentonfe: m.formapagamentonfe ?? null,
    aprazo: Number(m.aprazo ?? 0) === 1 ? 1 : 0
  }));
}
async function listarAtalhosRemotos(idempresa) {
  const data = await request(`/atalhos-pdv?idempresa=${encodeURIComponent(idempresa)}`);
  if (Array.isArray(data.idsProdutos)) {
    return data.idsProdutos;
  }
  return (data.data ?? []).map((a) => a.idproduto);
}
async function substituirAtalhosRemotos(idempresa, idsProdutos) {
  const data = await request("/atalhos-pdv", {
    method: "PUT",
    body: { idempresa, idsProdutos }
  });
  return (data.data ?? []).map((a) => a.idproduto);
}
const VENDA_LOCAL_PDV_HIBRIDO = 3;
async function criarVendaPdv(body) {
  const { pagamentos, pagamentosErp, ...resto } = body;
  const nativos = (pagamentos ?? []).filter(
    (item) => item.meio === "DINHEIRO" || item.meio === "PIX" || item.meio === "CARTAO"
  );
  return request("/vendas-pdv-gourmet", {
    method: "POST",
    body: {
      ...resto,
      ...nativos.length ? {
        pagamentos: nativos.map((item) => ({
          meio: item.meio,
          valor: asApiDecimal(item.valor),
          ...item.nsu ? { nsu: item.nsu } : {},
          ...item.autorizacao ? { autorizacao: item.autorizacao } : {},
          ...item.bandeira ? { bandeira: item.bandeira } : {},
          status: item.status ?? "ok"
        }))
      } : {},
      ...pagamentosErp?.length ? {
        pagamentosErp: pagamentosErp.map((forma) => ({
          idtipodocumentofinanceiro: forma.idtipodocumentofinanceiro,
          valor: asApiDecimal(forma.valor)
        }))
      } : {}
    }
  });
}
async function buscarVendaPdvGourmet(id) {
  return request(`/vendas-pdv-gourmet/${id}`);
}
async function criarItemVendaPdv(body) {
  return request("/vendas-pdv-item", {
    method: "POST",
    body: {
      idempresa: body.idempresa,
      idvenda: body.idvenda,
      idproduto: body.idproduto,
      quantidade: asApiDecimal(body.quantidade),
      precounitario: asApiDecimal(body.precounitario),
      precototal: asApiDecimal(body.precototal),
      precopromocao: asApiDecimal(body.precopromocao ?? 0),
      precoalterado: asApiDecimal(body.precoalterado ?? 0),
      ...body.taxaservico !== void 0 ? { taxaservico: body.taxaservico } : {},
      ...body.descricao ? { descricao: body.descricao.slice(0, 120) } : {}
    }
  });
}
async function baixaEstoqueVenda(body) {
  return request("/estoque/baixa-venda", {
    method: "POST",
    body: {
      idempresa: body.idempresa,
      idvenda: body.idvenda,
      itens: body.itens.map((i) => ({
        idproduto: i.idproduto,
        quantidade: asApiDecimal(i.quantidade),
        precounitario: asApiDecimal(i.precounitario),
        ...i.nomeproduto ? { nomeproduto: i.nomeproduto } : {}
      })),
      pagamentos: {
        valortotal: asApiDecimal(body.pagamentos.valortotal),
        valortroco: asApiDecimal(body.pagamentos.valortroco ?? 0),
        valordinheiro: asApiDecimal(body.pagamentos.valordinheiro ?? 0),
        valorpix: asApiDecimal(body.pagamentos.valorpix ?? 0),
        valorcartaocredito: asApiDecimal(
          body.pagamentos.valorcartaocredito ?? 0
        ),
        valorcartaodebito: asApiDecimal(body.pagamentos.valorcartaodebito ?? 0),
        valorcartao: asApiDecimal(body.pagamentos.valorcartao ?? 0),
        valorprepago: asApiDecimal(body.pagamentos.valorprepago ?? 0),
        desconto: asApiDecimal(body.pagamentos.desconto ?? 0),
        valortaxaservico: asApiDecimal(body.pagamentos.valortaxaservico ?? 0),
        valorcouverartistico: asApiDecimal(
          body.pagamentos.valorcouverartistico ?? 0
        ),
        valorentrega: asApiDecimal(body.pagamentos.valorentrega ?? 0)
      },
      ...body.emitirNfce === false ? { emitirNfce: false } : {}
    },
    timeoutMs: 6e4
  });
}
function extrairNfceDaBaixa(baixa) {
  const nfce = baixa.emissaoNfce ?? baixa.nfce;
  const pendencias = baixa.emissaoNfce?.pendencias?.map((p) => p.mensagem).filter(Boolean).join("; ");
  const motivo = nfce && "xMotivo" in nfce ? nfce.xMotivo ?? void 0 : void 0;
  const erroBase = nfce?.erro ?? motivo ?? pendencias ?? baixa.avisos?.find(
    (a) => /nfc|sefaz|cfop|duplicidade|emissão|rejeic/i.test(a)
  ) ?? baixa.avisos?.[0];
  const cStat = nfce && "cStat" in nfce ? nfce.cStat ?? void 0 : void 0;
  const emitida = Boolean(nfce?.emitida);
  let erro;
  if (!emitida) {
    if (cStat && erroBase) {
      erro = `Rejeição ${cStat}: ${erroBase}`;
    } else if (erroBase) {
      erro = erroBase;
    } else if (baixa.deveEmitirNfce !== false) {
      erro = "Falha na emissão da NFC-e (sem detalhe retornado pela API)";
    }
  }
  const xml = nfce && "xml" in nfce ? nfce.xml ?? void 0 : void 0;
  const serie = nfce && "serie" in nfce ? nfce.serie ?? void 0 : void 0;
  const numero2 = nfce && "numero" in nfce ? nfce.numero ?? void 0 : void 0;
  return {
    emitida,
    chave: nfce?.chave,
    qrCode: nfce?.qrCode,
    protocolo: nfce?.protocolo,
    idnotafiscal: baixa.emissaoNfce?.idnotafiscal ?? baixa.idnotafiscal ?? void 0,
    cStat,
    erro,
    xml,
    serie,
    numero: numero2
  };
}
async function buscarCupomNfce(idnotafiscal) {
  const data = await request(`/nfce/${idnotafiscal}/cupom`);
  return {
    chave: data.nfce?.chave ?? data.chave,
    qrCode: data.nfce?.qrCode ?? data.qrCode,
    xml: data.nfce?.xml ?? data.xml,
    protocolo: data.nfce?.protocolo ?? data.protocolo,
    serie: data.nfce?.serie,
    numero: data.nfce?.numero
  };
}
async function buscarPdvFiscal(idempresa, numeropdv) {
  return request(`/empresas/${idempresa}/pdv-fiscal?numeropdv=${numeropdv}`);
}
async function listarTerminaisPdv(idempresa) {
  const data = await request(
    `/terminais-pdv?idempresa=${encodeURIComponent(idempresa)}`
  );
  return data.data ?? [];
}
async function buscarNfceConfig(idempresa) {
  return request(`/empresas/${idempresa}/nfce-configuracao`);
}
async function transmitirNfceContingencia(body) {
  return request("/nfce/contingencia/transmitir", {
    method: "POST",
    body,
    timeoutMs: 6e4
  });
}
async function retransmitirNfceVendaPdv(body) {
  return request(
    `/nfce/venda/${body.idvenda}/retransmitir`,
    {
      method: "POST",
      body: { idempresa: body.idempresa },
      timeoutMs: 6e4
    }
  );
}
async function inutilizarNfceVendaPdv(body) {
  return request(
    `/nfce/venda/${body.idvenda}/inutilizar`,
    {
      method: "POST",
      body: {
        idempresa: body.idempresa,
        justificativa: body.justificativa
      },
      timeoutMs: 6e4
    }
  );
}
const STATUS_CAIXA_ABERTO = 0;
const STATUS_CAIXA_FECHADO = 1;
function extrairIdFechamentoCaixa(json) {
  if (!json || typeof json !== "object") return null;
  const obj = json;
  const aninhado = obj.body && typeof obj.body === "object" ? obj.body : null;
  const id = aninhado?.id ?? obj.id;
  if (id == null || id === "") return null;
  return String(id);
}
async function criarFechamentoCaixaRemoto(body) {
  const json = await request("/fechamentos-caixa", {
    method: "POST",
    body
  });
  const id = extrairIdFechamentoCaixa(json);
  if (!id) {
    throw new ApiError("Retaguarda não devolveu o ID do fechamento de caixa");
  }
  return id;
}
async function atualizarFechamentoCaixaRemoto(id, body) {
  await request(`/fechamentos-caixa/${id}`, {
    method: "PUT",
    body
  });
}
const CODIGO_POR_UF = {
  RO: 11,
  AC: 12,
  AM: 13,
  RR: 14,
  PA: 15,
  AP: 16,
  TO: 17,
  MA: 21,
  PI: 22,
  CE: 23,
  RN: 24,
  PB: 25,
  PE: 26,
  AL: 27,
  SE: 28,
  BA: 29,
  MG: 31,
  ES: 32,
  RJ: 33,
  SP: 35,
  PR: 41,
  SC: 42,
  RS: 43,
  MS: 50,
  MT: 51,
  GO: 52,
  DF: 53
};
const UF_POR_CODIGO = Object.fromEntries(
  Object.entries(CODIGO_POR_UF).map(([uf, codigo]) => [String(codigo), uf])
);
const URL_CONSULTA_NFCE = {
  MG: {
    producao: "https://portalsped.fazenda.mg.gov.br/portalnfce",
    homologacao: "https://hportalsped.fazenda.mg.gov.br/portalnfce"
  },
  SP: {
    producao: "https://www.nfce.fazenda.sp.gov.br/consulta",
    homologacao: "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica"
  }
};
const URL_QRCODE_NFCE = {
  MG: {
    producao: "https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml",
    homologacao: "https://hportalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml"
  },
  SP: {
    producao: "https://www.nfce.fazenda.sp.gov.br/qrcode",
    homologacao: "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx"
  }
};
function codigoIbgeDaUf(uf) {
  if (!uf) return void 0;
  return CODIGO_POR_UF[uf.toUpperCase()];
}
function ufDaChaveAcesso(chave) {
  const digits = (chave ?? "").replace(/\D/g, "");
  if (digits.length < 2) return void 0;
  return UF_POR_CODIGO[digits.slice(0, 2)];
}
function portal(mapa, uf, homologacao) {
  if (!uf) return void 0;
  const urls = mapa[uf.toUpperCase()];
  if (!urls) return void 0;
  return homologacao ? urls.homologacao : urls.producao;
}
function urlConsultaNfce(uf, homologacao) {
  return portal(URL_CONSULTA_NFCE, uf, homologacao);
}
function urlQrCodeNfce(uf, homologacao) {
  return portal(URL_QRCODE_NFCE, uf, homologacao) ?? urlConsultaNfce(uf, homologacao);
}
function resolverUfEmitente(params) {
  const uf = params.uf?.trim().toUpperCase();
  if (uf && CODIGO_POR_UF[uf]) return uf;
  return ufDaChaveAcesso(params.chave);
}
function hostnameDeUrl(valor) {
  try {
    return new URL(valor).hostname.toLowerCase();
  } catch {
    return "";
  }
}
function urlPertenceAUf(url, uf) {
  const host = hostnameDeUrl(url);
  if (!host) return false;
  return host.includes(`.${uf.toLowerCase()}.gov.br`);
}
function resolverUrlConsultaNfce(params) {
  const uf = resolverUfEmitente(params);
  const oficial = urlConsultaNfce(uf, params.homologacao === true);
  if (oficial) return oficial;
  const xml = params.urlXml?.trim();
  if (!xml) return void 0;
  return xml.split("?")[0]?.replace(/\/$/, "") || xml;
}
function corrigirQrCodeNfce(params) {
  const qrcode2 = params.qrcode?.trim();
  if (!qrcode2) return void 0;
  const uf = resolverUfEmitente(params);
  if (!uf || urlPertenceAUf(qrcode2, uf)) return qrcode2;
  const base = urlQrCodeNfce(uf, params.homologacao === true);
  if (!base) return qrcode2;
  const idx = qrcode2.indexOf("?p=");
  if (idx < 0) return qrcode2;
  return `${base}${qrcode2.slice(idx)}`;
}
const LARGURA_DANFCE = 48;
const MARCADOR_QR_DANFCE = "<<QR>>";
function onlyDigits$1(valor) {
  return valor.replace(/\D/g, "");
}
function formatarMoedaDanfce(valor) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatarCnpjDanfce(cnpj) {
  const d = onlyDigits$1(cnpj).padStart(14, "0").slice(-14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
function formatarCpfDanfce(cpf) {
  const d = onlyDigits$1(cpf).padStart(11, "0").slice(-11);
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}
function formatarChaveDanfce(chave) {
  const d = onlyDigits$1(chave);
  if (!d) return chave;
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function formatarProtocoloDanfce(protocolo) {
  const d = onlyDigits$1(protocolo);
  if (d.length < 15) return protocolo;
  return `${d.slice(0, 3)} ${d.slice(3, 13)} ${d.slice(13)}`;
}
function formatarFoneDanfce(fone) {
  const d = onlyDigits$1(fone);
  if (d.length === 11) {
    return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1)$2-$3");
  }
  if (d.length === 10) {
    return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return fone;
}
function formatarDataHoraDanfce(iso) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
  }
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR");
}
function formatarQtdeDanfce(valor) {
  const arred = Math.round(valor * 1e4) / 1e4;
  if (Number.isInteger(arred)) return String(arred);
  return String(arred).replace(".", ",");
}
function centralizar(texto, largura = LARGURA_DANFCE) {
  const linhas = quebrar(texto, largura);
  return linhas.map((linha) => {
    const pad2 = Math.max(0, largura - linha.length);
    const esquerda = Math.floor(pad2 / 2);
    return `${" ".repeat(esquerda)}${linha}`;
  });
}
function quebrar(texto, largura = LARGURA_DANFCE) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (!limpo) return [""];
  const linhas = [];
  let resto = limpo;
  while (resto.length > largura) {
    let corte = resto.lastIndexOf(" ", largura);
    if (corte < largura / 2) corte = largura;
    linhas.push(resto.slice(0, corte).trimEnd());
    resto = resto.slice(corte).trimStart();
  }
  if (resto) linhas.push(resto);
  return linhas;
}
function esquerdaDireita(esquerda, direita, largura = LARGURA_DANFCE) {
  const gap = 1;
  const maxEsq = Math.max(0, largura - direita.length - gap);
  const esq = esquerda.slice(0, maxEsq);
  return `${esq}${" ".repeat(Math.max(gap, largura - esq.length - direita.length))}${direita}`;
}
function sep() {
  return "-".repeat(LARGURA_DANFCE);
}
function enderecoEmitente$1(emitente) {
  const partes = [
    [emitente.logradouro, emitente.numero].filter(Boolean).join(", "),
    emitente.bairro,
    [emitente.municipio, emitente.uf].filter(Boolean).join("-")
  ].map((p) => p?.trim()).filter(Boolean);
  return partes.join(", ");
}
function linhaConsumidor(consumidor) {
  if (!consumidor?.documento && !consumidor?.nome) {
    return "CONSUMIDOR NAO IDENTIFICADO";
  }
  if (consumidor.tipo === "cnpj" && consumidor.documento) {
    const nome = consumidor.nome ? ` - ${consumidor.nome}` : "";
    return `CONSUMIDOR - CNPJ ${formatarCnpjDanfce(consumidor.documento)}${nome}`;
  }
  if (consumidor.tipo === "cpf" && consumidor.documento) {
    const nome = consumidor.nome ? ` - ${consumidor.nome}` : "";
    return `CONSUMIDOR - CPF ${formatarCpfDanfce(consumidor.documento)}${nome}`;
  }
  if (consumidor.nome) {
    return `CONSUMIDOR - ${consumidor.nome}`;
  }
  return "CONSUMIDOR NAO IDENTIFICADO";
}
function linhasItem(item) {
  const codigo = (item.codigo || "").slice(0, 10);
  const desc = item.descricao || "";
  const primeira = `${codigo}${codigo ? " " : ""}${desc}`.trim();
  const linhas = quebrar(primeira);
  const qtde = formatarQtdeDanfce(item.quantidade);
  const un = (item.unidade || "UN").slice(0, 4);
  const valores = `${qtde} ${un}  ${formatarMoedaDanfce(item.unitario)}  ${formatarMoedaDanfce(item.total)}`;
  linhas.push(esquerdaDireita("", valores));
  return linhas;
}
function montarTextoDanfce(dados) {
  const linhas = [];
  const emit = dados.emitente;
  linhas.push(...centralizar(emit.nome || "EMITENTE"));
  const ie = emit.ie ? ` | IE: ${emit.ie}` : "";
  linhas.push(
    ...centralizar(
      `CNPJ: ${emit.cnpj ? formatarCnpjDanfce(emit.cnpj) : "—"}${ie}`
    )
  );
  const endereco = enderecoEmitente$1(emit);
  if (endereco) {
    linhas.push(...centralizar(endereco));
  }
  if (emit.fone) {
    linhas.push(...centralizar(`Fone: ${formatarFoneDanfce(emit.fone)}`));
  }
  linhas.push(sep());
  linhas.push(
    ...centralizar(
      "Documento Auxiliar da Nota Fiscal de Consumidor Eletronica"
    )
  );
  linhas.push(...centralizar("Não permite aproveitamento de crédito de ICMS"));
  if (dados.contingencia) {
    linhas.push(...centralizar("EMITIDA EM CONTINGÊNCIA"));
    if (dados.pendenteAutorizacao) {
      linhas.push(...centralizar("Pendente de autorização"));
    }
  }
  if (dados.homologacao) {
    linhas.push(...centralizar("SEM VALOR FISCAL"));
    linhas.push(...centralizar("Emitida em ambiente de Homologacao"));
  }
  linhas.push(sep());
  linhas.push("Codigo Descricao Qtde UN Vl Unit Vl Total");
  for (const item of dados.itens) {
    linhas.push(...linhasItem(item));
  }
  linhas.push(sep());
  linhas.push(
    esquerdaDireita("Qtde total de itens", String(dados.itens.length))
  );
  linhas.push(
    esquerdaDireita("Valor Total R$", formatarMoedaDanfce(dados.valorProdutos))
  );
  linhas.push(
    esquerdaDireita("Desconto R$", formatarMoedaDanfce(dados.desconto))
  );
  linhas.push(esquerdaDireita("Frete R$", formatarMoedaDanfce(dados.frete)));
  linhas.push(
    esquerdaDireita("Valor a Pagar R$", formatarMoedaDanfce(dados.valorPagar))
  );
  linhas.push(sep());
  linhas.push(esquerdaDireita("FORMA PAGAMENTO", "VALOR PAGO R$"));
  if (dados.pagamentos.length) {
    for (const pag of dados.pagamentos) {
      linhas.push(esquerdaDireita(pag.tipo, formatarMoedaDanfce(pag.valor)));
    }
  }
  linhas.push(esquerdaDireita("Troco R$", formatarMoedaDanfce(dados.troco)));
  linhas.push(sep());
  linhas.push(...centralizar("Consulte pela Chave de Acesso em:"));
  if (dados.urlChave) {
    linhas.push(...centralizar(dados.urlChave));
  }
  if (dados.chave) {
    const grupos = formatarChaveDanfce(dados.chave).split(" ");
    if (formatarChaveDanfce(dados.chave).length <= LARGURA_DANFCE) {
      linhas.push(...centralizar(formatarChaveDanfce(dados.chave)));
    } else {
      const meio = Math.ceil(grupos.length / 2);
      linhas.push(...centralizar(grupos.slice(0, meio).join(" ")));
      linhas.push(...centralizar(grupos.slice(meio).join(" ")));
    }
  }
  linhas.push(sep());
  linhas.push(...centralizar(linhaConsumidor(dados.consumidor)));
  if (dados.consumidor?.endereco) {
    linhas.push(...centralizar(dados.consumidor.endereco));
  }
  const numero2 = String(dados.numero || 0).padStart(9, "0");
  const serie = String(dados.serie || 0).padStart(3, "0");
  const dhEmi = dados.dhEmi ? ` ${formatarDataHoraDanfce(dados.dhEmi)}` : "";
  linhas.push(...centralizar(`NFCe n. ${numero2} Série ${serie}${dhEmi}`));
  if (dados.protocolo) {
    linhas.push(
      ...centralizar(
        `Protocolo de Autorização: ${formatarProtocoloDanfce(dados.protocolo)}`
      )
    );
  }
  if (dados.dhAutorizacao) {
    linhas.push(
      ...centralizar(
        `Data de Autorização: ${formatarDataHoraDanfce(dados.dhAutorizacao)}`
      )
    );
  }
  linhas.push(sep());
  if (dados.qrcode) {
    linhas.push(MARCADOR_QR_DANFCE);
    linhas.push(sep());
  }
  const trib = dados.vTotTrib != null && dados.vTotTrib > 0 ? formatarMoedaDanfce(dados.vTotTrib) : "------";
  linhas.push(
    ...centralizar(
      `Tributos totais Incidentes (Lei Federal 12.741/2012): R$ ${trib}`
    )
  );
  if (dados.infCpl) {
    for (const trecho of dados.infCpl.split(";")) {
      const t = trecho.trim();
      if (t) linhas.push(...quebrar(t));
    }
  }
  linhas.push("");
  linhas.push("");
  return linhas.join("\n");
}
function juntarDadosDanfce(xml, fallback) {
  const emitente = {
    nome: xml.emitente?.nome || fallback.emitente?.nome || "",
    cnpj: xml.emitente?.cnpj || fallback.emitente?.cnpj || "",
    ie: xml.emitente?.ie || fallback.emitente?.ie,
    logradouro: xml.emitente?.logradouro || fallback.emitente?.logradouro,
    numero: xml.emitente?.numero || fallback.emitente?.numero,
    bairro: xml.emitente?.bairro || fallback.emitente?.bairro,
    municipio: xml.emitente?.municipio || fallback.emitente?.municipio,
    uf: xml.emitente?.uf || fallback.emitente?.uf,
    fone: xml.emitente?.fone || fallback.emitente?.fone,
    crt: xml.emitente?.crt ?? fallback.emitente?.crt
  };
  const itens = xml.itens?.length ? xml.itens : fallback.itens ?? [];
  const pagamentos = xml.pagamentos?.length ? xml.pagamentos : fallback.pagamentos ?? [];
  const homologacao = xml.homologacao ?? fallback.homologacao ?? false;
  const chave = xml.chave || fallback.chave;
  const qrcode2 = corrigirQrCodeNfce({
    qrcode: xml.qrcode || fallback.qrcode,
    uf: emitente.uf,
    chave,
    homologacao
  });
  return {
    emitente,
    homologacao,
    contingencia: xml.contingencia ?? fallback.contingencia ?? false,
    pendenteAutorizacao: xml.protocolo || fallback.protocolo ? false : xml.pendenteAutorizacao ?? fallback.pendenteAutorizacao ?? false,
    itens,
    valorProdutos: xml.valorProdutos ?? fallback.valorProdutos ?? 0,
    desconto: xml.desconto ?? fallback.desconto ?? 0,
    frete: xml.frete ?? fallback.frete ?? 0,
    valorPagar: xml.valorPagar ?? fallback.valorPagar ?? 0,
    pagamentos,
    troco: xml.troco || fallback.troco || 0,
    urlChave: resolverUrlConsultaNfce({
      uf: emitente.uf,
      chave,
      homologacao,
      urlXml: xml.urlChave || fallback.urlChave
    }),
    chave,
    consumidor: xml.consumidor?.documento || xml.consumidor?.nome ? xml.consumidor : fallback.consumidor,
    numero: xml.numero || fallback.numero || 0,
    serie: xml.serie || fallback.serie || 0,
    dhEmi: xml.dhEmi || fallback.dhEmi,
    protocolo: xml.protocolo || fallback.protocolo,
    dhAutorizacao: xml.dhAutorizacao || fallback.dhAutorizacao,
    qrcode: qrcode2,
    vTotTrib: xml.vTotTrib ?? fallback.vTotTrib ?? null,
    infCpl: xml.infCpl || fallback.infCpl
  };
}
function escapeHtml$1(valor) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function linhaValor(label, valor, destaque = false) {
  const cls = destaque ? ' class="pagar"' : "";
  return `<div class="row"${cls}><span>${escapeHtml$1(label)}</span><span>${escapeHtml$1(valor)}</span></div>`;
}
function enderecoEmitente(emitente) {
  return [
    [emitente.logradouro, emitente.numero].filter(Boolean).join(", "),
    emitente.bairro,
    [emitente.municipio, emitente.uf].filter(Boolean).join("-")
  ].map((p) => p?.trim()).filter(Boolean).join(", ");
}
function consumidorHtml(dados) {
  const c = dados.consumidor;
  if (!c?.documento && !c?.nome) {
    return "CONSUMIDOR NAO IDENTIFICADO";
  }
  if (c.tipo === "cnpj" && c.documento) {
    const nome = c.nome ? ` - ${c.nome}` : "";
    return `CONSUMIDOR - CNPJ ${formatarCnpjDanfce(c.documento)}${nome}`;
  }
  if (c.tipo === "cpf" && c.documento) {
    const nome = c.nome ? ` - ${c.nome}` : "";
    return `CONSUMIDOR - CPF ${formatarCpfDanfce(c.documento)}${nome}`;
  }
  return c.nome ? `CONSUMIDOR - ${c.nome}` : "CONSUMIDOR NAO IDENTIFICADO";
}
function montarHtmlDanfce(dados, qrSvg) {
  const emit = dados.emitente;
  const ie = emit.ie ? ` | IE: ${emit.ie}` : "";
  const trib = dados.vTotTrib != null && dados.vTotTrib > 0 ? formatarMoedaDanfce(dados.vTotTrib) : "------";
  const numero2 = String(dados.numero || 0).padStart(9, "0");
  const serie = String(dados.serie || 0).padStart(3, "0");
  const dhEmi = dados.dhEmi ? ` ${formatarDataHoraDanfce(dados.dhEmi)}` : "";
  const infCpl = (dados.infCpl ?? "").split(";").map((t) => t.trim()).filter(Boolean).map((t) => `<div>${escapeHtml$1(t)}</div>`).join("");
  const itens = dados.itens.map((item) => {
    const valores = `${formatarQtdeDanfce(item.quantidade)} ${(item.unidade || "UN").slice(0, 4)} ${formatarMoedaDanfce(item.unitario)} ${formatarMoedaDanfce(item.total)}`;
    return `<div class="item"><div>${escapeHtml$1(item.codigo)} ${escapeHtml$1(item.descricao)}</div><div class="row"><span></span><span>${escapeHtml$1(valores)}</span></div></div>`;
  }).join("");
  const pags = dados.pagamentos.map((p) => linhaValor(p.tipo, formatarMoedaDanfce(p.valor))).join("");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: 80mm auto; margin: 2mm; }
  html, body {
    margin: 0; padding: 0; width: 76mm;
    background: #fff; color: #000;
  }
  .danfce {
    font-family: "Courier New", Courier, monospace;
    font-size: 10pt; line-height: 1.25;
    width: 76mm;
  }
  .center { text-align: center; }
  .nome { font-weight: 700; font-size: 11pt; }
  .dash {
    border: 0; border-top: 1px dashed #000;
    margin: 4px 0;
  }
  .row {
    display: flex; justify-content: space-between; gap: 6px;
  }
  .pagar { font-weight: 700; font-size: 11pt; }
  .item { margin-bottom: 2px; }
  .qr { display: block; width: 42mm; height: 42mm; margin: 6px auto; }
  .cab { font-weight: 700; }
</style>
</head>
<body>
<div class="danfce">
  <div class="center">
    <div class="nome">${escapeHtml$1(emit.nome || "EMITENTE")}</div>
    <div>CNPJ: ${escapeHtml$1(emit.cnpj ? formatarCnpjDanfce(emit.cnpj) : "—")}${escapeHtml$1(ie)}</div>
    ${enderecoEmitente(emit) ? `<div>${escapeHtml$1(enderecoEmitente(emit))}</div>` : ""}
    ${emit.fone ? `<div>Fone: ${escapeHtml$1(formatarFoneDanfce(emit.fone))}</div>` : ""}
  </div>
  <hr class="dash" />
  <div class="center">
    Documento Auxiliar da Nota Fiscal de Consumidor Eletronica<br/>
    Não permite aproveitamento de crédito de ICMS
    ${dados.contingencia ? "<br/><b>EMITIDA EM CONTINGÊNCIA</b>" : ""}
    ${dados.contingencia && dados.pendenteAutorizacao ? "<br/>Pendente de autorização" : ""}
    ${dados.homologacao ? "<br/><b>SEM VALOR FISCAL</b><br/>Emitida em ambiente de Homologacao" : ""}
  </div>
  <hr class="dash" />
  <div class="cab">Codigo Descricao Qtde UN Vl Unit Vl Total</div>
  ${itens}
  <hr class="dash" />
  ${linhaValor("Qtde total de itens", String(dados.itens.length))}
  ${linhaValor("Valor Total R$", formatarMoedaDanfce(dados.valorProdutos))}
  ${linhaValor("Desconto R$", formatarMoedaDanfce(dados.desconto))}
  ${linhaValor("Frete R$", formatarMoedaDanfce(dados.frete))}
  ${linhaValor("Valor a Pagar R$", formatarMoedaDanfce(dados.valorPagar), true)}
  <hr class="dash" />
  <div class="row cab"><span>FORMA PAGAMENTO</span><span>VALOR PAGO R$</span></div>
  ${pags}
  ${linhaValor("Troco R$", formatarMoedaDanfce(dados.troco))}
  <hr class="dash" />
  <div class="center">
    <b>Consulte pela Chave de Acesso em:</b><br/>
    ${dados.urlChave ? `${escapeHtml$1(dados.urlChave)}<br/>` : ""}
    ${dados.chave ? escapeHtml$1(formatarChaveDanfce(dados.chave)) : ""}
  </div>
  <hr class="dash" />
  <div class="center">
    ${escapeHtml$1(consumidorHtml(dados))}<br/>
    ${dados.consumidor?.endereco ? `${escapeHtml$1(dados.consumidor.endereco)}<br/>` : ""}
    <b>NFCe n. ${escapeHtml$1(numero2)} Série ${escapeHtml$1(serie)}${escapeHtml$1(dhEmi)}</b><br/>
    ${dados.protocolo ? `Protocolo de Autorização: ${escapeHtml$1(formatarProtocoloDanfce(dados.protocolo))}<br/>` : ""}
    ${dados.dhAutorizacao ? `Data de Autorização: ${escapeHtml$1(formatarDataHoraDanfce(dados.dhAutorizacao))}` : ""}
  </div>
  <hr class="dash" />
  ${qrSvg ? `<img class="qr" alt="QR Code NFC-e" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}" />` : ""}
  <div class="center">Tributos totais Incidentes (Lei Federal 12.741/2012): R$ ${escapeHtml$1(trib)}</div>
  ${infCpl}
</div>
</body>
</html>`;
}
function tag(xml, nome) {
  const re = new RegExp(
    `<(?:[\\w.]+:)?${nome}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</(?:[\\w.]+:)?${nome}>`,
    "i"
  );
  const valor = xml.match(re)?.[1]?.trim();
  return valor || null;
}
function bloco(xml, nome) {
  const re = new RegExp(
    `<(?:[\\w.]+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.]+:)?${nome}>`,
    "i"
  );
  return xml.match(re)?.[1] ?? null;
}
function blocos(xml, nome) {
  const re = new RegExp(
    `<(?:[\\w.]+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.]+:)?${nome}>`,
    "gi"
  );
  return [...xml.matchAll(re)].map((m) => m[1] ?? "");
}
function numeroXml(valor) {
  if (!valor) return 0;
  const n = Number.parseFloat(valor.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
const ROTULO_TPAG = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de Crédito",
  "04": "Cartão de Débito",
  "05": "Cartão da Loja/Outros Crediários",
  "10": "Vale Alimentação",
  "11": "Vale Refeição",
  "12": "Vale Presente",
  "13": "Vale Combustível",
  "15": "Boleto Bancário",
  "16": "Depósito Bancário",
  "17": "Pagamento Instantâneo (PIX) - Dinâmico",
  "18": "Transferência bancária, Carteira Digital",
  "19": "Programa fidelidade, Cashback, Créd Virt",
  "20": "Pagamento Instantâneo (PIX) - Estático",
  "21": "Crédito em Loja",
  "22": "Pagamento Eletrônico não Informado",
  "90": "Sem pagamento",
  "91": "Pagamento Posterior",
  "99": "Outros"
};
function rotuloFormaPagamentoNfce(tPag) {
  const codigo = String(tPag).replace(/\D/g, "").padStart(2, "0");
  const rotulo = ROTULO_TPAG[codigo] ?? `Outros (${codigo})`;
  return rotulo.toLocaleUpperCase("pt-BR");
}
function parseItens(xml) {
  return blocos(xml, "det").map((det) => {
    const prod = bloco(det, "prod") ?? det;
    return {
      codigo: tag(prod, "cProd") ?? "",
      descricao: tag(prod, "xProd") ?? "",
      quantidade: numeroXml(tag(prod, "qCom")),
      unidade: tag(prod, "uCom") ?? "UN",
      unitario: numeroXml(tag(prod, "vUnCom")),
      total: numeroXml(tag(prod, "vProd"))
    };
  });
}
function parsePagamentos(xml) {
  const dets = blocos(xml, "detPag");
  if (!dets.length) {
    const pag = bloco(xml, "pag");
    if (!pag) return [];
    const tPag = tag(pag, "tPag");
    const vPag = tag(pag, "vPag");
    if (!tPag) return [];
    return [
      {
        tipo: rotuloFormaPagamentoNfce(tPag),
        valor: numeroXml(vPag)
      }
    ];
  }
  return dets.map((det) => ({
    tipo: rotuloFormaPagamentoNfce(tag(det, "tPag") ?? "99"),
    valor: numeroXml(tag(det, "vPag"))
  }));
}
function parseConsumidor(xml) {
  const dest = bloco(xml, "dest");
  if (!dest) return void 0;
  const cnpj = tag(dest, "CNPJ");
  const cpf = tag(dest, "CPF");
  const nome = tag(dest, "xNome") ?? void 0;
  const ender = bloco(dest, "enderDest");
  const partes = ender ? [
    [tag(ender, "xLgr"), tag(ender, "nro")].filter(Boolean).join(", "),
    tag(ender, "xCpl"),
    tag(ender, "xBairro"),
    [tag(ender, "xMun"), tag(ender, "UF")].filter(Boolean).join("-")
  ].map((p) => p?.trim()).filter(Boolean) : [];
  return {
    ...cnpj ? { tipo: "cnpj", documento: cnpj } : cpf ? { tipo: "cpf", documento: cpf } : {},
    ...nome ? { nome } : {},
    ...partes.length ? { endereco: partes.join(" ") } : {}
  };
}
function parseEmitente(xml) {
  const emit = bloco(xml, "emit");
  if (!emit) return null;
  const ender = bloco(emit, "enderEmit") ?? "";
  const nome = tag(emit, "xNome") ?? tag(emit, "xFant");
  const cnpj = tag(emit, "CNPJ");
  if (!nome && !cnpj) return null;
  const crt = numeroXml(tag(emit, "CRT"));
  return {
    nome: nome ?? "",
    cnpj: cnpj ?? "",
    ...tag(emit, "IE") ? { ie: tag(emit, "IE") ?? void 0 } : {},
    ...tag(ender, "xLgr") ? { logradouro: tag(ender, "xLgr") ?? void 0 } : {},
    ...tag(ender, "nro") ? { numero: tag(ender, "nro") ?? void 0 } : {},
    ...tag(ender, "xBairro") ? { bairro: tag(ender, "xBairro") ?? void 0 } : {},
    ...tag(ender, "xMun") ? { municipio: tag(ender, "xMun") ?? void 0 } : {},
    ...tag(ender, "UF") ? { uf: tag(ender, "UF") ?? void 0 } : {},
    ...tag(ender, "fone") ? { fone: tag(ender, "fone") ?? void 0 } : {},
    ...crt > 0 ? { crt } : {}
  };
}
function chaveDoXml(xml) {
  const inf = xml.match(/\bId="NFe(\d{44})"/i)?.[1];
  if (inf) return inf;
  const chNFe = tag(xml, "chNFe");
  return chNFe?.replace(/\D/g, "") || void 0;
}
function parseXmlDanfce(xml) {
  if (!xml?.trim()) return {};
  const ide = bloco(xml, "ide") ?? xml;
  const icmsTot = bloco(xml, "ICMSTot") ?? "";
  const pag = bloco(xml, "pag") ?? "";
  const infProt = bloco(xml, "infProt");
  const emitente = parseEmitente(xml);
  const itens = parseItens(xml);
  const pagamentos = parsePagamentos(xml);
  const consumidor = parseConsumidor(xml);
  const vNF = numeroXml(tag(icmsTot, "vNF"));
  const vDesc = numeroXml(tag(icmsTot, "vDesc"));
  const vFrete = numeroXml(tag(icmsTot, "vFrete"));
  const vProd = numeroXml(tag(icmsTot, "vProd"));
  const vTotTribRaw = tag(icmsTot, "vTotTrib");
  const qrCode = tag(xml, "qrCode") ?? void 0;
  const urlChave = tag(xml, "urlChave") ?? void 0;
  const tpAmb = tag(ide, "tpAmb");
  const tpEmis = tag(ide, "tpEmis");
  const nNF = numeroXml(tag(ide, "nNF"));
  const serie = numeroXml(tag(ide, "serie"));
  const infCpl = tag(xml, "infCpl") ?? void 0;
  return {
    ...emitente ? { emitente } : {},
    ...tpAmb ? { homologacao: tpAmb === "2" } : {},
    ...tpEmis ? { contingencia: tpEmis === "9" } : {},
    ...infProt != null || tag(xml, "ide") ? { pendenteAutorizacao: !infProt } : {},
    ...itens.length ? { itens } : {},
    ...vProd > 0 || vNF > 0 ? { valorProdutos: vProd > 0 ? vProd : vNF + vDesc - vFrete } : {},
    ...icmsTot ? {
      desconto: vDesc,
      frete: vFrete,
      vTotTrib: vTotTribRaw != null ? numeroXml(vTotTribRaw) : null
    } : {},
    ...vNF > 0 ? { valorPagar: vNF } : {},
    ...pagamentos.length ? { pagamentos } : {},
    ...pag ? { troco: numeroXml(tag(pag, "vTroco")) } : {},
    ...urlChave ? { urlChave } : {},
    ...chaveDoXml(xml) ? { chave: chaveDoXml(xml) } : {},
    ...consumidor ? { consumidor } : {},
    ...nNF > 0 ? { numero: nNF } : {},
    ...serie > 0 ? { serie } : {},
    ...tag(ide, "dhEmi") ? { dhEmi: tag(ide, "dhEmi") ?? void 0 } : {},
    ...tag(infProt ?? "", "nProt") ? { protocolo: tag(infProt ?? "", "nProt") ?? void 0 } : {},
    ...tag(infProt ?? "", "dhRecbto") ? { dhAutorizacao: tag(infProt ?? "", "dhRecbto") ?? void 0 } : {},
    ...qrCode ? { qrcode: qrCode } : {},
    ...infCpl ? { infCpl } : {}
  };
}
function bytesQrEscpos(conteudo) {
  const content = node_buffer.Buffer.from(conteudo, "latin1");
  const storeLen = content.length + 3;
  const pL = storeLen & 255;
  const pH = storeLen >> 8 & 255;
  return node_buffer.Buffer.concat([
    node_buffer.Buffer.from([29, 40, 107, 4, 0, 49, 65, 50, 0]),
    node_buffer.Buffer.from([29, 40, 107, 3, 0, 49, 67, 6]),
    node_buffer.Buffer.from([29, 40, 107, 3, 0, 49, 69, 49]),
    node_buffer.Buffer.from([29, 40, 107, pL, pH, 49, 80, 48]),
    content,
    node_buffer.Buffer.from([29, 40, 107, 3, 0, 49, 81, 48])
  ]);
}
function normalizarHostPorta(hostRaw, portaRaw) {
  const trimmed = hostRaw.trim();
  const comPorta = trimmed.match(/^([^[\]]+):(\d+)$/);
  if (comPorta?.[1]) {
    return { host: comPorta[1], porta: Number(comPorta[2]) };
  }
  return {
    host: trimmed,
    porta: portaRaw && portaRaw > 0 ? portaRaw : 9100
  };
}
function chaveDestino(destino) {
  if (destino.tipo === "rede") {
    const { host, porta } = normalizarHostPorta(
      destino.host ?? "",
      destino.porta
    );
    return `rede:${host}:${porta}`;
  }
  if (destino.tipo === "arquivo") {
    return "arquivo";
  }
  return `sistema:${destino.nome?.trim() ?? ""}`;
}
function destinoPronto(destino) {
  if (destino.tipo === "rede") {
    return Boolean(destino.host?.trim());
  }
  if (destino.tipo === "arquivo") {
    return true;
  }
  return destino.tipo === "sistema";
}
function paraLatin1(texto) {
  const bytes = [...texto].map((c) => {
    const code = c.codePointAt(0) ?? 63;
    return code <= 255 ? code : 63;
  });
  return node_buffer.Buffer.from(bytes);
}
function montarEscpos(texto, qrcode2) {
  const init = node_buffer.Buffer.from([27, 64]);
  const codepage = node_buffer.Buffer.from([27, 116, 16]);
  const alignCenter = node_buffer.Buffer.from([27, 97, 1]);
  const alignLeft = node_buffer.Buffer.from([27, 97, 0]);
  const avanco = node_buffer.Buffer.from([27, 100, 4]);
  const corte = node_buffer.Buffer.from([29, 86, 65, 3]);
  const partes = [init, codepage];
  const qr = qrcode2?.trim() ?? "";
  const chunks = texto.split(MARCADOR_QR_DANFCE);
  chunks.forEach((chunk, idx) => {
    if (chunk) {
      partes.push(paraLatin1(chunk.replace(/\n/g, "\r\n")));
    }
    if (idx < chunks.length - 1 && qr) {
      partes.push(alignCenter, bytesQrEscpos(qr), alignLeft);
    }
  });
  partes.push(avanco, corte);
  return node_buffer.Buffer.concat(partes);
}
async function enviarRawTcp(host, porta, dados) {
  try {
    await new Promise((resolve, reject) => {
      let finalizado = false;
      const socket = net.connect({ host, port: porta });
      const finalizar = (err) => {
        if (finalizado) {
          return;
        }
        finalizado = true;
        clearTimeout(timer2);
        if (err) {
          socket.destroy();
          reject(err);
          return;
        }
        resolve();
      };
      const timer2 = setTimeout(() => {
        finalizar(new Error(`Timeout ao conectar em ${host}:${porta}`));
      }, 5e3);
      socket.once("connect", () => {
        socket.write(dados, (err) => {
          if (err) {
            finalizar(err);
            return;
          }
          socket.end(() => finalizar());
        });
      });
      socket.once("error", (err) => {
        finalizar(err instanceof Error ? err : new Error(String(err)));
      });
    });
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Não foi possível imprimir em ${host}:${porta}. ${detalhe}`
    );
  }
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function htmlCupomSimples(texto) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: 80mm auto; margin: 2mm; }
  html, body {
    margin: 0; padding: 0; width: 76mm;
    background: #fff; color: #000;
  }
  pre {
    margin: 0; padding: 0;
    font-family: "Courier New", Courier, monospace;
    font-size: 15pt; line-height: 1.3; font-weight: 600;
    white-space: pre-wrap; word-break: break-word;
  }
</style>
</head>
<body><pre>${escapeHtml(texto)}</pre></body>
</html>`;
}
async function enviarSpoolerWindows(html, deviceNamePreferido) {
  const win = new electron.BrowserWindow({
    show: false,
    webPreferences: { offscreen: true }
  });
  try {
    await win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    );
    const printers = await win.webContents.getPrintersAsync();
    const nome = deviceNamePreferido?.trim() || "";
    const deviceName = nome && printers.some((p) => p.name === nome) ? nome : nome || printers.find((p) => p.isDefault)?.name;
    await new Promise((resolve, reject) => {
      win.webContents.print(
        {
          silent: true,
          printBackground: false,
          deviceName,
          margins: { marginType: "none" },
          scaleFactor: 100,
          pageSize: { width: 8e4, height: 297e3 }
        },
        (success, failureReason) => {
          win.destroy();
          if (!success) {
            reject(new Error(failureReason || "Falha na impressão"));
            return;
          }
          resolve();
        }
      );
    });
    return { ok: true, modo: deviceName ? "sistema" : "padrao" };
  } catch (err) {
    try {
      win.destroy();
    } catch {
    }
    throw err;
  }
}
async function gravarBufferLocal(texto) {
  await execute(
    `INSERT INTO sync_meta (chave, valor, atualizadoem) VALUES ('ultimo_cupom', $1, $2)
		 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizadoem = excluded.atualizadoem`,
    [texto, (/* @__PURE__ */ new Date()).toISOString()]
  );
}
async function enviarParaDestino(params) {
  const { texto, html, destino, qrcode: qrcode2, estrito } = params;
  const textoArquivo = texto.replaceAll(
    MARCADOR_QR_DANFCE,
    qrcode2 ? "[QR CODE NFC-e]" : ""
  );
  if (destino.tipo === "arquivo") {
    await gravarBufferLocal(textoArquivo);
    return { ok: true, modo: "arquivo" };
  }
  if (!destinoPronto(destino)) {
    if (estrito) {
      throw new Error(
        destino.tipo === "rede" ? "Informe o IP da impressora de rede" : "Selecione a impressora"
      );
    }
    await gravarBufferLocal(textoArquivo);
    return { ok: true, modo: "buffer_local" };
  }
  if (destino.tipo === "rede") {
    const { host, porta } = normalizarHostPorta(
      destino.host ?? "",
      destino.porta
    );
    await enviarRawTcp(host, porta, montarEscpos(texto, qrcode2));
    return { ok: true, modo: "rede" };
  }
  try {
    return await enviarSpoolerWindows(html, destino.nome);
  } catch (err) {
    if (estrito) {
      throw err;
    }
    await gravarBufferLocal(textoArquivo);
    return { ok: true, modo: "buffer_local" };
  }
}
async function enviarTextoImpressora(texto, destino, opcoes) {
  return enviarParaDestino({
    texto,
    html: htmlCupomSimples(texto),
    destino,
    estrito: Boolean(opcoes?.estrito)
  });
}
async function enviarDanfceImpressora(params, destino, opcoes) {
  return enviarParaDestino({
    texto: params.texto,
    html: params.html,
    qrcode: params.qrcode,
    destino,
    estrito: Boolean(opcoes?.estrito)
  });
}
var qrcode = function() {
  var t = function(t2, r2) {
    var e2 = t2, n2 = g[r2], o2 = null, i2 = 0, a2 = null, u2 = [], f2 = {}, c2 = function(t3, r3) {
      o2 = function(t4) {
        for (var r4 = new Array(t4), e3 = 0; e3 < t4; e3 += 1) {
          r4[e3] = new Array(t4);
          for (var n3 = 0; n3 < t4; n3 += 1) r4[e3][n3] = null;
        }
        return r4;
      }(i2 = 4 * e2 + 17), l2(0, 0), l2(i2 - 7, 0), l2(0, i2 - 7), s2(), h2(), d2(t3, r3), e2 >= 7 && v2(t3), null == a2 && (a2 = p2(e2, n2, u2)), w2(a2, r3);
    }, l2 = function(t3, r3) {
      for (var e3 = -1; e3 <= 7; e3 += 1) if (!(t3 + e3 <= -1 || i2 <= t3 + e3)) for (var n3 = -1; n3 <= 7; n3 += 1) r3 + n3 <= -1 || i2 <= r3 + n3 || (o2[t3 + e3][r3 + n3] = 0 <= e3 && e3 <= 6 && (0 == n3 || 6 == n3) || 0 <= n3 && n3 <= 6 && (0 == e3 || 6 == e3) || 2 <= e3 && e3 <= 4 && 2 <= n3 && n3 <= 4);
    }, h2 = function() {
      for (var t3 = 8; t3 < i2 - 8; t3 += 1) null == o2[t3][6] && (o2[t3][6] = t3 % 2 == 0);
      for (var r3 = 8; r3 < i2 - 8; r3 += 1) null == o2[6][r3] && (o2[6][r3] = r3 % 2 == 0);
    }, s2 = function() {
      for (var t3 = B.getPatternPosition(e2), r3 = 0; r3 < t3.length; r3 += 1) for (var n3 = 0; n3 < t3.length; n3 += 1) {
        var i3 = t3[r3], a3 = t3[n3];
        if (null == o2[i3][a3]) for (var u3 = -2; u3 <= 2; u3 += 1) for (var f3 = -2; f3 <= 2; f3 += 1) o2[i3 + u3][a3 + f3] = -2 == u3 || 2 == u3 || -2 == f3 || 2 == f3 || 0 == u3 && 0 == f3;
      }
    }, v2 = function(t3) {
      for (var r3 = B.getBCHTypeNumber(e2), n3 = 0; n3 < 18; n3 += 1) {
        var a3 = !t3 && 1 == (r3 >> n3 & 1);
        o2[Math.floor(n3 / 3)][n3 % 3 + i2 - 8 - 3] = a3;
      }
      for (n3 = 0; n3 < 18; n3 += 1) {
        a3 = !t3 && 1 == (r3 >> n3 & 1);
        o2[n3 % 3 + i2 - 8 - 3][Math.floor(n3 / 3)] = a3;
      }
    }, d2 = function(t3, r3) {
      for (var e3 = n2 << 3 | r3, a3 = B.getBCHTypeInfo(e3), u3 = 0; u3 < 15; u3 += 1) {
        var f3 = !t3 && 1 == (a3 >> u3 & 1);
        u3 < 6 ? o2[u3][8] = f3 : u3 < 8 ? o2[u3 + 1][8] = f3 : o2[i2 - 15 + u3][8] = f3;
      }
      for (u3 = 0; u3 < 15; u3 += 1) {
        f3 = !t3 && 1 == (a3 >> u3 & 1);
        u3 < 8 ? o2[8][i2 - u3 - 1] = f3 : u3 < 9 ? o2[8][15 - u3 - 1 + 1] = f3 : o2[8][15 - u3 - 1] = f3;
      }
      o2[i2 - 8][8] = !t3;
    }, w2 = function(t3, r3) {
      for (var e3 = -1, n3 = i2 - 1, a3 = 7, u3 = 0, f3 = B.getMaskFunction(r3), c3 = i2 - 1; c3 > 0; c3 -= 2) for (6 == c3 && (c3 -= 1); ; ) {
        for (var g2 = 0; g2 < 2; g2 += 1) if (null == o2[n3][c3 - g2]) {
          var l3 = false;
          u3 < t3.length && (l3 = 1 == (t3[u3] >>> a3 & 1)), f3(n3, c3 - g2) && (l3 = !l3), o2[n3][c3 - g2] = l3, -1 == (a3 -= 1) && (u3 += 1, a3 = 7);
        }
        if ((n3 += e3) < 0 || i2 <= n3) {
          n3 -= e3, e3 = -e3;
          break;
        }
      }
    }, p2 = function(t3, r3, e3) {
      for (var n3 = A.getRSBlocks(t3, r3), o3 = b(), i3 = 0; i3 < e3.length; i3 += 1) {
        var a3 = e3[i3];
        o3.put(a3.getMode(), 4), o3.put(a3.getLength(), B.getLengthInBits(a3.getMode(), t3)), a3.write(o3);
      }
      var u3 = 0;
      for (i3 = 0; i3 < n3.length; i3 += 1) u3 += n3[i3].dataCount;
      if (o3.getLengthInBits() > 8 * u3) throw "code length overflow. (" + o3.getLengthInBits() + ">" + 8 * u3 + ")";
      for (o3.getLengthInBits() + 4 <= 8 * u3 && o3.put(0, 4); o3.getLengthInBits() % 8 != 0; ) o3.putBit(false);
      for (; !(o3.getLengthInBits() >= 8 * u3 || (o3.put(236, 8), o3.getLengthInBits() >= 8 * u3)); ) o3.put(17, 8);
      return function(t4, r4) {
        for (var e4 = 0, n4 = 0, o4 = 0, i4 = new Array(r4.length), a4 = new Array(r4.length), u4 = 0; u4 < r4.length; u4 += 1) {
          var f3 = r4[u4].dataCount, c3 = r4[u4].totalCount - f3;
          n4 = Math.max(n4, f3), o4 = Math.max(o4, c3), i4[u4] = new Array(f3);
          for (var g2 = 0; g2 < i4[u4].length; g2 += 1) i4[u4][g2] = 255 & t4.getBuffer()[g2 + e4];
          e4 += f3;
          var l3 = B.getErrorCorrectPolynomial(c3), h3 = k(i4[u4], l3.getLength() - 1).mod(l3);
          for (a4[u4] = new Array(l3.getLength() - 1), g2 = 0; g2 < a4[u4].length; g2 += 1) {
            var s3 = g2 + h3.getLength() - a4[u4].length;
            a4[u4][g2] = s3 >= 0 ? h3.getAt(s3) : 0;
          }
        }
        var v3 = 0;
        for (g2 = 0; g2 < r4.length; g2 += 1) v3 += r4[g2].totalCount;
        var d3 = new Array(v3), w3 = 0;
        for (g2 = 0; g2 < n4; g2 += 1) for (u4 = 0; u4 < r4.length; u4 += 1) g2 < i4[u4].length && (d3[w3] = i4[u4][g2], w3 += 1);
        for (g2 = 0; g2 < o4; g2 += 1) for (u4 = 0; u4 < r4.length; u4 += 1) g2 < a4[u4].length && (d3[w3] = a4[u4][g2], w3 += 1);
        return d3;
      }(o3, n3);
    };
    f2.addData = function(t3, r3) {
      var e3 = null;
      switch (r3 = r3 || "Byte") {
        case "Numeric":
          e3 = M(t3);
          break;
        case "Alphanumeric":
          e3 = x(t3);
          break;
        case "Byte":
          e3 = m(t3);
          break;
        case "Kanji":
          e3 = L(t3);
          break;
        default:
          throw "mode:" + r3;
      }
      u2.push(e3), a2 = null;
    }, f2.isDark = function(t3, r3) {
      if (t3 < 0 || i2 <= t3 || r3 < 0 || i2 <= r3) throw t3 + "," + r3;
      return o2[t3][r3];
    }, f2.getModuleCount = function() {
      return i2;
    }, f2.make = function() {
      if (e2 < 1) {
        for (var t3 = 1; t3 < 40; t3++) {
          for (var r3 = A.getRSBlocks(t3, n2), o3 = b(), i3 = 0; i3 < u2.length; i3++) {
            var a3 = u2[i3];
            o3.put(a3.getMode(), 4), o3.put(a3.getLength(), B.getLengthInBits(a3.getMode(), t3)), a3.write(o3);
          }
          var g2 = 0;
          for (i3 = 0; i3 < r3.length; i3++) g2 += r3[i3].dataCount;
          if (o3.getLengthInBits() <= 8 * g2) break;
        }
        e2 = t3;
      }
      c2(false, function() {
        for (var t4 = 0, r4 = 0, e3 = 0; e3 < 8; e3 += 1) {
          c2(true, e3);
          var n3 = B.getLostPoint(f2);
          (0 == e3 || t4 > n3) && (t4 = n3, r4 = e3);
        }
        return r4;
      }());
    }, f2.createTableTag = function(t3, r3) {
      t3 = t3 || 2;
      var e3 = "";
      e3 += '<table style="', e3 += " border-width: 0px; border-style: none;", e3 += " border-collapse: collapse;", e3 += " padding: 0px; margin: " + (r3 = void 0 === r3 ? 4 * t3 : r3) + "px;", e3 += '">', e3 += "<tbody>";
      for (var n3 = 0; n3 < f2.getModuleCount(); n3 += 1) {
        e3 += "<tr>";
        for (var o3 = 0; o3 < f2.getModuleCount(); o3 += 1) e3 += '<td style="', e3 += " border-width: 0px; border-style: none;", e3 += " border-collapse: collapse;", e3 += " padding: 0px; margin: 0px;", e3 += " width: " + t3 + "px;", e3 += " height: " + t3 + "px;", e3 += " background-color: ", e3 += f2.isDark(n3, o3) ? "#000000" : "#ffffff", e3 += ";", e3 += '"/>';
        e3 += "</tr>";
      }
      return e3 += "</tbody>", e3 += "</table>";
    }, f2.createSvgTag = function(t3, r3, e3, n3) {
      var o3 = {};
      "object" == typeof arguments[0] && (t3 = (o3 = arguments[0]).cellSize, r3 = o3.margin, e3 = o3.alt, n3 = o3.title), t3 = t3 || 2, r3 = void 0 === r3 ? 4 * t3 : r3, (e3 = "string" == typeof e3 ? { text: e3 } : e3 || {}).text = e3.text || null, e3.id = e3.text ? e3.id || "qrcode-description" : null, (n3 = "string" == typeof n3 ? { text: n3 } : n3 || {}).text = n3.text || null, n3.id = n3.text ? n3.id || "qrcode-title" : null;
      var i3, a3, u3, c3, g2 = f2.getModuleCount() * t3 + 2 * r3, l3 = "";
      for (c3 = "l" + t3 + ",0 0," + t3 + " -" + t3 + ",0 0,-" + t3 + "z ", l3 += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"', l3 += o3.scalable ? "" : ' width="' + g2 + 'px" height="' + g2 + 'px"', l3 += ' viewBox="0 0 ' + g2 + " " + g2 + '" ', l3 += ' preserveAspectRatio="xMinYMin meet"', l3 += n3.text || e3.text ? ' role="img" aria-labelledby="' + y2([n3.id, e3.id].join(" ").trim()) + '"' : "", l3 += ">", l3 += n3.text ? '<title id="' + y2(n3.id) + '">' + y2(n3.text) + "</title>" : "", l3 += e3.text ? '<description id="' + y2(e3.id) + '">' + y2(e3.text) + "</description>" : "", l3 += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>', l3 += '<path d="', a3 = 0; a3 < f2.getModuleCount(); a3 += 1) for (u3 = a3 * t3 + r3, i3 = 0; i3 < f2.getModuleCount(); i3 += 1) f2.isDark(a3, i3) && (l3 += "M" + (i3 * t3 + r3) + "," + u3 + c3);
      return l3 += '" stroke="transparent" fill="black"/>', l3 += "</svg>";
    }, f2.createDataURL = function(t3, r3) {
      t3 = t3 || 2, r3 = void 0 === r3 ? 4 * t3 : r3;
      var e3 = f2.getModuleCount() * t3 + 2 * r3, n3 = r3, o3 = e3 - r3;
      return I(e3, e3, function(r4, e4) {
        if (n3 <= r4 && r4 < o3 && n3 <= e4 && e4 < o3) {
          var i3 = Math.floor((r4 - n3) / t3), a3 = Math.floor((e4 - n3) / t3);
          return f2.isDark(a3, i3) ? 0 : 1;
        }
        return 1;
      });
    }, f2.createImgTag = function(t3, r3, e3) {
      t3 = t3 || 2, r3 = void 0 === r3 ? 4 * t3 : r3;
      var n3 = f2.getModuleCount() * t3 + 2 * r3, o3 = "";
      return o3 += "<img", o3 += ' src="', o3 += f2.createDataURL(t3, r3), o3 += '"', o3 += ' width="', o3 += n3, o3 += '"', o3 += ' height="', o3 += n3, o3 += '"', e3 && (o3 += ' alt="', o3 += y2(e3), o3 += '"'), o3 += "/>";
    };
    var y2 = function(t3) {
      for (var r3 = "", e3 = 0; e3 < t3.length; e3 += 1) {
        var n3 = t3.charAt(e3);
        switch (n3) {
          case "<":
            r3 += "&lt;";
            break;
          case ">":
            r3 += "&gt;";
            break;
          case "&":
            r3 += "&amp;";
            break;
          case '"':
            r3 += "&quot;";
            break;
          default:
            r3 += n3;
        }
      }
      return r3;
    };
    return f2.createASCII = function(t3, r3) {
      if ((t3 = t3 || 1) < 2) return function(t4) {
        t4 = void 0 === t4 ? 2 : t4;
        var r4, e4, n4, o4, i4, a4 = 1 * f2.getModuleCount() + 2 * t4, u4 = t4, c4 = a4 - t4, g3 = { "██": "█", "█ ": "▀", " █": "▄", "  ": " " }, l4 = { "██": "▀", "█ ": "▀", " █": " ", "  ": " " }, h4 = "";
        for (r4 = 0; r4 < a4; r4 += 2) {
          for (n4 = Math.floor((r4 - u4) / 1), o4 = Math.floor((r4 + 1 - u4) / 1), e4 = 0; e4 < a4; e4 += 1) i4 = "█", u4 <= e4 && e4 < c4 && u4 <= r4 && r4 < c4 && f2.isDark(n4, Math.floor((e4 - u4) / 1)) && (i4 = " "), u4 <= e4 && e4 < c4 && u4 <= r4 + 1 && r4 + 1 < c4 && f2.isDark(o4, Math.floor((e4 - u4) / 1)) ? i4 += " " : i4 += "█", h4 += t4 < 1 && r4 + 1 >= c4 ? l4[i4] : g3[i4];
          h4 += "\n";
        }
        return a4 % 2 && t4 > 0 ? h4.substring(0, h4.length - a4 - 1) + Array(a4 + 1).join("▀") : h4.substring(0, h4.length - 1);
      }(r3);
      t3 -= 1, r3 = void 0 === r3 ? 2 * t3 : r3;
      var e3, n3, o3, i3, a3 = f2.getModuleCount() * t3 + 2 * r3, u3 = r3, c3 = a3 - r3, g2 = Array(t3 + 1).join("██"), l3 = Array(t3 + 1).join("  "), h3 = "", s3 = "";
      for (e3 = 0; e3 < a3; e3 += 1) {
        for (o3 = Math.floor((e3 - u3) / t3), s3 = "", n3 = 0; n3 < a3; n3 += 1) i3 = 1, u3 <= n3 && n3 < c3 && u3 <= e3 && e3 < c3 && f2.isDark(o3, Math.floor((n3 - u3) / t3)) && (i3 = 0), s3 += i3 ? g2 : l3;
        for (o3 = 0; o3 < t3; o3 += 1) h3 += s3 + "\n";
      }
      return h3.substring(0, h3.length - 1);
    }, f2.renderTo2dContext = function(t3, r3) {
      r3 = r3 || 2;
      for (var e3 = f2.getModuleCount(), n3 = 0; n3 < e3; n3++) for (var o3 = 0; o3 < e3; o3++) t3.fillStyle = f2.isDark(n3, o3) ? "black" : "white", t3.fillRect(n3 * r3, o3 * r3, r3, r3);
    }, f2;
  };
  t.stringToBytes = (t.stringToBytesFuncs = { default: function(t2) {
    for (var r2 = [], e2 = 0; e2 < t2.length; e2 += 1) {
      var n2 = t2.charCodeAt(e2);
      r2.push(255 & n2);
    }
    return r2;
  } }).default, t.createStringToBytes = function(t2, r2) {
    var e2 = function() {
      for (var e3 = S(t2), n3 = function() {
        var t3 = e3.read();
        if (-1 == t3) throw "eof";
        return t3;
      }, o2 = 0, i2 = {}; ; ) {
        var a2 = e3.read();
        if (-1 == a2) break;
        var u2 = n3(), f2 = n3() << 8 | n3();
        i2[String.fromCharCode(a2 << 8 | u2)] = f2, o2 += 1;
      }
      if (o2 != r2) throw o2 + " != " + r2;
      return i2;
    }(), n2 = "?".charCodeAt(0);
    return function(t3) {
      for (var r3 = [], o2 = 0; o2 < t3.length; o2 += 1) {
        var i2 = t3.charCodeAt(o2);
        if (i2 < 128) r3.push(i2);
        else {
          var a2 = e2[t3.charAt(o2)];
          "number" == typeof a2 ? (255 & a2) == a2 ? r3.push(a2) : (r3.push(a2 >>> 8), r3.push(255 & a2)) : r3.push(n2);
        }
      }
      return r3;
    };
  };
  var r, e, n, o, i, a = 1, u = 2, f = 4, c = 8, g = { L: 1, M: 0, Q: 3, H: 2 }, l = 0, h = 1, s = 2, v = 3, d = 4, w = 5, p = 6, y = 7, B = (r = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]], e = 1335, n = 7973, i = function(t2) {
    for (var r2 = 0; 0 != t2; ) r2 += 1, t2 >>>= 1;
    return r2;
  }, (o = {}).getBCHTypeInfo = function(t2) {
    for (var r2 = t2 << 10; i(r2) - i(e) >= 0; ) r2 ^= e << i(r2) - i(e);
    return 21522 ^ (t2 << 10 | r2);
  }, o.getBCHTypeNumber = function(t2) {
    for (var r2 = t2 << 12; i(r2) - i(n) >= 0; ) r2 ^= n << i(r2) - i(n);
    return t2 << 12 | r2;
  }, o.getPatternPosition = function(t2) {
    return r[t2 - 1];
  }, o.getMaskFunction = function(t2) {
    switch (t2) {
      case l:
        return function(t3, r2) {
          return (t3 + r2) % 2 == 0;
        };
      case h:
        return function(t3, r2) {
          return t3 % 2 == 0;
        };
      case s:
        return function(t3, r2) {
          return r2 % 3 == 0;
        };
      case v:
        return function(t3, r2) {
          return (t3 + r2) % 3 == 0;
        };
      case d:
        return function(t3, r2) {
          return (Math.floor(t3 / 2) + Math.floor(r2 / 3)) % 2 == 0;
        };
      case w:
        return function(t3, r2) {
          return t3 * r2 % 2 + t3 * r2 % 3 == 0;
        };
      case p:
        return function(t3, r2) {
          return (t3 * r2 % 2 + t3 * r2 % 3) % 2 == 0;
        };
      case y:
        return function(t3, r2) {
          return (t3 * r2 % 3 + (t3 + r2) % 2) % 2 == 0;
        };
      default:
        throw "bad maskPattern:" + t2;
    }
  }, o.getErrorCorrectPolynomial = function(t2) {
    for (var r2 = k([1], 0), e2 = 0; e2 < t2; e2 += 1) r2 = r2.multiply(k([1, C.gexp(e2)], 0));
    return r2;
  }, o.getLengthInBits = function(t2, r2) {
    if (1 <= r2 && r2 < 10) switch (t2) {
      case a:
        return 10;
      case u:
        return 9;
      case f:
      case c:
        return 8;
      default:
        throw "mode:" + t2;
    }
    else if (r2 < 27) switch (t2) {
      case a:
        return 12;
      case u:
        return 11;
      case f:
        return 16;
      case c:
        return 10;
      default:
        throw "mode:" + t2;
    }
    else {
      if (!(r2 < 41)) throw "type:" + r2;
      switch (t2) {
        case a:
          return 14;
        case u:
          return 13;
        case f:
          return 16;
        case c:
          return 12;
        default:
          throw "mode:" + t2;
      }
    }
  }, o.getLostPoint = function(t2) {
    for (var r2 = t2.getModuleCount(), e2 = 0, n2 = 0; n2 < r2; n2 += 1) for (var o2 = 0; o2 < r2; o2 += 1) {
      for (var i2 = 0, a2 = t2.isDark(n2, o2), u2 = -1; u2 <= 1; u2 += 1) if (!(n2 + u2 < 0 || r2 <= n2 + u2)) for (var f2 = -1; f2 <= 1; f2 += 1) o2 + f2 < 0 || r2 <= o2 + f2 || 0 == u2 && 0 == f2 || a2 == t2.isDark(n2 + u2, o2 + f2) && (i2 += 1);
      i2 > 5 && (e2 += 3 + i2 - 5);
    }
    for (n2 = 0; n2 < r2 - 1; n2 += 1) for (o2 = 0; o2 < r2 - 1; o2 += 1) {
      var c2 = 0;
      t2.isDark(n2, o2) && (c2 += 1), t2.isDark(n2 + 1, o2) && (c2 += 1), t2.isDark(n2, o2 + 1) && (c2 += 1), t2.isDark(n2 + 1, o2 + 1) && (c2 += 1), 0 != c2 && 4 != c2 || (e2 += 3);
    }
    for (n2 = 0; n2 < r2; n2 += 1) for (o2 = 0; o2 < r2 - 6; o2 += 1) t2.isDark(n2, o2) && !t2.isDark(n2, o2 + 1) && t2.isDark(n2, o2 + 2) && t2.isDark(n2, o2 + 3) && t2.isDark(n2, o2 + 4) && !t2.isDark(n2, o2 + 5) && t2.isDark(n2, o2 + 6) && (e2 += 40);
    for (o2 = 0; o2 < r2; o2 += 1) for (n2 = 0; n2 < r2 - 6; n2 += 1) t2.isDark(n2, o2) && !t2.isDark(n2 + 1, o2) && t2.isDark(n2 + 2, o2) && t2.isDark(n2 + 3, o2) && t2.isDark(n2 + 4, o2) && !t2.isDark(n2 + 5, o2) && t2.isDark(n2 + 6, o2) && (e2 += 40);
    var g2 = 0;
    for (o2 = 0; o2 < r2; o2 += 1) for (n2 = 0; n2 < r2; n2 += 1) t2.isDark(n2, o2) && (g2 += 1);
    return e2 += Math.abs(100 * g2 / r2 / r2 - 50) / 5 * 10;
  }, o), C = function() {
    for (var t2 = new Array(256), r2 = new Array(256), e2 = 0; e2 < 8; e2 += 1) t2[e2] = 1 << e2;
    for (e2 = 8; e2 < 256; e2 += 1) t2[e2] = t2[e2 - 4] ^ t2[e2 - 5] ^ t2[e2 - 6] ^ t2[e2 - 8];
    for (e2 = 0; e2 < 255; e2 += 1) r2[t2[e2]] = e2;
    var n2 = { glog: function(t3) {
      if (t3 < 1) throw "glog(" + t3 + ")";
      return r2[t3];
    }, gexp: function(r3) {
      for (; r3 < 0; ) r3 += 255;
      for (; r3 >= 256; ) r3 -= 255;
      return t2[r3];
    } };
    return n2;
  }();
  function k(t2, r2) {
    if (void 0 === t2.length) throw t2.length + "/" + r2;
    var e2 = function() {
      for (var e3 = 0; e3 < t2.length && 0 == t2[e3]; ) e3 += 1;
      for (var n3 = new Array(t2.length - e3 + r2), o2 = 0; o2 < t2.length - e3; o2 += 1) n3[o2] = t2[o2 + e3];
      return n3;
    }(), n2 = { getAt: function(t3) {
      return e2[t3];
    }, getLength: function() {
      return e2.length;
    }, multiply: function(t3) {
      for (var r3 = new Array(n2.getLength() + t3.getLength() - 1), e3 = 0; e3 < n2.getLength(); e3 += 1) for (var o2 = 0; o2 < t3.getLength(); o2 += 1) r3[e3 + o2] ^= C.gexp(C.glog(n2.getAt(e3)) + C.glog(t3.getAt(o2)));
      return k(r3, 0);
    }, mod: function(t3) {
      if (n2.getLength() - t3.getLength() < 0) return n2;
      for (var r3 = C.glog(n2.getAt(0)) - C.glog(t3.getAt(0)), e3 = new Array(n2.getLength()), o2 = 0; o2 < n2.getLength(); o2 += 1) e3[o2] = n2.getAt(o2);
      for (o2 = 0; o2 < t3.getLength(); o2 += 1) e3[o2] ^= C.gexp(C.glog(t3.getAt(o2)) + r3);
      return k(e3, 0).mod(t3);
    } };
    return n2;
  }
  var A = function() {
    var t2 = [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9], [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16], [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13], [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9], [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12], [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15], [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14], [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15], [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13], [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16], [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13], [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15], [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12], [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13], [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13], [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16], [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15], [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15], [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14], [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16], [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17], [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13], [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16], [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17], [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16], [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17], [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16], [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16], [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16], [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16], [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16], [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16], [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16], [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17], [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16], [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16], [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16], [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16], [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16], [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]], r2 = function(t3, r3) {
      var e3 = {};
      return e3.totalCount = t3, e3.dataCount = r3, e3;
    }, e2 = {};
    return e2.getRSBlocks = function(e3, n2) {
      var o2 = function(r3, e4) {
        switch (e4) {
          case g.L:
            return t2[4 * (r3 - 1) + 0];
          case g.M:
            return t2[4 * (r3 - 1) + 1];
          case g.Q:
            return t2[4 * (r3 - 1) + 2];
          case g.H:
            return t2[4 * (r3 - 1) + 3];
          default:
            return;
        }
      }(e3, n2);
      if (void 0 === o2) throw "bad rs block @ typeNumber:" + e3 + "/errorCorrectionLevel:" + n2;
      for (var i2 = o2.length / 3, a2 = [], u2 = 0; u2 < i2; u2 += 1) for (var f2 = o2[3 * u2 + 0], c2 = o2[3 * u2 + 1], l2 = o2[3 * u2 + 2], h2 = 0; h2 < f2; h2 += 1) a2.push(r2(c2, l2));
      return a2;
    }, e2;
  }(), b = function() {
    var t2 = [], r2 = 0, e2 = { getBuffer: function() {
      return t2;
    }, getAt: function(r3) {
      var e3 = Math.floor(r3 / 8);
      return 1 == (t2[e3] >>> 7 - r3 % 8 & 1);
    }, put: function(t3, r3) {
      for (var n2 = 0; n2 < r3; n2 += 1) e2.putBit(1 == (t3 >>> r3 - n2 - 1 & 1));
    }, getLengthInBits: function() {
      return r2;
    }, putBit: function(e3) {
      var n2 = Math.floor(r2 / 8);
      t2.length <= n2 && t2.push(0), e3 && (t2[n2] |= 128 >>> r2 % 8), r2 += 1;
    } };
    return e2;
  }, M = function(t2) {
    var r2 = a, e2 = t2, n2 = { getMode: function() {
      return r2;
    }, getLength: function(t3) {
      return e2.length;
    }, write: function(t3) {
      for (var r3 = e2, n3 = 0; n3 + 2 < r3.length; ) t3.put(o2(r3.substring(n3, n3 + 3)), 10), n3 += 3;
      n3 < r3.length && (r3.length - n3 == 1 ? t3.put(o2(r3.substring(n3, n3 + 1)), 4) : r3.length - n3 == 2 && t3.put(o2(r3.substring(n3, n3 + 2)), 7));
    } }, o2 = function(t3) {
      for (var r3 = 0, e3 = 0; e3 < t3.length; e3 += 1) r3 = 10 * r3 + i2(t3.charAt(e3));
      return r3;
    }, i2 = function(t3) {
      if ("0" <= t3 && t3 <= "9") return t3.charCodeAt(0) - "0".charCodeAt(0);
      throw "illegal char :" + t3;
    };
    return n2;
  }, x = function(t2) {
    var r2 = u, e2 = t2, n2 = { getMode: function() {
      return r2;
    }, getLength: function(t3) {
      return e2.length;
    }, write: function(t3) {
      for (var r3 = e2, n3 = 0; n3 + 1 < r3.length; ) t3.put(45 * o2(r3.charAt(n3)) + o2(r3.charAt(n3 + 1)), 11), n3 += 2;
      n3 < r3.length && t3.put(o2(r3.charAt(n3)), 6);
    } }, o2 = function(t3) {
      if ("0" <= t3 && t3 <= "9") return t3.charCodeAt(0) - "0".charCodeAt(0);
      if ("A" <= t3 && t3 <= "Z") return t3.charCodeAt(0) - "A".charCodeAt(0) + 10;
      switch (t3) {
        case " ":
          return 36;
        case "$":
          return 37;
        case "%":
          return 38;
        case "*":
          return 39;
        case "+":
          return 40;
        case "-":
          return 41;
        case ".":
          return 42;
        case "/":
          return 43;
        case ":":
          return 44;
        default:
          throw "illegal char :" + t3;
      }
    };
    return n2;
  }, m = function(r2) {
    var e2 = f, n2 = t.stringToBytes(r2), o2 = { getMode: function() {
      return e2;
    }, getLength: function(t2) {
      return n2.length;
    }, write: function(t2) {
      for (var r3 = 0; r3 < n2.length; r3 += 1) t2.put(n2[r3], 8);
    } };
    return o2;
  }, L = function(r2) {
    var e2 = c, n2 = t.stringToBytesFuncs.SJIS;
    if (!n2) throw "sjis not supported.";
    !function() {
      var t2 = n2("友");
      if (2 != t2.length || 38726 != (t2[0] << 8 | t2[1])) throw "sjis not supported.";
    }();
    var o2 = n2(r2), i2 = { getMode: function() {
      return e2;
    }, getLength: function(t2) {
      return ~~(o2.length / 2);
    }, write: function(t2) {
      for (var r3 = o2, e3 = 0; e3 + 1 < r3.length; ) {
        var n3 = (255 & r3[e3]) << 8 | 255 & r3[e3 + 1];
        if (33088 <= n3 && n3 <= 40956) n3 -= 33088;
        else {
          if (!(57408 <= n3 && n3 <= 60351)) throw "illegal char at " + (e3 + 1) + "/" + n3;
          n3 -= 49472;
        }
        n3 = 192 * (n3 >>> 8 & 255) + (255 & n3), t2.put(n3, 13), e3 += 2;
      }
      if (e3 < r3.length) throw "illegal char at " + (e3 + 1);
    } };
    return i2;
  }, D = function() {
    var t2 = [], r2 = { writeByte: function(r3) {
      t2.push(255 & r3);
    }, writeShort: function(t3) {
      r2.writeByte(t3), r2.writeByte(t3 >>> 8);
    }, writeBytes: function(t3, e2, n2) {
      e2 = e2 || 0, n2 = n2 || t3.length;
      for (var o2 = 0; o2 < n2; o2 += 1) r2.writeByte(t3[o2 + e2]);
    }, writeString: function(t3) {
      for (var e2 = 0; e2 < t3.length; e2 += 1) r2.writeByte(t3.charCodeAt(e2));
    }, toByteArray: function() {
      return t2;
    }, toString: function() {
      var r3 = "";
      r3 += "[";
      for (var e2 = 0; e2 < t2.length; e2 += 1) e2 > 0 && (r3 += ","), r3 += t2[e2];
      return r3 += "]";
    } };
    return r2;
  }, S = function(t2) {
    var r2 = t2, e2 = 0, n2 = 0, o2 = 0, i2 = { read: function() {
      for (; o2 < 8; ) {
        if (e2 >= r2.length) {
          if (0 == o2) return -1;
          throw "unexpected end of file./" + o2;
        }
        var t3 = r2.charAt(e2);
        if (e2 += 1, "=" == t3) return o2 = 0, -1;
        t3.match(/^\s$/) || (n2 = n2 << 6 | a2(t3.charCodeAt(0)), o2 += 6);
      }
      var i3 = n2 >>> o2 - 8 & 255;
      return o2 -= 8, i3;
    } }, a2 = function(t3) {
      if (65 <= t3 && t3 <= 90) return t3 - 65;
      if (97 <= t3 && t3 <= 122) return t3 - 97 + 26;
      if (48 <= t3 && t3 <= 57) return t3 - 48 + 52;
      if (43 == t3) return 62;
      if (47 == t3) return 63;
      throw "c:" + t3;
    };
    return i2;
  }, I = function(t2, r2, e2) {
    for (var n2 = function(t3, r3) {
      var e3 = t3, n3 = r3, o3 = new Array(t3 * r3), i3 = { setPixel: function(t4, r4, n4) {
        o3[r4 * e3 + t4] = n4;
      }, write: function(t4) {
        t4.writeString("GIF87a"), t4.writeShort(e3), t4.writeShort(n3), t4.writeByte(128), t4.writeByte(0), t4.writeByte(0), t4.writeByte(0), t4.writeByte(0), t4.writeByte(0), t4.writeByte(255), t4.writeByte(255), t4.writeByte(255), t4.writeString(","), t4.writeShort(0), t4.writeShort(0), t4.writeShort(e3), t4.writeShort(n3), t4.writeByte(0);
        var r4 = a3(2);
        t4.writeByte(2);
        for (var o4 = 0; r4.length - o4 > 255; ) t4.writeByte(255), t4.writeBytes(r4, o4, 255), o4 += 255;
        t4.writeByte(r4.length - o4), t4.writeBytes(r4, o4, r4.length - o4), t4.writeByte(0), t4.writeString(";");
      } }, a3 = function(t4) {
        for (var r4 = 1 << t4, e4 = 1 + (1 << t4), n4 = t4 + 1, i4 = u3(), a4 = 0; a4 < r4; a4 += 1) i4.add(String.fromCharCode(a4));
        i4.add(String.fromCharCode(r4)), i4.add(String.fromCharCode(e4));
        var f3, c3, g2, l2 = D(), h2 = (f3 = l2, c3 = 0, g2 = 0, { write: function(t5, r5) {
          if (t5 >>> r5 != 0) throw "length over";
          for (; c3 + r5 >= 8; ) f3.writeByte(255 & (t5 << c3 | g2)), r5 -= 8 - c3, t5 >>>= 8 - c3, g2 = 0, c3 = 0;
          g2 |= t5 << c3, c3 += r5;
        }, flush: function() {
          c3 > 0 && f3.writeByte(g2);
        } });
        h2.write(r4, n4);
        var s2 = 0, v2 = String.fromCharCode(o3[s2]);
        for (s2 += 1; s2 < o3.length; ) {
          var d2 = String.fromCharCode(o3[s2]);
          s2 += 1, i4.contains(v2 + d2) ? v2 += d2 : (h2.write(i4.indexOf(v2), n4), i4.size() < 4095 && (i4.size() == 1 << n4 && (n4 += 1), i4.add(v2 + d2)), v2 = d2);
        }
        return h2.write(i4.indexOf(v2), n4), h2.write(e4, n4), h2.flush(), l2.toByteArray();
      }, u3 = function() {
        var t4 = {}, r4 = 0, e4 = { add: function(n4) {
          if (e4.contains(n4)) throw "dup key:" + n4;
          t4[n4] = r4, r4 += 1;
        }, size: function() {
          return r4;
        }, indexOf: function(r5) {
          return t4[r5];
        }, contains: function(r5) {
          return void 0 !== t4[r5];
        } };
        return e4;
      };
      return i3;
    }(t2, r2), o2 = 0; o2 < r2; o2 += 1) for (var i2 = 0; i2 < t2; i2 += 1) n2.setPixel(i2, o2, e2(i2, o2));
    var a2 = D();
    n2.write(a2);
    for (var u2 = function() {
      var t3 = 0, r3 = 0, e3 = 0, n3 = "", o3 = {}, i3 = function(t4) {
        n3 += String.fromCharCode(a3(63 & t4));
      }, a3 = function(t4) {
        if (t4 < 0) ;
        else {
          if (t4 < 26) return 65 + t4;
          if (t4 < 52) return t4 - 26 + 97;
          if (t4 < 62) return t4 - 52 + 48;
          if (62 == t4) return 43;
          if (63 == t4) return 47;
        }
        throw "n:" + t4;
      };
      return o3.writeByte = function(n4) {
        for (t3 = t3 << 8 | 255 & n4, r3 += 8, e3 += 1; r3 >= 6; ) i3(t3 >>> r3 - 6), r3 -= 6;
      }, o3.flush = function() {
        if (r3 > 0 && (i3(t3 << 6 - r3), t3 = 0, r3 = 0), e3 % 3 != 0) for (var o4 = 3 - e3 % 3, a4 = 0; a4 < o4; a4 += 1) n3 += "=";
      }, o3.toString = function() {
        return n3;
      }, o3;
    }(), f2 = a2.toByteArray(), c2 = 0; c2 < f2.length; c2 += 1) u2.writeByte(f2[c2]);
    return u2.flush(), "data:image/gif;base64," + u2;
  };
  return t;
}();
qrcode.stringToBytesFuncs["UTF-8"] = function(t) {
  return function(t2) {
    for (var r = [], e = 0; e < t2.length; e++) {
      var n = t2.charCodeAt(e);
      n < 128 ? r.push(n) : n < 2048 ? r.push(192 | n >> 6, 128 | 63 & n) : n < 55296 || n >= 57344 ? r.push(224 | n >> 12, 128 | n >> 6 & 63, 128 | 63 & n) : (e++, n = 65536 + ((1023 & n) << 10 | 1023 & t2.charCodeAt(e)), r.push(240 | n >> 18, 128 | n >> 12 & 63, 128 | n >> 6 & 63, 128 | 63 & n));
    }
    return r;
  }(t);
}, function(t) {
  "function" == typeof define && define.amd ? define([], t) : "object" == typeof exports && (module.exports = t());
}(function() {
  return qrcode;
});
function svgQrCode(conteudo) {
  const qr = qrcode(0, "M");
  qr.addData(conteudo);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
const CHAVE_EMITENTE_DANFCE = "emitente_danfce_json";
async function lerEmitenteDanfceCache() {
  const raw = await getConfig(CHAVE_EMITENTE_DANFCE, "");
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}
function tPagDoMeio(meio) {
  if (meio === "DINHEIRO") return "01";
  if (meio === "PIX") return "17";
  if (meio === "CARTAO") return "03";
  return "99";
}
async function montarDadosDanfce(params) {
  const venda = await obterVenda(params.vendaId);
  if (!venda) {
    throw new Error("Venda nao encontrada");
  }
  const nfce = await obterNfcePorVenda(params.vendaId);
  const sessao = await obterSessao();
  const numeracao = await obterNumeracaoNfce().catch(() => null);
  const emitenteCache = await lerEmitenteDanfceCache();
  const xml = parseXmlDanfce(nfce?.xml);
  const itens = [];
  for (const item of venda.itens) {
    const produto = await buscarProdutoPorId(item.idproduto);
    itens.push({
      codigo: produto?.codigo != null ? String(produto.codigo) : item.idproduto,
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: produto?.unidademedida || item.unidademedida || "UN",
      unitario: item.precounitario,
      total: item.precototal
    });
  }
  const pagamentos = (venda.pagamentos ?? []).filter((p) => (p.status ?? "ok") === "ok" && p.valor > 0).map((p) => ({
    tipo: rotuloFormaPagamentoNfce(tPagDoMeio(p.meio)),
    valor: p.valor
  }));
  if (!pagamentos.length && venda.meio_pagamento) {
    pagamentos.push({
      tipo: rotuloFormaPagamentoNfce(tPagDoMeio(venda.meio_pagamento)),
      valor: venda.valortotal
    });
  }
  const homologacao = xml.homologacao ?? (numeracao?.ambiente != null && numeracao.ambiente !== 1);
  const chave = params.chave || nfce?.chave || void 0;
  const qrcode2 = params.qrcode || nfce?.qrcode || void 0;
  const uf = resolverUfEmitente({
    uf: xml.emitente?.uf || emitenteCache?.uf || numeracao?.uf || void 0,
    chave
  });
  const fallback = {
    emitente: {
      nome: emitenteCache?.nome || sessao.nomeempresa || "",
      cnpj: emitenteCache?.cnpj || numeracao?.cnpj || "",
      ie: emitenteCache?.ie,
      logradouro: emitenteCache?.logradouro,
      numero: emitenteCache?.numero,
      bairro: emitenteCache?.bairro,
      municipio: emitenteCache?.municipio,
      uf,
      fone: emitenteCache?.fone,
      crt: emitenteCache?.crt
    },
    homologacao,
    contingencia: params.contingencia ?? nfce?.tpemis === 9,
    pendenteAutorizacao: !nfce?.protocolo && xml.pendenteAutorizacao !== false,
    itens,
    valorProdutos: venda.valortotal + (venda.valordesconto ?? 0),
    desconto: venda.valordesconto ?? 0,
    frete: 0,
    valorPagar: venda.valortotal,
    pagamentos,
    troco: venda.valortroco ?? 0,
    chave,
    qrcode: qrcode2,
    urlChave: urlConsultaNfce(uf, homologacao),
    consumidor: venda.cnpjcpf || venda.nomecliente ? {
      tipo: onlyDigitsLen(venda.cnpjcpf) > 11 ? "cnpj" : "cpf",
      documento: venda.cnpjcpf ?? void 0,
      nome: venda.nomecliente ?? void 0
    } : void 0,
    numero: nfce?.numero ?? 0,
    serie: nfce?.serie ?? 0,
    dhEmi: venda.criadoem,
    protocolo: nfce?.protocolo ?? void 0
  };
  if (params.motivo && fallback.contingencia && !xml.infCpl) {
    fallback.infCpl = params.motivo;
  }
  return juntarDadosDanfce(xml, fallback);
}
function onlyDigitsLen(valor) {
  return (valor ?? "").replace(/\D/g, "").length;
}
async function imprimirDanfce(params) {
  const dados = await montarDadosDanfce(params);
  const texto = montarTextoDanfce(dados);
  let qrSvg;
  if (dados.qrcode) {
    try {
      qrSvg = svgQrCode(dados.qrcode);
    } catch {
      qrSvg = void 0;
    }
  }
  const html = montarHtmlDanfce(dados, qrSvg);
  const tipoRaw = await getConfig("impressora_tipo", "sistema");
  const tipo = tipoRaw === "rede" || tipoRaw === "arquivo" ? tipoRaw : "sistema";
  return enviarDanfceImpressora(
    {
      texto,
      html,
      qrcode: dados.qrcode
    },
    {
      tipo,
      nome: await getConfig("impressora_nome", ""),
      host: await getConfig("impressora_host", ""),
      porta: Number(await getConfig("impressora_porta", "9100")) || 9100
    }
  );
}
const danfce = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CHAVE_EMITENTE_DANFCE,
  imprimirDanfce,
  lerEmitenteDanfceCache,
  montarDadosDanfce
}, Symbol.toStringTag, { value: "Module" }));
function money$2(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR");
}
function montarTextoComprovanteFechamentoCaixa(dados) {
  const { resumo, conferencia } = dados;
  const linhas = [];
  linhas.push("================================");
  linhas.push("     FECHAMENTO DE CAIXA");
  linhas.push("================================");
  if (dados.nomeempresa?.trim()) {
    linhas.push(dados.nomeempresa.trim().slice(0, 32));
  }
  linhas.push(`PDV: ${dados.numeropdv}`);
  if (dados.username?.trim()) {
    linhas.push(`Operador: ${dados.username.trim().slice(0, 22)}`);
  }
  linhas.push(`Abertura: ${dataHora(dados.abertoem)}`);
  linhas.push(`Fechamento: ${dataHora(dados.fechadoem)}`);
  linhas.push("--------------------------------");
  linhas.push(`Suprimento: ${money$2(resumo.suprimento)}`);
  linhas.push(`Vendas (${resumo.qtdVendas}): ${money$2(resumo.saldoapurado)}`);
  linhas.push(`  Dinheiro: ${money$2(resumo.pagamentos.dinheiro)}`);
  linhas.push(`  PIX: ${money$2(resumo.pagamentos.pix)}`);
  linhas.push(`  Cartao: ${money$2(resumo.pagamentos.cartao)}`);
  if (resumo.pagamentos.prepago > 0) {
    linhas.push(`  Pre-pago: ${money$2(resumo.pagamentos.prepago)}`);
  }
  linhas.push("--------------------------------");
  linhas.push(`Esperado na gaveta: ${money$2(resumo.saldoCaixaFisico)}`);
  linhas.push(`Informado: ${money$2(conferencia.saldoinformado)}`);
  if (conferencia.diferenca === 0) {
    linhas.push("Caixa conferido - sem diferenca");
  } else if (conferencia.sobra > 0) {
    linhas.push(`Sobra: ${money$2(conferencia.sobra)}`);
  } else {
    linhas.push(`Falta: ${money$2(conferencia.falta)}`);
  }
  if (dados.observacao?.trim()) {
    linhas.push("--------------------------------");
    linhas.push("Obs:");
    linhas.push(dados.observacao.trim().slice(0, 64));
  }
  linhas.push("================================");
  linhas.push("\n\n\n");
  return linhas.join("\n");
}
function money$1(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function rotuloMeioCupom(meio) {
  if (meio === "CARTAO") return "CARTAO";
  if (meio === "PIX") return "PIX";
  if (meio === "DINHEIRO") return "DINHEIRO";
  if (meio === "MISTO") return "MISTO";
  if (meio === "OUTROS") return "OUTROS";
  return meio;
}
function linhasPagamentoCupom(venda) {
  const efetivos = (venda.pagamentos ?? []).filter(
    (item) => (item.status ?? "ok") === "ok"
  );
  if (!efetivos.length) {
    return [`Pagamento: ${rotuloMeioCupom(venda.meio_pagamento)}`];
  }
  const linhas = ["PAGAMENTOS"];
  for (const item of efetivos) {
    const rotulo = (item.descricao?.trim() || rotuloMeioCupom(item.meio)).slice(
      0,
      18
    );
    linhas.push(`${rotulo.padEnd(18)} ${money$1(item.valor)}`);
    if (item.meio === "CARTAO") {
      if (item.bandeira) {
        linhas.push(`  Bandeira: ${item.bandeira}`);
      }
      if (item.nsu) {
        linhas.push(`  NSU: ${item.nsu}`);
      }
      if (item.autorizacao) {
        linhas.push(`  Autorizacao: ${item.autorizacao}`);
      }
    }
  }
  return linhas;
}
function money(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarQtd(n) {
  const arred = Math.round(n * 1e3) / 1e3;
  if (Number.isInteger(arred)) return String(arred);
  return arred.toFixed(3).replace(".", ",");
}
async function montarTextoCupom(vendaId, extras) {
  const venda = await obterVenda(vendaId);
  if (!venda) {
    return "Venda nao encontrada\n";
  }
  const fiscal = Boolean(extras?.chave);
  const linhas = [];
  linhas.push("================================");
  if (fiscal) {
    linhas.push(" DOCUMENTO AUXILIAR DA NFC-e");
    linhas.push("          DANFC-e");
  } else {
    linhas.push("       MAIS GESTAO - PDV");
    linhas.push("     CUPOM NAO FISCAL");
  }
  linhas.push("================================");
  linhas.push(`PDV: ${venda.numeropdv}`);
  linhas.push(`Venda: ${venda.id.slice(0, 8)}`);
  linhas.push(`Data: ${new Date(venda.criadoem).toLocaleString("pt-BR")}`);
  linhas.push("--------------------------------");
  for (const item of venda.itens) {
    linhas.push(item.descricao.slice(0, 32));
    linhas.push(
      `  ${formatarQtd(item.quantidade)} x ${money(item.precounitario)} = ${money(item.precototal)}`
    );
  }
  linhas.push("--------------------------------");
  if ((venda.valordesconto ?? 0) > 0) {
    linhas.push(`Desconto: -${money(venda.valordesconto ?? 0)}`);
  }
  if ((venda.valortaxaservico ?? 0) > 0) {
    linhas.push(`Taxa servico: ${money(venda.valortaxaservico ?? 0)}`);
  }
  if ((venda.valorcouvert ?? 0) > 0) {
    linhas.push(`Couvert: ${money(venda.valorcouvert ?? 0)}`);
  }
  linhas.push(`TOTAL: ${money(venda.valortotal)}`);
  linhas.push(...linhasPagamentoCupom(venda));
  if (venda.valortroco > 0) {
    linhas.push(`Troco: ${money(venda.valortroco)}`);
  }
  linhas.push("================================");
  linhas.push("Obrigado pela preferencia!");
  linhas.push("\n\n\n");
  return linhas.join("\n");
}
async function imprimirCupomNaoFiscal(vendaId) {
  const texto = await montarTextoCupom(vendaId);
  return enviarParaImpressora(texto);
}
async function imprimirPreConta(idcontaOuConta) {
  let conta;
  if (typeof idcontaOuConta === "string") {
    const { obterContaMesa: obterContaMesa2 } = await Promise.resolve().then(() => repos);
    const local = await obterContaMesa2(idcontaOuConta);
    if (!local || local.status !== "aberta") {
      throw new Error("Conta inválida");
    }
    conta = local;
  } else {
    conta = idcontaOuConta;
    if (conta.status !== "aberta") {
      throw new Error("Conta inválida");
    }
  }
  if (!conta.itens.length) {
    throw new Error("Conta sem itens para conferência");
  }
  const modelo = await getConfig("modelo_atendimento", "mesa") === "comanda" ? "Comanda" : "Mesa";
  const linhas = [];
  linhas.push("================================");
  linhas.push("     CONFERENCIA / PRE-CONTA");
  linhas.push("  NAO E DOCUMENTO FISCAL");
  linhas.push("================================");
  linhas.push(`${modelo}: ${conta.numero_mesa}`);
  if (conta.nomecliente) {
    linhas.push(`Cliente: ${conta.nomecliente.slice(0, 28)}`);
  }
  linhas.push(`Pessoas: ${conta.numeropessoas}`);
  linhas.push(`Data: ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}`);
  linhas.push("--------------------------------");
  for (const item of conta.itens) {
    linhas.push(item.descricao.slice(0, 32));
    linhas.push(
      `  ${formatarQtd(item.quantidade)} x ${money(item.precounitario)} = ${money(item.precototal)}`
    );
  }
  linhas.push("--------------------------------");
  linhas.push(`Subtotal: ${money(conta.subtotal)}`);
  if (conta.valordesconto > 0) {
    linhas.push(`Desconto: -${money(conta.valordesconto)}`);
  }
  if (conta.valortaxaservico > 0) {
    linhas.push(`Taxa servico: ${money(conta.valortaxaservico)}`);
  }
  if (conta.valorcouvert > 0) {
    linhas.push(`Couvert: ${money(conta.valorcouvert)}`);
  }
  if (conta.valorpago > 0) {
    linhas.push(`Ja pago: ${money(conta.valorpago)}`);
  }
  linhas.push(`TOTAL: ${money(conta.valorrestante)}`);
  linhas.push("================================");
  linhas.push("Confira os itens antes de pagar.");
  linhas.push("\n\n\n");
  return enviarParaImpressora(linhas.join("\n"));
}
async function imprimirComprovanteFechamentoCaixa(dados) {
  return enviarParaImpressora(montarTextoComprovanteFechamentoCaixa(dados));
}
async function destinoFiscal() {
  const tipoRaw = await getConfig("impressora_tipo", "sistema");
  const tipo = tipoRaw === "rede" || tipoRaw === "arquivo" ? tipoRaw : "sistema";
  return {
    tipo,
    nome: await getConfig("impressora_nome", ""),
    host: await getConfig("impressora_host", ""),
    porta: Number(await getConfig("impressora_porta", "9100")) || 9100
  };
}
async function enviarParaImpressora(texto, destino) {
  return enviarTextoImpressora(texto, destino ?? await destinoFiscal());
}
async function imprimirPedidoProducao(params) {
  const linhas = [];
  linhas.push("================================");
  linhas.push("     PEDIDO DE PRODUCAO");
  if (params.reimpressao) {
    linhas.push("     *** REIMPRESSAO ***");
  }
  linhas.push("================================");
  linhas.push(params.origem);
  if (params.cliente?.trim()) {
    linhas.push(`Cliente: ${params.cliente.trim()}`);
  }
  linhas.push(`Hora: ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}`);
  linhas.push("--------------------------------");
  for (const item of params.itens) {
    linhas.push(
      `${formatarQtd(item.quantidade)}  ${item.descricao.slice(0, 30)}`
    );
    if (item.observacao?.trim()) {
      const obs = item.observacao.trim();
      linhas.push(`   Obs: ${obs.slice(0, 28)}`);
      for (let i = 28; i < obs.length; i += 32) {
        linhas.push(`   ${obs.slice(i, i + 32)}`);
      }
    }
  }
  linhas.push("================================");
  linhas.push("\n\n\n");
  return enviarParaImpressora(linhas.join("\n"), params.destino);
}
async function testarImpressora(destino) {
  const linhas = [
    "================================",
    "     TESTE DE IMPRESSORA",
    "================================",
    "Mais Gestao - PDV",
    `Hora: ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}`,
    `Tipo: ${destino.tipo}`,
    destino.tipo === "rede" ? `Rede: ${destino.host?.trim() || "?"}:${destino.porta || 9100}` : `Sistema: ${destino.nome?.trim() || "padrao"}`,
    "--------------------------------",
    "Se este cupom saiu, a impressora",
    "esta configurada corretamente.",
    "================================",
    "\n\n\n"
  ];
  return enviarTextoImpressora(linhas.join("\n"), destino, { estrito: true });
}
async function listarImpressoras() {
  const win = new electron.BrowserWindow({
    show: false,
    webPreferences: { offscreen: true }
  });
  try {
    await win.loadURL("data:text/html,<html></html>");
    const printers = await win.webContents.getPrintersAsync();
    return printers.map((p) => ({ name: p.name, isDefault: p.isDefault }));
  } finally {
    win.destroy();
  }
}
function onlyDigits(value) {
  return value.replace(/\D/g, "");
}
function pad(num, size) {
  return String(num).padStart(size, "0");
}
function formatMoney(n) {
  return n.toFixed(2);
}
function calcularDvChave(chave43) {
  let peso = 2;
  let soma = 0;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
  return String(dv);
}
function montarChaveAcesso(params) {
  const ufCode = codigoIbgeDaUf(params.uf);
  if (ufCode == null) {
    throw new Error(`UF inválida para chave NFC-e: ${params.uf}`);
  }
  const base = pad(ufCode, 2) + params.aamm + pad(onlyDigits(params.cnpj), 14) + params.mod + pad(params.serie, 3) + pad(params.numero, 9) + String(params.tpEmis) + pad(params.codigo, 8);
  return base + calcularDvChave(base);
}
function montarQrCodeContingencia(params) {
  const urlBase = urlQrCodeNfce(params.uf, params.ambiente !== 1);
  if (!urlBase) {
    throw new Error(
      `Portal de QR Code NFC-e não configurado para a UF ${params.uf}`
    );
  }
  const digVal = node_crypto.createHash("sha1").update(`${params.chave}|${params.cscId}|${params.cscToken}`).digest("hex").toUpperCase();
  return `${urlBase}?p=${params.chave}|2|${params.ambiente}|${formatMoney(params.valor)}|${params.cscId}|${digVal}`;
}
function montarXmlContingencia(params) {
  const itensXml = params.itens.map(
    (item, idx) => `
    <det nItem="${idx + 1}">
      <prod>
        <cProd>${escapeXml(item.idproduto)}</cProd>
        <xProd>${escapeXml(item.descricao)}</xProd>
        <qCom>${item.quantidade.toFixed(4)}</qCom>
        <vUnCom>${formatMoney(item.precounitario)}</vUnCom>
        <vProd>${formatMoney(item.precototal)}</vProd>
      </prod>
    </det>`
  ).join("");
  const tPag = params.meio === "DINHEIRO" ? "01" : params.meio === "PIX" ? "17" : params.meio === "CARTAO" ? "03" : "99";
  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${params.chave}" versao="4.00">
    <ide>
      <cUF>${codigoIbgeDaUf(params.uf)}</cUF>
      <natOp>VENDA</natOp>
      <mod>65</mod>
      <serie>${params.serie}</serie>
      <nNF>${params.numero}</nNF>
      <dhEmi>${params.dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <tpEmis>9</tpEmis>
      <tpAmb>${params.ambiente}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <dhCont>${params.dhCont}</dhCont>
      <xJust>${escapeXml(params.motivo)}</xJust>
    </ide>
    <emit>
      <CNPJ>${onlyDigits(params.cnpj)}</CNPJ>
    </emit>
    ${itensXml}
    <total>
      <ICMSTot>
        <vProd>${formatMoney(params.total)}</vProd>
        <vNF>${formatMoney(params.total)}</vNF>
      </ICMSTot>
    </total>
    <pag>
      <detPag>
        <tPag>${tPag}</tPag>
        <vPag>${formatMoney(params.total)}</vPag>
      </detPag>
    </pag>
  </infNFe>
  <infNFeSupl>
    <qrCode>${escapeXml(params.qrcode)}</qrCode>
    ${params.urlChave ? `<urlChave>${escapeXml(params.urlChave)}</urlChave>` : ""}
  </infNFeSupl>
</NFe>`;
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
async function emitirOuContingencia(params) {
  const emitirNfce = await getConfig("emitir_nfce", "1") === "1";
  if (!emitirNfce) {
    await atualizarVendaSync(params.idvenda, { nfce_status: "nao_fiscal" });
    return {
      modo: "nao_fiscal",
      mensagem: "Venda registrada (cupom não fiscal)"
    };
  }
  const online = await params.onlineEmitir();
  if (online.ok) {
    const { persistirNfceOnlineLocal: persistirNfceOnlineLocal2 } = await Promise.resolve().then(() => persistirNfceOnline);
    await persistirNfceOnlineLocal2({
      idvenda: params.idvenda,
      idnotafiscal: online.idnotafiscal,
      chave: online.chave,
      qrCode: online.qrCode,
      protocolo: online.protocolo,
      xml: online.xml,
      serie: online.serie,
      numero: online.numero
    });
    await imprimirDanfce({
      chave: online.chave,
      qrcode: online.qrCode,
      contingencia: false,
      vendaId: params.idvenda
    });
    return {
      modo: "online",
      idnfce: online.idnotafiscal,
      chave: online.chave,
      qrcode: online.qrCode,
      mensagem: "NFC-e autorizada"
    };
  }
  if (!online.indisponivel && online.erro) {
    await atualizarVendaSync(params.idvenda, { nfce_status: "erro" });
    const mensagem = online.cStat ? `NFC-e rejeitada (${online.cStat}): ${online.erro}` : `NFC-e rejeitada: ${online.erro}`;
    return {
      modo: "erro",
      cStat: online.cStat,
      mensagem
    };
  }
  return emitirContingencia(
    params.idvenda,
    online.erro ?? "Sem comunicação com backend/SEFAZ"
  );
}
async function emitirContingencia(idvenda, motivo) {
  const venda = await obterVenda(idvenda);
  if (!venda) {
    throw new Error("Venda não encontrada");
  }
  if (venda.nfce_status === "autorizada" || venda.nfce_status === "transmitida") {
    return {
      modo: "online",
      mensagem: "NFC-e desta venda já foi enviada. Aguarde a autorização ou retransmita pela retaguarda."
    };
  }
  if (venda.idremoto) {
    try {
      const remota = await buscarVendaPdvGourmet(venda.idremoto);
      if (remota.idnotafiscalnfce || remota.nfce?.idnotafiscal) {
        await atualizarVendaSync(idvenda, { nfce_status: "pendente" });
        return {
          modo: "erro",
          mensagem: "Esta venda já possui NFC-e na retaguarda. Retransmita o cupom em vez de emitir contingência."
        };
      }
    } catch {
    }
  }
  const numeracao = await obterNumeracaoNfce();
  if (!numeracao.cnpj || !numeracao.csc_id || !numeracao.csc_token) {
    await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
    return {
      modo: "nao_fiscal",
      mensagem: "Contingência indisponível: sincronize CSC/CNPJ nas configurações com a API online."
    };
  }
  const { serie, numero: numero2 } = await reservarNumeroNfce();
  const agora = /* @__PURE__ */ new Date();
  const aamm = `${String(agora.getFullYear()).slice(2)}${pad(agora.getMonth() + 1, 2)}`;
  const codigo = pad(Math.floor(Math.random() * 99999999), 8);
  const emitenteCache = await lerEmitenteDanfceCache();
  const uf = (numeracao.uf || emitenteCache?.uf || "").trim().toUpperCase();
  if (!uf || codigoIbgeDaUf(uf) == null) {
    await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
    return {
      modo: "nao_fiscal",
      mensagem: "Contingência indisponível: UF do emitente não configurada. Sincronize os dados fiscais."
    };
  }
  const chave = montarChaveAcesso({
    uf,
    aamm,
    cnpj: numeracao.cnpj,
    mod: "65",
    serie,
    numero: numero2,
    tpEmis: 9,
    codigo
  });
  const dh = agora.toISOString().replace(/\.\d{3}Z$/, "-03:00");
  const qrcode2 = montarQrCodeContingencia({
    chave,
    ambiente: numeracao.ambiente,
    cscId: numeracao.csc_id,
    cscToken: numeracao.csc_token,
    valor: venda.valortotal,
    uf
  });
  const urlChave = urlConsultaNfce(uf, numeracao.ambiente !== 1);
  const xml = montarXmlContingencia({
    chave,
    serie,
    numero: numero2,
    cnpj: numeracao.cnpj,
    uf,
    ambiente: numeracao.ambiente,
    motivo: motivo.slice(0, 255),
    dhCont: dh,
    dhEmi: dh,
    itens: venda.itens,
    total: venda.valortotal,
    meio: venda.meio_pagamento,
    qrcode: qrcode2,
    ...urlChave ? { urlChave } : {}
  });
  const id = uuid.v4();
  await salvarNfceLocal({
    id,
    idvenda,
    serie,
    numero: numero2,
    chave,
    tpemis: 9,
    status: "contingencia",
    xml,
    qrcode: qrcode2,
    motivo_contingencia: motivo.slice(0, 255),
    data_contingencia: dh,
    transmitida: false
  });
  await enfileirarOutbox("transmitir_nfce_contingencia", {
    idnfce_local: id,
    idvenda,
    xml,
    chave,
    serie,
    numero: numero2,
    motivo: motivo.slice(0, 255),
    datacontingencia: dh
  });
  await imprimirDanfce({
    chave,
    qrcode: qrcode2,
    contingencia: true,
    motivo,
    vendaId: idvenda
  });
  return {
    modo: "contingencia",
    idnfce: id,
    chave,
    qrcode: qrcode2,
    xml,
    mensagem: "NFC-e emitida em contingência offline (tpEmis=9)"
  };
}
function obterDataIso(valor) {
  const texto = valor?.trim() ?? "";
  const match = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}
function valorTagXml(xml, nome) {
  const re = new RegExp(
    `<(?:[\\w.]+:)?${nome}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</(?:[\\w.]+:)?${nome}>`,
    "i"
  );
  const valor = xml.match(re)?.[1]?.trim();
  return valor || null;
}
function extrairDatasXmlNfce(xml) {
  return {
    emissao: obterDataIso(valorTagXml(xml, "dhEmi")),
    autorizacao: obterDataIso(valorTagXml(xml, "dhRecbto"))
  };
}
function dataXmlNoPeriodo(data, dataInicio, dataFim) {
  if (!data) return false;
  return data >= dataInicio && data <= dataFim;
}
function xmlNfceEntraNoPeriodo(params) {
  const datas = extrairDatasXmlNfce(params.xml);
  const data = params.criterio === "autorizacao" ? datas.autorizacao : datas.emissao ?? obterDataIso(params.fallbackEmissao);
  return {
    incluir: dataXmlNoPeriodo(data, params.dataInicio, params.dataFim),
    data
  };
}
function validarPeriodoXmlNfce(dataInicio, dataFim) {
  const inicio = obterDataIso(dataInicio);
  const fim = obterDataIso(dataFim);
  if (!inicio || !fim) {
    return "Preencha o período completo";
  }
  if (inicio > fim) {
    return "Data inicial não pode ser maior que data final";
  }
  const dias = (Date.parse(`${fim}T00:00:00`) - Date.parse(`${inicio}T00:00:00`)) / (1e3 * 60 * 60 * 24);
  if (dias > 365) {
    return "Período máximo permitido é de 365 dias";
  }
  return null;
}
async function exportarXmlsNfce(params) {
  const erroPeriodo = validarPeriodoXmlNfce(params.dataInicio, params.dataFim);
  if (erroPeriodo) {
    throw new Error(erroPeriodo);
  }
  if (params.criterio !== "emissao" && params.criterio !== "autorizacao") {
    throw new Error("Informe se o período é por emissão ou autorização");
  }
  const pastaBase = params.pasta.trim();
  if (!pastaBase) {
    throw new Error("Escolha a pasta de destino");
  }
  const destino = node_path.join(
    pastaBase,
    `xml-nfce-${params.dataInicio}_${params.dataFim}-${params.criterio}`
  );
  await promises.mkdir(destino, { recursive: true });
  const notas = await listarNfceComXml();
  let total = 0;
  let ignorados = 0;
  for (const nota of notas) {
    const xml = nota.xml.trim();
    if (!xml) {
      ignorados += 1;
      continue;
    }
    const { incluir } = xmlNfceEntraNoPeriodo({
      xml,
      criterio: params.criterio,
      dataInicio: params.dataInicio,
      dataFim: params.dataFim,
      fallbackEmissao: nota.criadoem
    });
    if (!incluir) {
      ignorados += 1;
      continue;
    }
    const nome = nomeArquivoXmlNfce({
      chave: nota.chave,
      serie: nota.serie,
      numero: nota.numero
    });
    await promises.writeFile(node_path.join(destino, nome), xml, "utf8");
    total += 1;
  }
  return { pasta: destino, total, ignorados };
}
function normalizarModoImpressaoProducao(valor) {
  return valor === "pedido" ? "pedido" : "itens";
}
function agruparLinhasPedidoFila(linhas) {
  const grupos = /* @__PURE__ */ new Map();
  for (const linha of linhas) {
    const atual = grupos.get(linha.client_order_id) ?? [];
    atual.push(linha);
    grupos.set(linha.client_order_id, atual);
  }
  return [...grupos.values()].sort(
    (a, b) => (a[0]?.criadoem ?? "") < (b[0]?.criadoem ?? "") ? 1 : -1
  );
}
async function rotuloOrigemMesa(numero2) {
  const modelo = await getConfig("modelo_atendimento", "mesa");
  const nome = modelo === "comanda" ? "Comanda" : "Mesa";
  return `${nome} ${numero2}`;
}
async function montarCuponsProducao(params) {
  const enriquecidos = [];
  const porDestino = /* @__PURE__ */ new Map();
  for (const item of params.itens) {
    const produto = await params.resolverProduto(item.idproduto);
    const linha = {
      ...item,
      descricao: item.descricao?.trim() || produto?.descricao || ""
    };
    if (params.modo === "pedido") {
      enriquecidos.push(linha);
      continue;
    }
    const idGrupo = produto?.idgrupogourmet?.trim();
    if (!idGrupo) {
      continue;
    }
    const destino = await params.resolverDestinoGrupo(idGrupo);
    if (!destino) {
      continue;
    }
    const chave = chaveDestino(destino);
    const atual = porDestino.get(chave);
    if (atual) {
      atual.itens.push(linha);
    } else {
      porDestino.set(chave, { destino, itens: [linha] });
    }
  }
  if (params.modo === "pedido") {
    if (!enriquecidos.length || !params.destinoPedido) {
      return [];
    }
    return [{ destino: params.destinoPedido, itens: enriquecidos }];
  }
  return [...porDestino.values()];
}
async function resolverProduto(idproduto) {
  return await queryOne("SELECT idgrupogourmet, descricao FROM produto_cache WHERE id = $1", [
    idproduto
  ]) ?? null;
}
async function destinoConfiguradoPedido() {
  const tipoRaw = await getConfig("impressora_pedido_tipo", "");
  if (tipoRaw !== "sistema" && tipoRaw !== "rede") {
    return null;
  }
  const destino = {
    tipo: tipoRaw,
    nome: await getConfig("impressora_pedido_nome", ""),
    host: await getConfig("impressora_pedido_host", ""),
    porta: Number(await getConfig("impressora_pedido_porta", "9100")) || 9100
  };
  return destinoPronto(destino) ? destino : null;
}
async function primeiroDestinoDosItens(itens) {
  for (const item of itens) {
    const produto = await resolverProduto(item.idproduto);
    const idGrupo = produto?.idgrupogourmet?.trim();
    if (!idGrupo) {
      continue;
    }
    const destino = await obterDestinoGrupoGourmet(idGrupo);
    if (destino) {
      return destino;
    }
  }
  return null;
}
async function resolverDestinoPedido(itens) {
  return await destinoConfiguradoPedido() ?? await primeiroDestinoDosItens(itens);
}
async function imprimirProducaoPedido(params) {
  try {
    const modo = normalizarModoImpressaoProducao(
      await getConfig("impressao_producao_modo", "itens")
    );
    const cupons = await montarCuponsProducao({
      modo,
      itens: params.itens,
      destinoPedido: modo === "pedido" ? await resolverDestinoPedido(params.itens) : null,
      resolverProduto,
      resolverDestinoGrupo: obterDestinoGrupoGourmet
    });
    for (const { destino, itens } of cupons) {
      await imprimirPedidoProducao({
        destino,
        origem: params.origem,
        cliente: params.cliente,
        itens,
        reimpressao: params.reimpressao
      });
    }
  } catch {
  }
}
const ID_UNIDADE_KG_SISTEMA = "a0000001-0000-4000-8000-000000000002";
const CODIGOS_KG = /* @__PURE__ */ new Set([
  "kg",
  "kgs",
  "kilo",
  "kilos",
  "kilograma",
  "quilograma",
  "quilogramas"
]);
function configEtiquetaDeMapa(cfg) {
  const digitos = Number(cfg.etiqueta_balanca_digitos_codigo ?? "4");
  return {
    habilitada: (cfg.etiqueta_balanca_habilitada ?? "0") === "1",
    prefixo: (cfg.etiqueta_balanca_prefixo ?? "2").replace(/\D/g, "").slice(0, 1) || "2",
    digitosCodigo: digitos === 5 || digitos === 6 ? digitos : 4,
    conteudo: cfg.etiqueta_balanca_conteudo === "peso" ? "peso" : "preco",
    centavos: (cfg.etiqueta_balanca_centavos ?? "1") !== "0",
    indicadorUso: (cfg.etiqueta_balanca_indicador_uso ?? "0") === "1"
  };
}
function dvEan13(dozeDigitos) {
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(dozeDigitos[i] ?? "0");
    soma += i % 2 === 0 ? n : n * 3;
  }
  return String((10 - soma % 10) % 10);
}
function ean13Valido(codigo) {
  const digitos = codigo.replace(/\D/g, "");
  if (digitos.length !== 13) return false;
  return dvEan13(digitos.slice(0, 12)) === digitos[12];
}
function tamanhoExtra(config) {
  if (config.indicadorUso) return 1;
  if (config.digitosCodigo === 4) return 1;
  return 0;
}
function parsearEtiquetaBalanca(lido, config) {
  if (!config.habilitada) return null;
  const digitos = lido.replace(/\D/g, "");
  if (digitos.length !== 12 && digitos.length !== 13) return null;
  if (!digitos.startsWith(config.prefixo)) return null;
  if (digitos.length === 13 && !ean13Valido(digitos)) return null;
  const payload = digitos.slice(0, 12);
  const extra = tamanhoExtra(config);
  const inicioCodigo = config.prefixo.length;
  const fimCodigo = inicioCodigo + config.digitosCodigo;
  const fimExtra = fimCodigo + extra;
  if (fimExtra >= 12) return null;
  const campoCodigo = payload.slice(inicioCodigo, fimCodigo);
  const campoExtra = extra ? payload.slice(fimCodigo, fimExtra) : "";
  const campoValor = payload.slice(fimExtra);
  const codigo = Number(campoCodigo);
  if (!Number.isInteger(codigo) || codigo < 1) return null;
  const valorBruto = Number(campoValor);
  if (!Number.isFinite(valorBruto) || valorBruto <= 0) return null;
  let valor = valorBruto;
  if (config.conteudo === "preco" && config.centavos) {
    valor = valorBruto / 100;
  } else if (config.conteudo === "peso") {
    valor = valorBruto / 1e3;
  }
  return {
    codigo,
    valorBruto,
    valor: Math.round(valor * 1e3) / 1e3,
    indicador: campoExtra || null
  };
}
function produtoPareceKg(produto) {
  const id = (produto.idunidademedida ?? "").trim().toLowerCase();
  if (id === ID_UNIDADE_KG_SISTEMA) return true;
  const u = (produto.unidademedida ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return CODIGOS_KG.has(u);
}
function montarLancamentoEtiqueta(produto, parse, config) {
  const precoCadastro = Number(produto.preco) || 0;
  if (config.conteudo === "peso") {
    const quantidade = parse.valor;
    const precototal = Math.round(quantidade * precoCadastro * 100) / 100;
    return {
      quantidade,
      precounitario: precoCadastro,
      precototal,
      pesado: true
    };
  }
  const totalEtiqueta = Math.round(parse.valor * 100) / 100;
  const ehKg = produtoPareceKg(produto);
  if (ehKg && precoCadastro > 0) {
    const quantidade = Math.round(totalEtiqueta / precoCadastro * 1e3) / 1e3;
    return {
      quantidade,
      precounitario: precoCadastro,
      precototal: totalEtiqueta,
      pesado: true
    };
  }
  return {
    quantidade: 1,
    precounitario: totalEtiqueta,
    precototal: totalEtiqueta,
    pesado: false
  };
}
function normalizarProtocoloBalanca(valor) {
  const v = (valor ?? "").trim().toLowerCase();
  if (v === "filizola") return "filizola";
  if (v === "continuo" || v === "contínuo") return "continuo";
  return "toledo";
}
function arredondarKg(valor) {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return Math.round(valor * 1e3) / 1e3;
}
function kgDeGramas(gramas) {
  return arredondarKg(gramas / 1e3);
}
function kgDeDigitosFixos(digitos) {
  const n = Number(digitos);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (digitos.length <= 3) return kgDeGramas(n);
  return arredondarKg(n / 1e3);
}
function kgDeTextoLivre(texto) {
  const normalizado = texto.replace(",", ".").trim();
  const comPonto = normalizado.match(/(\d+\.\d{1,3})/);
  if (comPonto) {
    return arredondarKg(Number(comPonto[1]));
  }
  const soDigitos = normalizado.replace(/\D/g, "");
  if (soDigitos.length >= 4) {
    return kgDeDigitosFixos(soDigitos.slice(-6));
  }
  const inteiro = Number(soDigitos);
  if (inteiro > 0 && inteiro < 1e3) {
    return arredondarKg(inteiro);
  }
  return 0;
}
function framesStxEtx(buffer) {
  const frames = [];
  let inicio = -1;
  for (let i = 0; i < buffer.length; i++) {
    const c = buffer.charCodeAt(i);
    if (c === 2) {
      inicio = i + 1;
      continue;
    }
    if (c === 3 && inicio >= 0) {
      frames.push(buffer.slice(inicio, i));
      inicio = -1;
    }
  }
  return frames;
}
function pesoDeFrameToledo(frame) {
  const limpo = frame.replace(/[^\d.,]/g, "");
  if (/^\d{5,7}$/.test(limpo)) {
    return kgDeDigitosFixos(limpo);
  }
  return kgDeTextoLivre(frame);
}
function pesoDeFrameFilizola(frame) {
  const digitos = frame.replace(/\D/g, "");
  if (digitos.length >= 4) {
    return kgDeGramas(Number(digitos.slice(-6)));
  }
  return kgDeTextoLivre(frame);
}
function extrairPesoKg(dados, protocolo = "toledo") {
  const texto = typeof dados === "string" ? dados : dados.toString("latin1");
  if (!texto.trim()) return 0;
  const frames = framesStxEtx(texto);
  if (frames.length) {
    const ultimo = frames[frames.length - 1] ?? "";
    if (protocolo === "filizola") {
      return pesoDeFrameFilizola(ultimo);
    }
    return pesoDeFrameToledo(ultimo);
  }
  const linhas = texto.split(/[\r\n]+/).filter((l) => l.trim());
  const ultima = linhas[linhas.length - 1] ?? texto;
  return kgDeTextoLivre(ultima);
}
function comandoSolicitarPeso(protocolo) {
  if (protocolo === "toledo") {
    return Buffer.from("P\r");
  }
  if (protocolo === "filizola") {
    return Buffer.from([5]);
  }
  return null;
}
const execFileAsync$1 = node_util.promisify(node_child_process.execFile);
function normalizarNomePorta(porta) {
  return porta.trim().toUpperCase().replace(/^\\\\.\\/, "").replace(/\\+$/g, "").replace(/\/+$/g, "");
}
function traduzirErroPorta(porta, err) {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (lower.includes("access") || lower.includes("denied") || lower.includes("eperm") || lower.includes("eacces") || lower.includes("in use") || lower.includes("sharing violation") || lower.includes("unauthorized")) {
    return new Error(
      `Sem permissão para abrir ${porta}. Feche o programa que estiver usando a porta (teste da balança, HyperTerminal, outro PDV) e tente de novo.`
    );
  }
  if (lower.includes("does not exist") || lower.includes("file not found") || lower.includes("enoent") || lower.includes("cannot find") || lower.includes("no such file") || lower.includes("não encontr") || lower.includes("nao encontr")) {
    return new Error(
      `Porta ${porta} não encontrada. Confira a COM da balança no Gerenciador de Dispositivos.`
    );
  }
  return new Error(`Falha na porta ${porta}: ${message}`);
}
function powershellExe() {
  const root = process.env.SystemRoot || "C:\\Windows";
  return `${root}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
}
const HOST_PS = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
$port = $null
function Out-Line([string]$s) {
  [Console]::Out.WriteLine($s)
  [Console]::Out.Flush()
}
try {
  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    $line = $line.Trim()
    if ($line -eq '') { continue }
    $parts = $line.Split(' ', 3)
    $cmd = $parts[0].ToUpperInvariant()
    try {
      switch ($cmd) {
        'OPEN' {
          if ($port) { $port.Close(); $port.Dispose(); $port = $null }
          $nome = $parts[1]
          $baud = [int]$parts[2]
          $port = New-Object System.IO.Ports.SerialPort $nome, $baud, ([System.IO.Ports.Parity]::None), 8, ([System.IO.Ports.StopBits]::One)
          $port.Handshake = [System.IO.Ports.Handshake]::None
          $port.ReadTimeout = 50
          $port.WriteTimeout = 1000
          $port.DtrEnable = $true
          $port.RtsEnable = $true
          $port.Open()
          Out-Line 'OK OPEN'
        }
        'WRITE' {
          $bytes = [Convert]::FromBase64String($parts[1])
          $port.Write($bytes, 0, $bytes.Length)
          Out-Line 'OK WRITE'
        }
        'READ' {
          $n = $port.BytesToRead
          if ($n -le 0) { Out-Line 'OK READ'; continue }
          $buf = New-Object byte[] $n
          $got = $port.Read($buf, 0, $n)
          Out-Line ('OK READ ' + [Convert]::ToBase64String($buf, 0, $got))
        }
        'CLOSE' {
          if ($port) { $port.Close(); $port.Dispose(); $port = $null }
          Out-Line 'OK CLOSE'
        }
        'QUIT' {
          if ($port) { $port.Close(); $port.Dispose(); $port = $null }
          Out-Line 'OK QUIT'
          break
        }
        default { Out-Line 'ERR comando desconhecido' }
      }
    } catch {
      $msg = $_.Exception.Message.Replace([char]13, ' ').Replace([char]10, ' ')
      Out-Line ('ERR ' + $msg)
    }
  }
} finally {
  if ($port) { try { $port.Close(); $port.Dispose() } catch {} }
}
`.trim();
class SessaoSerialWin {
  child;
  fila = [];
  restante = "";
  morto = false;
  constructor(child) {
    this.child = child;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => this.receber(chunk));
    child.stderr.on("data", () => void 0);
    child.on("exit", () => {
      this.morto = true;
      const erro = new Error("O helper da porta serial encerrou.");
      for (const espera of this.fila.splice(0)) {
        espera.reject(erro);
      }
    });
  }
  static iniciar() {
    const encoded = Buffer.from(HOST_PS, "utf16le").toString("base64");
    const child = node_child_process.spawn(
      powershellExe(),
      ["-NoProfile", "-STA", "-EncodedCommand", encoded],
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      }
    );
    return new SessaoSerialWin(child);
  }
  receber(chunk) {
    this.restante += chunk;
    let idx = this.restante.indexOf("\n");
    while (idx >= 0) {
      const line = this.restante.slice(0, idx).replace(/\r$/, "");
      this.restante = this.restante.slice(idx + 1);
      if (line) {
        const espera = this.fila.shift();
        if (espera) espera.resolve(line);
      }
      idx = this.restante.indexOf("\n");
    }
  }
  async comando(cmd, timeoutMs = 8e3) {
    if (this.morto) {
      throw new Error("O helper da porta serial encerrou.");
    }
    const line = await new Promise((resolve, reject) => {
      const timer2 = setTimeout(() => {
        const i = this.fila.indexOf(espera);
        if (i >= 0) this.fila.splice(i, 1);
        reject(new Error("Tempo esgotado na porta serial"));
      }, timeoutMs);
      const espera = {
        resolve: (valor) => {
          clearTimeout(timer2);
          resolve(valor);
        },
        reject: (err) => {
          clearTimeout(timer2);
          reject(err);
        }
      };
      this.fila.push(espera);
      this.child.stdin.write(`${cmd}
`);
    });
    if (line.startsWith("ERR ")) {
      throw new Error(line.slice(4).trim());
    }
    return line;
  }
  async fecharProcesso() {
    try {
      await this.comando("QUIT", 1500);
    } catch {
    }
    if (!this.morto) {
      this.child.kill();
    }
  }
}
function coletarComs(texto) {
  const encontradas = /* @__PURE__ */ new Set();
  for (const linha of texto.split(/\r?\n/)) {
    const nome = normalizarNomePorta(linha.replace(/,$/, ""));
    if (/^COM\d+$/.test(nome)) encontradas.add(nome);
    for (const parte of linha.split(/[,\s;]+/)) {
      const item = normalizarNomePorta(parte);
      if (/^COM\d+$/.test(item)) encontradas.add(item);
    }
  }
  return [...encontradas].sort(
    (a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, ""))
  );
}
async function listarPortasWindows() {
  const encontradas = /* @__PURE__ */ new Set();
  const comandos = [
    "[System.IO.Ports.SerialPort]::GetPortNames()",
    "Get-CimInstance Win32_SerialPort | ForEach-Object { $_.DeviceID }"
  ];
  for (const comando of comandos) {
    try {
      const { stdout } = await execFileAsync$1(powershellExe(), [
        "-NoProfile",
        "-Command",
        comando
      ]);
      for (const nome of coletarComs(stdout)) encontradas.add(nome);
    } catch {
    }
  }
  return [...encontradas].sort(
    (a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, ""))
  );
}
async function listarPortasSeriais() {
  if (process.platform === "win32") {
    return listarPortasWindows();
  }
  const nomes = [];
  try {
    const itens = await promises.readdir("/dev");
    for (const nome of itens) {
      if (!/^(ttyUSB|ttyACM|ttyS)\d+$/.test(nome)) continue;
      nomes.push(`/dev/${nome}`);
    }
  } catch {
    return [];
  }
  return nomes.sort();
}
async function abrirPortaWindows(nome, baud) {
  const sessao = SessaoSerialWin.iniciar();
  try {
    await sessao.comando(`OPEN ${nome} ${baud}`, 8e3);
  } catch (err) {
    await sessao.fecharProcesso().catch(() => void 0);
    throw traduzirErroPorta(nome, err);
  }
  return {
    path: nome,
    async ler() {
      const line = await sessao.comando("READ", 2e3);
      const b64 = line.startsWith("OK READ") ? line.slice("OK READ".length).trim() : "";
      return b64 ? Buffer.from(b64, "base64") : Buffer.alloc(0);
    },
    async escrever(dados) {
      await sessao.comando(`WRITE ${dados.toString("base64")}`, 2e3);
    },
    async fechar() {
      try {
        await sessao.comando("CLOSE", 1500);
      } catch {
      }
      await sessao.fecharProcesso().catch(() => void 0);
    }
  };
}
async function configurarBaudPosix(path, baud) {
  await execFileAsync$1("stty", [
    "-F",
    path,
    String(baud),
    "cs8",
    "-cstopb",
    "-parenb",
    "raw",
    "-echo",
    "min",
    "0",
    "time",
    "1"
  ]).catch(() => void 0);
}
async function abrirPortaPosix(path, baud) {
  if (!node_fs.existsSync(path)) {
    throw new Error(`Porta ${path} não encontrada.`);
  }
  await configurarBaudPosix(path, baud);
  let fd;
  try {
    fd = node_fs.openSync(path, "r+");
  } catch (err) {
    throw traduzirErroPorta(path, err);
  }
  let leitura;
  let escrita;
  try {
    leitura = node_fs.createReadStream("", {
      fd,
      autoClose: false,
      highWaterMark: 256
    });
    escrita = node_fs.createWriteStream("", { fd, autoClose: false });
  } catch (err) {
    try {
      node_fs.closeSync(fd);
    } catch {
    }
    throw traduzirErroPorta(path, err);
  }
  let buffer = Buffer.alloc(0);
  leitura.on("data", (chunk) => {
    const parte = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    buffer = Buffer.concat([buffer, parte]);
    if (buffer.length > 4096) {
      buffer = buffer.subarray(buffer.length - 2048);
    }
  });
  return {
    path,
    async ler() {
      const atual = buffer;
      buffer = Buffer.alloc(0);
      return atual;
    },
    async escrever(dados) {
      await new Promise((resolve, reject) => {
        escrita.write(dados, (err) => err ? reject(err) : resolve());
      });
    },
    async fechar() {
      leitura.destroy();
      escrita.end();
      try {
        node_fs.closeSync(fd);
      } catch {
      }
    }
  };
}
async function abrirPortaSerial(porta, baud = 9600) {
  const nome = normalizarNomePorta(porta);
  if (!nome) {
    throw new Error("Informe a porta da balança.");
  }
  if (process.platform === "win32") {
    return abrirPortaWindows(nome, baud);
  }
  return abrirPortaPosix(porta.trim(), baud);
}
let portaAberta = null;
let chavePorta = null;
let ultimoErro$1 = "";
const BAUD_PADRAO = 9600;
function baudValido(valor) {
  const n = Number(valor);
  if (n === 1200 || n === 2400 || n === 4800 || n === 9600 || n === 19200) {
    return n;
  }
  return BAUD_PADRAO;
}
async function lerConfigBalanca() {
  const portaPadrao = "";
  return {
    habilitado: await getConfig("balanca_habilitada", "0") === "1",
    porta: (await getConfig("balanca_porta", portaPadrao)).trim() || portaPadrao,
    baud: baudValido(await getConfig("balanca_baud", String(BAUD_PADRAO))),
    protocolo: normalizarProtocoloBalanca(
      await getConfig("balanca_protocolo", "toledo")
    )
  };
}
async function resetarConexaoBalanca() {
  if (portaAberta) {
    await portaAberta.fechar().catch(() => void 0);
  }
  portaAberta = null;
  chavePorta = null;
  ultimoErro$1 = "";
}
async function garantirPorta(config) {
  const chave = `${config.porta}|${config.baud}`;
  if (portaAberta && chavePorta === chave) {
    return portaAberta;
  }
  await resetarConexaoBalanca();
  const aberta = await comTimeout(
    abrirPortaSerial(config.porta, config.baud),
    8e3,
    `Tempo esgotado ao abrir ${config.porta}`
  );
  portaAberta = aberta;
  chavePorta = chave;
  ultimoErro$1 = "";
  return aberta;
}
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function comTimeout(promessa, ms, mensagem) {
  let timer2;
  try {
    return await Promise.race([
      promessa,
      new Promise((_, reject) => {
        timer2 = setTimeout(() => reject(new Error(mensagem)), ms);
      })
    ]);
  } finally {
    if (timer2) clearTimeout(timer2);
  }
}
async function statusBalanca() {
  const config = await lerConfigBalanca();
  if (!config.habilitado) {
    return {
      ...config,
      conectado: false,
      mensagem: "Balança desligada — peso será digitado se o produto for em kg"
    };
  }
  if (!config.porta) {
    return {
      ...config,
      conectado: false,
      mensagem: "Informe a porta serial da balança"
    };
  }
  return {
    ...config,
    conectado: portaAberta != null && chavePorta === `${config.porta}|${config.baud}`,
    mensagem: ultimoErro$1 ? ultimoErro$1 : `Porta ${config.porta} · ${config.baud} bps · ${config.protocolo}`
  };
}
async function listarPortasBalanca() {
  return listarPortasSeriais();
}
async function lerPesoDaPorta(config, esperaMs) {
  const porta = await garantirPorta(config);
  const pedido = comandoSolicitarPeso(config.protocolo);
  if (pedido) {
    await porta.escrever(pedido).catch(() => void 0);
  }
  await esperar(esperaMs);
  const bruto = await porta.ler();
  return extrairPesoKg(bruto, config.protocolo);
}
async function lerPesoBalanca() {
  const config = await lerConfigBalanca();
  if (!config.habilitado) {
    return {
      peso: 0,
      conectado: false,
      origem: "nenhuma",
      mensagem: "Balança desligada"
    };
  }
  try {
    const peso = await lerPesoDaPorta(config, 280);
    if (peso > 0) {
      return {
        peso,
        conectado: true,
        origem: "balanca",
        mensagem: "Peso lido da balança"
      };
    }
    return {
      peso: 0,
      conectado: true,
      origem: "nenhuma",
      mensagem: "Balança conectada — coloque o produto ou digite o peso"
    };
  } catch (err) {
    ultimoErro$1 = err instanceof Error ? err.message : "Falha na porta";
    await resetarConexaoBalanca();
    return {
      peso: 0,
      conectado: false,
      origem: "nenhuma",
      mensagem: ultimoErro$1
    };
  }
}
async function testarBalanca() {
  const config = await lerConfigBalanca();
  const base = await statusBalanca();
  if (!config.habilitado) {
    return {
      ...base,
      peso: 0,
      origem: "nenhuma"
    };
  }
  try {
    const peso = await lerPesoDaPorta(config, 800);
    if (peso > 0) {
      return {
        ...base,
        conectado: true,
        peso,
        origem: "balanca",
        mensagem: `Peso lido: ${peso.toLocaleString("pt-BR", {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3
        })} kg`
      };
    }
    return {
      ...base,
      conectado: true,
      peso: 0,
      origem: "nenhuma",
      mensagem: "Porta aberta, mas nenhum peso chegou. Confira o protocolo e se há produto na balança."
    };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Falha na porta";
    await resetarConexaoBalanca();
    return {
      ...base,
      conectado: false,
      peso: 0,
      origem: "nenhuma",
      mensagem
    };
  }
}
const NOMES_DLL = ["CliSiTef64I.dll", "CliSiTef32I.dll", "clisitef64I.dll"];
const PASTAS_PADRAO = [
  "C:\\SiTef",
  "C:\\CliSiTef",
  "C:\\Software Express\\CliSiTef"
];
let dllCarregada = null;
function resolverCaminhoDll(preferido) {
  const candidatos = [];
  const extra = preferido?.trim();
  if (extra) {
    candidatos.push(extra);
    if (!extra.toLowerCase().endsWith(".dll")) {
      for (const nome of NOMES_DLL) {
        candidatos.push(node_path.join(extra, nome));
      }
    }
  }
  if (process.env.SITEF_DLL?.trim()) {
    candidatos.push(process.env.SITEF_DLL.trim());
  }
  candidatos.push(...NOMES_DLL.map((nome) => node_path.join(process.cwd(), nome)));
  const appDir = diretorioExecutavel();
  if (appDir) {
    candidatos.push(...NOMES_DLL.map((nome) => node_path.join(appDir, nome)));
  }
  for (const pasta of PASTAS_PADRAO) {
    candidatos.push(...NOMES_DLL.map((nome) => node_path.join(pasta, nome)));
  }
  for (const caminho of candidatos) {
    if (caminho && node_fs.existsSync(caminho)) {
      return caminho;
    }
  }
  return null;
}
function diretorioExecutavel() {
  try {
    const require$1 = node_module.createRequire(require("url").pathToFileURL(__filename).href);
    const electron2 = require$1("electron");
    const exe = electron2.app?.getPath("exe");
    return exe ? node_path.dirname(exe) : null;
  } catch {
    return null;
  }
}
function importarKoffi() {
  try {
    const require$1 = node_module.createRequire(require("url").pathToFileURL(__filename).href);
    const mod = require$1("koffi");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}
function lerCString(koffi, buffer, max = 2e4) {
  try {
    const texto = koffi.decode(buffer, "char *");
    if (typeof texto === "string") {
      return texto.replace(/\0/g, "");
    }
  } catch {
  }
  try {
    const bytes = koffi.decode(buffer, `char[${max}]`);
    if (typeof bytes === "string") {
      return bytes.replace(/\0/g, "");
    }
    if (Array.isArray(bytes)) {
      const chars = [];
      for (const b of bytes) {
        const n = Number(b);
        if (!n) break;
        chars.push(n);
      }
      return String.fromCharCode(...chars);
    }
  } catch {
    return "";
  }
  return "";
}
function adaptarKoffi(koffi, lib) {
  const configura = lib.func(
    "int ConfiguraIntSiTefInterativo(str IPSiTef, str IdLoja, str IdTerminal, str Reservado)"
  );
  let configuraEx = null;
  try {
    configuraEx = lib.func(
      "int ConfiguraIntSiTefInterativoEx(str IPSiTef, str IdLoja, str IdTerminal, str Reservado, str Parametros)"
    );
  } catch {
    configuraEx = null;
  }
  const inicia = lib.func(
    "int IniciaFuncaoSiTefInterativo(int Funcao, str Valor, str CupomFiscal, str DataFiscal, str HoraFiscal, str Operador, str Restricoes)"
  );
  const continua = lib.func(
    "int ContinuaFuncaoSiTefInterativo(_Inout_ int *Comando, _Inout_ long *TipoCampo, _Inout_ short *TamMinimo, _Inout_ short *TamMaximo, _Inout_ char *Buffer, int TamBuffer, int Continua)"
  );
  const finaliza = lib.func(
    "int FinalizaFuncaoSiTefInterativo(short Confirma, str CupomFiscal, str DataFiscal, str HoraFiscal, str Parametros)"
  );
  return {
    configura(ip, loja, terminal, reservado, parametros) {
      if (configuraEx && parametros?.trim()) {
        return Number(
          configuraEx(ip, loja, terminal, reservado, parametros) ?? -1
        );
      }
      return Number(configura(ip, loja, terminal, reservado) ?? -1);
    },
    iniciaFuncao(funcao, valor, cupom, data, hora, operador, restricoes) {
      return Number(
        inicia(funcao, valor, cupom, data, hora, operador, restricoes) ?? -1
      );
    },
    continuaFuncao(estado, proximo) {
      const comando = koffi.alloc("int", estado.comando);
      const tipoCampo = koffi.alloc("long", estado.tipoCampo);
      const tamMinimo = koffi.alloc("short", estado.tamMinimo);
      const tamMaximo = koffi.alloc("short", estado.tamMaximo);
      const tamBuffer = 2e4;
      const inicial = (estado.buffer ?? "").slice(0, tamBuffer - 1);
      const buffer = koffi.alloc("char", tamBuffer);
      if (inicial) {
        try {
          koffi.encode?.(buffer, `char[${tamBuffer}]`, inicial);
        } catch {
        }
      }
      const ret = Number(
        continua(
          comando,
          tipoCampo,
          tamMinimo,
          tamMaximo,
          buffer,
          tamBuffer,
          proximo
        ) ?? -1
      );
      return {
        ret,
        estado: {
          comando: Number(koffi.decode(comando, "int") ?? 0),
          tipoCampo: Number(koffi.decode(tipoCampo, "long") ?? 0),
          tamMinimo: Number(koffi.decode(tamMinimo, "short") ?? 0),
          tamMaximo: Number(koffi.decode(tamMaximo, "short") ?? 0),
          buffer: lerCString(koffi, buffer, tamBuffer)
        }
      };
    },
    finalizaFuncao(confirma, cupom, data, hora, parametros) {
      return Number(finaliza(confirma, cupom, data, hora, parametros) ?? -1);
    }
  };
}
function carregarDll(caminhoPreferido) {
  if (process.platform !== "win32") {
    return null;
  }
  const caminho = resolverCaminhoDll(caminhoPreferido);
  if (!caminho) {
    return null;
  }
  if (dllCarregada?.path === caminho) {
    return dllCarregada;
  }
  const koffi = importarKoffi();
  if (!koffi) {
    return null;
  }
  try {
    const lib = koffi.load(caminho);
    const api = adaptarKoffi(koffi, lib);
    dllCarregada = { path: caminho, api };
    return dllCarregada;
  } catch {
    dllCarregada = null;
    return null;
  }
}
function resetarDllCarregada() {
  dllCarregada = null;
}
const dll = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  carregarDll,
  resetarDllCarregada,
  resolverCaminhoDll
}, Symbol.toStringTag, { value: "Module" }));
const FUNCAO_PAGAMENTO = 0;
const FUNCAO_CANCELAMENTO = 200;
const RET_CONTINUA = 1e4;
const RET_OK = 0;
const TIPO_CAMPO = {
  nsuSitef: 121,
  nsuHost: 122,
  autorizacao: 131,
  autorizacaoAlt: 132,
  instituicao: 133,
  codigoBandeira: 134,
  nomeBandeira: 156,
  nsuAlt: 2021
};
const TIPOS_NSU = /* @__PURE__ */ new Set([
  TIPO_CAMPO.nsuSitef,
  TIPO_CAMPO.nsuHost,
  TIPO_CAMPO.nsuAlt
]);
const TIPOS_AUTORIZACAO = /* @__PURE__ */ new Set([
  TIPO_CAMPO.autorizacao,
  TIPO_CAMPO.autorizacaoAlt
]);
const TIPOS_BANDEIRA = /* @__PURE__ */ new Set([
  TIPO_CAMPO.nomeBandeira,
  TIPO_CAMPO.instituicao,
  TIPO_CAMPO.codigoBandeira
]);
const MENSAGENS_RETORNO = {
  0: "Transação aprovada",
  [-1]: "Módulo SiTef não inicializado",
  [-2]: "Operação cancelada no PIN pad",
  [-3]: "Transação negada",
  [-5]: "Sem comunicação com o SiTef",
  [-6]: "Transação cancelada pelo operador",
  [-8]: "DLL CliSiTef não encontrada ou incompatível",
  [-12]: "Erro na execução da função",
  [-15]: "Terminal ou loja inválidos",
  [-20]: "Parâmetros inválidos",
  [-40]: "Transação negada pelo autorizador"
};
function mensagemRetornoSitef(codigo) {
  if (codigo === RET_CONTINUA) {
    return "Aguardando PIN pad";
  }
  return MENSAGENS_RETORNO[codigo] ?? `SiTef retornou código ${codigo}`;
}
function valorParaSitef(valor) {
  const centavos = Math.round(arredondarDinheiro(valor) * 100);
  if (centavos <= 0) {
    throw new Error("Valor da transação SiTef inválido");
  }
  return String(centavos);
}
function dataHoraFiscal(agora) {
  const pad2 = (n, tam = 2) => String(n).padStart(tam, "0");
  return {
    data: `${agora.getFullYear()}${pad2(agora.getMonth() + 1)}${pad2(agora.getDate())}`,
    hora: `${pad2(agora.getHours())}${pad2(agora.getMinutes())}${pad2(agora.getSeconds())}`
  };
}
function cupomFiscalPadrao(agora) {
  return `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, "0")}${String(agora.getDate()).padStart(2, "0")}${String(agora.getHours()).padStart(2, "0")}${String(agora.getMinutes()).padStart(2, "0")}${String(agora.getSeconds()).padStart(2, "0")}`;
}
function textoCampo(valor) {
  const texto = valor.replace(/\0/g, "").trim();
  return texto.length ? texto : null;
}
function extrairCamposSitef(campos) {
  let nsu = null;
  let nsuHost = null;
  let autorizacao = null;
  let bandeira = null;
  let instituicao = null;
  let codigoBandeira = null;
  for (const campo of campos) {
    const valor = textoCampo(campo.valor);
    if (!valor) continue;
    if (campo.tipoCampo === TIPO_CAMPO.nsuSitef) {
      nsu = valor;
    } else if (campo.tipoCampo === TIPO_CAMPO.nsuHost || campo.tipoCampo === TIPO_CAMPO.nsuAlt) {
      nsuHost = nsuHost ?? valor;
    } else if (TIPOS_AUTORIZACAO.has(campo.tipoCampo)) {
      autorizacao = autorizacao ?? valor;
    } else if (campo.tipoCampo === TIPO_CAMPO.nomeBandeira) {
      bandeira = valor;
    } else if (campo.tipoCampo === TIPO_CAMPO.instituicao) {
      instituicao = instituicao ?? valor;
    } else if (campo.tipoCampo === TIPO_CAMPO.codigoBandeira) {
      codigoBandeira = codigoBandeira ?? valor;
    }
  }
  return {
    nsu: nsu ?? nsuHost,
    autorizacao,
    bandeira: bandeira ?? instituicao ?? codigoBandeira
  };
}
function ehCampoRetornoUtil(tipoCampo) {
  return TIPOS_NSU.has(tipoCampo) || TIPOS_AUTORIZACAO.has(tipoCampo) || TIPOS_BANDEIRA.has(tipoCampo);
}
const MAX_PASSOS = 200;
let chaveConfigurada = null;
function configSitefPadrao() {
  return {
    habilitado: false,
    ip: "127.0.0.1",
    loja: "00000000",
    terminal: "PD000001",
    parametros: "",
    portaPinPad: "",
    dllPath: ""
  };
}
function normalizarPortaPinPad(valor) {
  let porta = valor.trim();
  if (!porta) {
    return "";
  }
  porta = porta.replace(/^PortaPinPad=/i, "").trim();
  if (/^com\d+$/i.test(porta)) {
    return porta.toUpperCase();
  }
  return porta;
}
function montarParametrosSitef(portaPinPad, extras) {
  const extrasTrim = extras.trim();
  const porta = normalizarPortaPinPad(portaPinPad);
  if (!porta) {
    return extrasTrim;
  }
  const pinPad = `PortaPinPad=${porta}`;
  if (!extrasTrim) {
    return pinPad;
  }
  const extrasSemPorta = extrasTrim.replace(/;?PortaPinPad=[^;]*/gi, "").replace(/^;+|;+$/g, "").trim();
  return extrasSemPorta ? `${pinPad};${extrasSemPorta}` : pinPad;
}
function parametrosEfetivosSitef(config) {
  return montarParametrosSitef(config.portaPinPad, config.parametros);
}
async function lerConfigSitef() {
  return {
    habilitado: await getConfig("sitef_habilitado", "0") === "1",
    ip: (await getConfig("sitef_ip", "127.0.0.1")).trim() || "127.0.0.1",
    loja: (await getConfig("sitef_loja", "00000000")).trim() || "00000000",
    terminal: (await getConfig("sitef_terminal", "PD000001")).trim() || "PD000001",
    parametros: (await getConfig("sitef_parametros", "")).trim(),
    portaPinPad: (await getConfig("sitef_porta_pinpad", "")).trim(),
    dllPath: (await getConfig("sitef_dll_path", "")).trim()
  };
}
function statusSitefCom(config, dll2, dllPath) {
  const plataforma = process.platform;
  const dllEncontrada = Boolean(dllPath);
  const portaPinPad = normalizarPortaPinPad(config.portaPinPad) || null;
  if (!config.habilitado) {
    return {
      habilitado: false,
      disponivel: false,
      plataforma,
      dllEncontrada,
      dllPath,
      portaPinPad,
      mensagem: "SiTef desligado — cartão será lançado manualmente"
    };
  }
  if (!dll2) {
    const mensagem = plataforma !== "win32" ? "SiTef só opera no Windows com a DLL CliSiTef. Cartão segue manual." : dllEncontrada ? "DLL encontrada, mas o FFI (koffi) não carregou. Cartão manual." : "DLL CliSiTef não encontrada. Cartão será lançado manualmente.";
    return {
      habilitado: true,
      disponivel: false,
      plataforma,
      dllEncontrada,
      dllPath,
      portaPinPad,
      mensagem
    };
  }
  if (!config.ip || !config.loja || !config.terminal) {
    return {
      habilitado: true,
      disponivel: false,
      plataforma,
      dllEncontrada,
      dllPath,
      portaPinPad,
      mensagem: "Informe IP, loja e terminal SiTef nas configurações."
    };
  }
  return {
    habilitado: true,
    disponivel: true,
    plataforma,
    dllEncontrada: true,
    dllPath,
    portaPinPad,
    mensagem: "SiTef pronto"
  };
}
async function statusSitef() {
  const config = await lerConfigSitef();
  const caminho = resolverCaminhoDll(config.dllPath);
  const carregada = config.habilitado ? carregarDll(config.dllPath) : null;
  return statusSitefCom(
    config,
    carregada?.api ?? null,
    carregada?.path ?? caminho
  );
}
function garantirConfigurado(dll2, config) {
  const parametros = parametrosEfetivosSitef(config);
  const chave = `${config.ip}|${config.loja}|${config.terminal}|${parametros}`;
  if (chaveConfigurada === chave) {
    return RET_OK;
  }
  const ret = dll2.configura(
    config.ip,
    config.loja,
    config.terminal,
    "0",
    parametros
  );
  if (ret === RET_OK) {
    chaveConfigurada = chave;
  }
  return ret;
}
function estadoInicial() {
  return {
    comando: 0,
    tipoCampo: 0,
    tamMinimo: 0,
    tamMaximo: 0,
    buffer: ""
  };
}
function executarFuncaoInterativa(dll2, params) {
  const campos = [];
  let ret = dll2.iniciaFuncao(
    params.funcao,
    params.valor,
    params.cupom,
    params.data,
    params.hora,
    params.operador,
    params.restricoes
  );
  let estado = estadoInicial();
  let passos = 0;
  while (ret === RET_CONTINUA) {
    passos += 1;
    if (passos > MAX_PASSOS) {
      dll2.finalizaFuncao(0, params.cupom, params.data, params.hora, "");
      return { ret: -12, campos };
    }
    const passo = dll2.continuaFuncao(estado, 0);
    ret = passo.ret;
    estado = passo.estado;
    if (ehCampoRetornoUtil(estado.tipoCampo) && estado.buffer.trim()) {
      campos.push({
        tipoCampo: estado.tipoCampo,
        valor: estado.buffer
      });
    }
  }
  const confirma = ret === RET_OK ? 1 : 0;
  const fin = dll2.finalizaFuncao(
    confirma,
    params.cupom,
    params.data,
    params.hora,
    ""
  );
  if (ret === RET_OK && fin !== RET_OK) {
    return { ret: fin, campos };
  }
  return { ret, campos };
}
function pagarComSitef(params, deps = {}) {
  const config = deps.config ?? configSitefPadrao();
  const dll2 = deps.dll ?? null;
  const status2 = statusSitefCom(
    config,
    dll2,
    dll2 ? config.dllPath || "injetada" : null
  );
  if (!status2.disponivel || !dll2) {
    return {
      ok: false,
      manual: true,
      mensagem: status2.mensagem
    };
  }
  if (!(params.valor > 0)) {
    return {
      ok: false,
      manual: false,
      mensagem: "Valor inválido para o SiTef"
    };
  }
  const cfgRet = garantirConfigurado(dll2, config);
  if (cfgRet !== RET_OK) {
    return {
      ok: false,
      manual: false,
      mensagem: mensagemRetornoSitef(cfgRet)
    };
  }
  const agora = deps.agora?.() ?? /* @__PURE__ */ new Date();
  const { data, hora } = dataHoraFiscal(agora);
  const cupom = params.cupom?.trim() || cupomFiscalPadrao(agora);
  const { ret, campos } = executarFuncaoInterativa(dll2, {
    funcao: FUNCAO_PAGAMENTO,
    valor: valorParaSitef(params.valor),
    cupom,
    data,
    hora,
    operador: params.operador?.trim() || "PDV",
    restricoes: parametrosEfetivosSitef(config)
  });
  if (ret !== RET_OK) {
    return {
      ok: false,
      manual: false,
      mensagem: mensagemRetornoSitef(ret)
    };
  }
  const extraidos = extrairCamposSitef(campos);
  return {
    ok: true,
    manual: false,
    ...extraidos,
    mensagem: mensagemRetornoSitef(RET_OK)
  };
}
function cancelarComSitef(params, deps = {}) {
  const config = deps.config ?? configSitefPadrao();
  const dll2 = deps.dll ?? null;
  const status2 = statusSitefCom(
    config,
    dll2,
    dll2 ? config.dllPath || "injetada" : null
  );
  if (!status2.disponivel || !dll2) {
    return {
      ok: true,
      manual: true,
      mensagem: status2.mensagem
    };
  }
  const cfgRet = garantirConfigurado(dll2, config);
  if (cfgRet !== RET_OK) {
    return { ok: false, manual: false, mensagem: mensagemRetornoSitef(cfgRet) };
  }
  const agora = deps.agora?.() ?? /* @__PURE__ */ new Date();
  const { data, hora } = dataHoraFiscal(agora);
  const cupom = params.cupom?.trim() || cupomFiscalPadrao(agora);
  const valor = params.valor && params.valor > 0 ? valorParaSitef(params.valor) : "0";
  const restricoes = [
    parametrosEfetivosSitef(config),
    params.nsu ? `{NSU=${params.nsu}}` : ""
  ].filter(Boolean).join(";");
  const { ret } = executarFuncaoInterativa(dll2, {
    funcao: FUNCAO_CANCELAMENTO,
    valor,
    cupom,
    data,
    hora,
    operador: params.operador?.trim() || "PDV",
    restricoes
  });
  if (ret !== RET_OK) {
    return { ok: false, manual: false, mensagem: mensagemRetornoSitef(ret) };
  }
  return { ok: true, manual: false, mensagem: "Cancelamento SiTef ok" };
}
function resetarConfiguracaoSitef() {
  chaveConfigurada = null;
}
async function sitefPagar(params) {
  const config = await lerConfigSitef();
  const carregada = config.habilitado ? carregarDll(config.dllPath) : null;
  return pagarComSitef(params, { config, dll: carregada?.api ?? null });
}
async function sitefCancelar(params) {
  const config = await lerConfigSitef();
  const carregada = config.habilitado ? carregarDll(config.dllPath) : null;
  return cancelarComSitef(params, { config, dll: carregada?.api ?? null });
}
const servico$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  cancelarComSitef,
  configSitefPadrao,
  executarFuncaoInterativa,
  lerConfigSitef,
  montarParametrosSitef,
  normalizarPortaPinPad,
  pagarComSitef,
  parametrosEfetivosSitef,
  resetarConfiguracaoSitef,
  sitefCancelar,
  sitefPagar,
  statusSitef,
  statusSitefCom
}, Symbol.toStringTag, { value: "Module" }));
const CHAVES_CONFIG_NEGOCIO = [
  "qtd_mesas",
  "modelo_atendimento",
  "tempo_ociosidade_min",
  "emitir_nfce",
  "pix_chave",
  "api_url",
  "taxa_servico_percentual",
  "couvert_valor",
  "terminais_pdv_json",
  "etiqueta_balanca_habilitada",
  "etiqueta_balanca_prefixo",
  "etiqueta_balanca_digitos_codigo",
  "etiqueta_balanca_conteudo",
  "etiqueta_balanca_centavos",
  "etiqueta_balanca_indicador_uso",
  "taxa_entrega_padrao",
  "bairros_entrega"
];
const CHAVES_CONFIG_LOCAL = [
  "numeropdv",
  "pdv_modo",
  "pdv_principal_host",
  "pdv_principal_porta",
  "pdv_identificador",
  "pdv_principal_token",
  "database_url",
  "lan_habilitada",
  "lan_porta",
  "impressora_nome",
  "impressora_tipo",
  "impressora_host",
  "impressora_porta",
  "certificado_path",
  "certificado_senha",
  "certificado_apelido",
  "certificado_validade",
  "fiscal_ultima_sync",
  "fiscal_sync_erro",
  "tecnibra_habilitada",
  "tecnibra_xml_path",
  "tecnibra_intervalo_ms",
  "tecnibra_xml_root",
  "tecnibra_xml_item",
  "sitef_habilitado",
  "sitef_ip",
  "sitef_loja",
  "sitef_terminal",
  "sitef_parametros",
  "sitef_porta_pinpad",
  "sitef_dll_path",
  "balanca_habilitada",
  "balanca_porta",
  "balanca_baud",
  "balanca_protocolo",
  "tema",
  "senha_gerencial_hash",
  "senha_gerencial_salt"
];
function normalizarModoPdv(valor) {
  return valor === "secundario" ? "secundario" : "principal";
}
function parseNumeroPdv(valor) {
  const n = typeof valor === "number" ? valor : Number(String(valor ?? "").trim());
  if (!Number.isInteger(n) || n < 1) {
    return 0;
  }
  return n;
}
function montarUrlPrincipal(host, porta) {
  const bruto = host.trim();
  if (!bruto) {
    throw new Error("Informe o IP ou hostname do PDV principal.");
  }
  const semEsquema = bruto.replace(/^https?:\/\//i, "");
  const semPath = semEsquema.split("/")[0] ?? "";
  const hostname = semPath.replace(/:\d+$/, "").trim();
  if (!hostname) {
    throw new Error("Informe o IP ou hostname do PDV principal.");
  }
  const portaNum = Math.max(1, Number(porta) || 5050);
  return `http://${hostname}:${portaNum}`;
}
function validarNumeroPdv(params) {
  const numero2 = parseNumeroPdv(params.proposto);
  if (!numero2) {
    return {
      ok: false,
      codigo: "invalido",
      mensagem: "Informe um número de PDV inteiro maior que zero."
    };
  }
  if (numero2 === params.numeroPrincipal) {
    return {
      ok: false,
      codigo: "mesmo_principal",
      mensagem: `O número ${numero2} é o do PDV principal. Escolha outro para o secundário.`
    };
  }
  const ocupados = params.ocupados ?? [];
  if (ocupados.includes(numero2)) {
    return {
      ok: false,
      codigo: "duplicado",
      mensagem: `Já existe um PDV com o número ${numero2} conectado ao principal.`
    };
  }
  return { ok: true, numero: numero2 };
}
function mesclarConfigNegocio(local, remota) {
  const localSet = new Set(CHAVES_CONFIG_LOCAL);
  const negocioSet = new Set(CHAVES_CONFIG_NEGOCIO);
  const saida = { ...local };
  for (const [chave, valor] of Object.entries(remota)) {
    if (localSet.has(chave)) {
      continue;
    }
    if (!negocioSet.has(chave)) {
      continue;
    }
    if (typeof valor === "string") {
      saida[chave] = valor;
    }
  }
  return saida;
}
function extrairConfigNegocio(config) {
  const saida = {};
  for (const chave of CHAVES_CONFIG_NEGOCIO) {
    if (config[chave] !== void 0) {
      saida[chave] = config[chave];
    }
  }
  return saida;
}
function identidadePdvMudou(atual, proposto) {
  const campos = [
    "pdv_modo",
    "numeropdv",
    "pdv_principal_host",
    "pdv_principal_porta"
  ];
  return campos.some(
    (chave) => proposto[chave] !== void 0 && proposto[chave] !== (atual[chave] ?? "")
  );
}
const CHAVE = "pdv_terminais";
async function lerTerminais() {
  const raw = await getConfig(CHAVE, "[]");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const t = item;
      const numero2 = parseNumeroPdv(t.numero);
      const identificador = String(t.identificador ?? "").trim();
      const token = String(t.token ?? "").trim();
      if (!numero2 || !identificador || !token) {
        return null;
      }
      return {
        numero: numero2,
        identificador,
        token,
        vistoem: String(t.vistoem ?? "")
      };
    }).filter((t) => t !== null);
  } catch {
    return [];
  }
}
async function salvarTerminais(terminais) {
  await setConfig(CHAVE, JSON.stringify(terminais));
}
async function numerosOcupadosPorSecundarios(excetoIdentificador) {
  const terminais = await lerTerminais();
  return terminais.filter((t) => t.identificador !== excetoIdentificador).map((t) => t.numero);
}
async function tokenTerminalValido(token) {
  if (!token.trim()) {
    return false;
  }
  const terminais = await lerTerminais();
  return terminais.some((t) => t.token === token);
}
async function handshakeTerminal(params) {
  const identificador = params.identificador.trim();
  if (!identificador) {
    throw new Error("Identificador do PDV secundário ausente.");
  }
  const ocupados = await numerosOcupadosPorSecundarios(identificador);
  const validacao = validarNumeroPdv({
    proposto: params.numeropdv,
    numeroPrincipal: params.numeroPrincipal,
    ocupados
  });
  if (!validacao.ok) {
    const err = new Error(validacao.mensagem);
    err.name = "NumeroPdvDuplicadoError";
    throw err;
  }
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  const terminais = await lerTerminais();
  const existente = terminais.find((t) => t.identificador === identificador);
  const token = existente?.token || uuid.v4();
  const proximo = {
    numero: validacao.numero,
    identificador,
    token,
    vistoem: agora
  };
  const demais = terminais.filter((t) => t.identificador !== identificador);
  await salvarTerminais([...demais, proximo]);
  return { token, numeropdv: validacao.numero };
}
async function assertNumeroPrincipalLivre(numero2) {
  const choque = (await lerTerminais()).find((t) => t.numero === numero2);
  if (choque) {
    throw new Error(
      `O número ${numero2} já está em uso por um PDV secundário. Escolha outro ou desconecte o terminal.`
    );
  }
}
class PrincipalOfflineError extends Error {
  constructor(message) {
    super(message);
    this.name = "PrincipalOfflineError";
  }
}
class NumeroPdvDuplicadoError extends Error {
  constructor(message) {
    super(message);
    this.name = "NumeroPdvDuplicadoError";
  }
}
class PrincipalNaoAutorizadoError extends Error {
  constructor(message) {
    super(message);
    this.name = "PrincipalNaoAutorizadoError";
  }
}
async function requisitarPrincipal(baseUrl2, path, init = {}) {
  const url = `${baseUrl2.replace(/\/+$/, "")}${path}`;
  const { token, headers, timeoutMs = 8e3, ...resto } = init;
  let res;
  try {
    res = await fetch(url, {
      ...resto,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...token ? { Authorization: `Bearer ${token}` } : {},
        ...headers
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch {
    throw new PrincipalOfflineError(
      `PDV principal offline ou inacessível em ${baseUrl2}. Verifique o IP, a porta e se o principal está ligado com a API LAN ativa.`
    );
  }
  const body = await res.json().catch(() => ({}));
  const mensagem = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : `Erro ${res.status} ao falar com o PDV principal`;
  if (!res.ok) {
    if (res.status === 401 || /não autoriz|sessão/i.test(mensagem)) {
      throw new PrincipalNaoAutorizadoError(mensagem);
    }
    if (res.status === 409 || /duplicad|mesmo número|é o do PDV principal/i.test(mensagem)) {
      throw new NumeroPdvDuplicadoError(mensagem);
    }
    throw new Error(mensagem);
  }
  return body;
}
async function requisitar(baseUrl2, path, init = {}) {
  return requisitarPrincipal(baseUrl2, path, init);
}
function unwrapDataEnvelope(body) {
  if (body && typeof body === "object" && "data" in body && body.data !== void 0) {
    return body.data;
  }
  return body;
}
function urlDoPrincipal(host, porta) {
  return montarUrlPrincipal(host, porta);
}
async function pingIdentidade(baseUrl2) {
  return requisitar(baseUrl2, "/pos/pdv/identidade");
}
async function buscarTerminaisRemoto(baseUrl2) {
  return requisitar(baseUrl2, "/pos/pdv/terminais");
}
async function handshakePrincipal(baseUrl2, params) {
  return requisitar(baseUrl2, "/pos/pdv/handshake", {
    method: "POST",
    body: JSON.stringify(params)
  });
}
async function puxarConfigNegocioRemota(baseUrl2, token) {
  const body = await requisitar(
    baseUrl2,
    "/pos/pdv/config-negocio",
    { token }
  );
  return body.config ?? {};
}
async function puxarCatalogoRemoto(baseUrl2, token) {
  return requisitar(baseUrl2, "/pos/pdv/catalogo", { token });
}
let ultimoStatus = {
  online: false,
  erro: null,
  numeropdvPrincipal: null,
  url: null
};
function statusPrincipalCache() {
  return { ...ultimoStatus };
}
async function obterIdentificadorLocal() {
  const atual = (await getConfig("pdv_identificador", "")).trim();
  if (atual) {
    return atual;
  }
  const id = uuid.v4();
  await setConfig("pdv_identificador", id);
  return id;
}
async function ehSecundario() {
  return normalizarModoPdv(await getConfig("pdv_modo", "principal")) === "secundario";
}
function urlConfigurada(host, porta) {
  const h = (host ?? "").trim();
  if (!h) {
    throw new PrincipalOfflineError(
      "Informe o IP do PDV principal nas configurações."
    );
  }
  return urlDoPrincipal(h, porta || "5050");
}
async function conectarNoPrincipal(params) {
  const host = params?.host ?? await getConfig("pdv_principal_host", "");
  const porta = params?.porta ?? await getConfig("pdv_principal_porta", "5050");
  const numeropdv = parseNumeroPdv(
    params?.numeropdv ?? await getConfig("numeropdv", "1")
  );
  if (!numeropdv) {
    throw new Error("Informe um número de PDV inteiro maior que zero.");
  }
  const url = urlConfigurada(host, porta);
  let identidade;
  try {
    identidade = await pingIdentidade(url);
  } catch (err) {
    ultimoStatus = {
      online: false,
      erro: err instanceof Error ? err.message : "PDV principal offline ou inacessível.",
      numeropdvPrincipal: null,
      url
    };
    throw err;
  }
  if (normalizarModoPdv(identidade.modo) === "secundario") {
    const erro = "O endereço apontado também está em modo secundário. Informe o PDV principal (onde fica o banco).";
    ultimoStatus = {
      online: false,
      erro,
      numeropdvPrincipal: identidade.numeropdv,
      url
    };
    throw new Error(erro);
  }
  const identificador = await obterIdentificadorLocal();
  try {
    const hs = await handshakePrincipal(url, { numeropdv, identificador });
    await setConfig("pdv_principal_token", hs.token);
    ultimoStatus = {
      online: true,
      erro: null,
      numeropdvPrincipal: identidade.numeropdv,
      url
    };
    return {
      token: hs.token,
      url,
      numeropdvPrincipal: identidade.numeropdv
    };
  } catch (err) {
    ultimoStatus = {
      online: false,
      erro: err instanceof Error ? err.message : "Falha no handshake",
      numeropdvPrincipal: identidade.numeropdv,
      url
    };
    throw err;
  }
}
async function puxarDoPrincipal() {
  const host = await getConfig("pdv_principal_host", "");
  const porta = await getConfig("pdv_principal_porta", "5050");
  const url = urlConfigurada(host, porta);
  let token = (await getConfig("pdv_principal_token", "")).trim();
  if (!token) {
    const hs = await conectarNoPrincipal({ host, porta });
    token = hs.token;
  }
  let catalogo;
  let remota;
  try {
    [catalogo, remota] = await Promise.all([
      puxarCatalogoRemoto(url, token),
      puxarConfigNegocioRemota(url, token)
    ]);
  } catch (err) {
    if (err instanceof PrincipalOfflineError) {
      ultimoStatus = { ...ultimoStatus, online: false, erro: err.message, url };
    }
    throw err;
  }
  if (catalogo.grupos?.length) {
    await upsertGrupos(catalogo.grupos);
  }
  if (catalogo.gruposGourmet?.length) {
    await upsertGruposGourmet(catalogo.gruposGourmet);
  }
  if (catalogo.produtos?.length) {
    await upsertProdutos(catalogo.produtos);
  }
  if (catalogo.atalhos?.length) {
    await salvarAtalhos(catalogo.atalhos.map((a) => a.id).filter(Boolean));
  }
  if (catalogo.clientes?.length) {
    await upsertClientes(catalogo.clientes);
  }
  if (catalogo.bandeiras?.length) {
    await upsertBandeirasCartao(catalogo.bandeiras);
  }
  if (catalogo.meiosPagamento?.length) {
    await upsertMeiosPagamento(catalogo.meiosPagamento);
  }
  const local = await getAllConfig();
  const mesclada = mesclarConfigNegocio(local, remota);
  const patch = {};
  for (const [chave, valor] of Object.entries(mesclada)) {
    if (local[chave] !== valor) {
      patch[chave] = valor;
    }
  }
  if (Object.keys(patch).length) {
    await salvarConfiguracoes(patch);
  }
  ultimoStatus = {
    online: true,
    erro: null,
    numeropdvPrincipal: ultimoStatus.numeropdvPrincipal,
    url
  };
  return {
    produtos: catalogo.produtos?.length ?? 0,
    grupos: catalogo.grupos?.length ?? 0,
    gruposGourmet: catalogo.gruposGourmet?.length ?? 0,
    atalhos: catalogo.atalhos?.length ?? 0,
    clientes: catalogo.clientes?.length ?? 0,
    bandeiras: catalogo.bandeiras?.length ?? 0,
    meiosPagamento: catalogo.meiosPagamento?.length ?? 0
  };
}
async function sincronizarSecundarioPeriodico() {
  if (!await ehSecundario()) {
    return;
  }
  try {
    await conectarNoPrincipal();
    await puxarDoPrincipal();
  } catch {
  }
}
async function garantirOperacaoSecundario() {
  if (!await ehSecundario()) {
    return;
  }
  if (ultimoStatus.online) {
    return;
  }
  try {
    await conectarNoPrincipal();
  } catch (err) {
    throw new PrincipalOfflineError(
      err instanceof Error ? err.message : "PDV principal offline. Operação bloqueada."
    );
  }
}
async function validarIdentidadeAoSalvar(proposto) {
  const atual = await getAllConfig();
  const modo = normalizarModoPdv(proposto.pdv_modo ?? atual.pdv_modo);
  if (modo !== "secundario") {
    return;
  }
  if (!identidadePdvMudou(atual, proposto) && atual.pdv_modo === "secundario") {
    return;
  }
  await conectarNoPrincipal({
    host: proposto.pdv_principal_host ?? atual.pdv_principal_host,
    porta: proposto.pdv_principal_porta ?? atual.pdv_principal_porta,
    numeropdv: proposto.numeropdv ?? atual.numeropdv
  });
}
async function testarConexaoPrincipal(params) {
  const { numeropdvPrincipal } = await conectarNoPrincipal(params);
  return {
    ok: true,
    numeropdvPrincipal,
    mensagem: `Conectado ao PDV principal nº ${numeropdvPrincipal}. Número ${params.numeropdv} aceito.`
  };
}
async function buscarOpcoesPdvNoPrincipal(params) {
  const url = urlConfigurada(params.host, params.porta);
  let remoto2;
  try {
    remoto2 = await buscarTerminaisRemoto(url);
  } catch (err) {
    ultimoStatus = {
      online: false,
      erro: err instanceof Error ? err.message : "PDV principal offline ou inacessível.",
      numeropdvPrincipal: null,
      url
    };
    throw err;
  }
  const principal = Number(remoto2.numeropdvPrincipal) || 0;
  const ocupados = new Set(
    (remoto2.ocupados ?? []).map((n) => Number(n)).filter((n) => n > 0)
  );
  const mapa = /* @__PURE__ */ new Map();
  for (const t of remoto2.terminais ?? []) {
    const n = Number(t.numeropdv);
    if (!Number.isInteger(n) || n < 1) continue;
    mapa.set(n, t.descricao ?? null);
  }
  if (principal > 0 && !mapa.has(principal)) {
    mapa.set(principal, "Principal");
  }
  const terminais = [...mapa.entries()].sort((a, b) => a[0] - b[0]).map(([numeropdv, descricao]) => {
    if (numeropdv === principal) {
      return {
        numeropdv,
        descricao,
        disponivel: false,
        motivo: "é o PDV principal"
      };
    }
    if (ocupados.has(numeropdv)) {
      return {
        numeropdv,
        descricao,
        disponivel: false,
        motivo: "já em uso por outro secundário"
      };
    }
    return { numeropdv, descricao, disponivel: true };
  });
  ultimoStatus = {
    online: true,
    erro: null,
    numeropdvPrincipal: principal || null,
    url
  };
  const livres = terminais.filter((t) => t.disponivel).length;
  return {
    numeropdvPrincipal: principal,
    terminais,
    mensagem: livres > 0 ? `Principal nº ${principal} online. ${livres} número(s) disponível(is) para este secundário.` : `Principal nº ${principal} online, mas não há outro terminal livre no cadastro. Cadastre PDV 2, 3… no retaguarda (NFC-e → Terminais PDV).`
  };
}
const servico = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  NumeroPdvDuplicadoError,
  PrincipalOfflineError,
  buscarOpcoesPdvNoPrincipal,
  conectarNoPrincipal,
  ehSecundario,
  garantirOperacaoSecundario,
  obterIdentificadorLocal,
  puxarDoPrincipal,
  sincronizarSecundarioPeriodico,
  statusPrincipalCache,
  testarConexaoPrincipal,
  validarIdentidadeAoSalvar
}, Symbol.toStringTag, { value: "Module" }));
const TIMEOUT_OP_MS = 2e4;
async function conexaoPrincipal() {
  await garantirOperacaoSecundario();
  const host = await getConfig("pdv_principal_host", "");
  const porta = await getConfig("pdv_principal_porta", "5050");
  if (!host.trim()) {
    throw new Error("Informe o IP do PDV principal nas configurações.");
  }
  let token = (await getConfig("pdv_principal_token", "")).trim();
  const url = urlDoPrincipal(host, porta || "5050");
  if (!token) {
    const hs = await conectarNoPrincipal({ host, porta });
    token = hs.token;
  }
  return { url, token };
}
async function remoto(path, init = {}) {
  const { timeoutMs = TIMEOUT_OP_MS, ...resto } = init;
  const tentar = async () => {
    const { url, token } = await conexaoPrincipal();
    return requisitarPrincipal(url, path, {
      ...resto,
      token,
      timeoutMs
    });
  };
  try {
    return await tentar();
  } catch (err) {
    if (!(err instanceof PrincipalNaoAutorizadoError)) {
      throw err;
    }
    await conectarNoPrincipal();
    return tentar();
  }
}
function jsonBody(body) {
  return {
    method: "POST",
    body: JSON.stringify(body ?? {})
  };
}
async function listarMesasRemoto() {
  const body = await remoto("/pos/mesas");
  return unwrapDataEnvelope(body);
}
async function obterMesaRemoto(numero2) {
  return remoto(`/pos/mesas/${numero2}`);
}
async function obterContaPorNumeroRemoto(numero2) {
  return remoto(`/pos/mesas/${numero2}/conta`);
}
async function abrirContaMesaRemoto(numero2, nomecliente) {
  return remoto(
    `/pos/mesas/${numero2}/abrir`,
    jsonBody(nomecliente ? { nomecliente } : {})
  );
}
async function adicionarItemNaMesaRemoto(numero2, item, nomecliente) {
  return remoto(
    `/pos/mesas/${numero2}/itens`,
    jsonBody({ ...item, ...nomecliente ? { nomecliente } : {} })
  );
}
async function limparContasVaziasRemoto() {
  const body = await remoto(
    "/pos/mesas/limpar-vazias",
    jsonBody({})
  );
  if (typeof body === "number") {
    return body;
  }
  return Number(body.removidas ?? 0);
}
async function obterContaMesaRemoto(id) {
  return remoto(`/pos/contas/${encodeURIComponent(id)}`);
}
async function adicionarItemContaRemoto(idconta, item) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/itens`,
    jsonBody(item)
  );
}
async function atualizarNomeClienteContaRemoto(idconta, nomecliente) {
  return remoto(`/pos/contas/${encodeURIComponent(idconta)}/nome`, {
    method: "PUT",
    body: JSON.stringify({ nomecliente })
  });
}
async function enviarPedidoContaRemoto(idconta, clientOrderId, itens) {
  return remoto(`/pos/contas/${encodeURIComponent(idconta)}/pedido`, {
    method: "POST",
    body: JSON.stringify({ clientOrderId, itens })
  });
}
async function cancelarContaMesaRemoto(idconta) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/cancelar`,
    jsonBody({})
  );
}
async function cancelarItemContaRemoto(idconta, iditem, senha) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/itens/${encodeURIComponent(iditem)}/cancelar`,
    jsonBody(senha != null && senha !== "" ? { senha } : {})
  );
}
async function aplicarAjustesContaRemoto(idconta, ajustes) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/ajustes`,
    jsonBody(ajustes)
  );
}
async function registrarPagamentoContaRemoto(idconta, lancamentos, troco) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/pagamento`,
    jsonBody({ lancamentos, troco })
  );
}
async function fecharContaMesaRemoto(idconta, lancamentos, troco, cliente) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/fechar`,
    jsonBody({ lancamentos, troco, cliente })
  );
}
async function fecharFatiaItensRemoto(idconta, idsItens, lancamentos, troco, cliente) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/fatia`,
    jsonBody({ idsItens, lancamentos, troco, cliente })
  );
}
async function transferirContaRemoto(idconta, numeroDestino) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/transferir`,
    jsonBody({ numeroDestino })
  );
}
async function transferirItensRemoto(idcontaOrigem, idsItens, numeroDestino) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idcontaOrigem)}/transferir`,
    jsonBody({ idsItens, numeroDestino })
  );
}
async function juntarContasRemoto(idOrigem, numeroDestino) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idOrigem)}/juntar`,
    jsonBody({ numeroDestino })
  );
}
async function aplicarTaxaEntregaRemoto(idconta, valorentrega) {
  return remoto(
    `/pos/contas/${encodeURIComponent(idconta)}/taxa-entrega`,
    jsonBody({ valorentrega })
  );
}
async function atualizarDadosEntregaRemoto(idconta, dados) {
  return remoto(`/pos/delivery/${encodeURIComponent(idconta)}`, {
    method: "PATCH",
    body: JSON.stringify(dados)
  });
}
async function listarPedidosEntregaRemoto(statusFiltro) {
  const qs = statusFiltro != null && statusFiltro !== "" ? `?status=${encodeURIComponent(statusFiltro)}` : "";
  const body = await remoto(`/pos/delivery${qs}`);
  return unwrapDataEnvelope(body);
}
async function abrirPedidoEntregaRemoto(params) {
  return remoto("/pos/delivery", jsonBody(params));
}
async function atualizarStatusEntregaRemoto(idconta, status2) {
  return remoto(
    `/pos/delivery/${encodeURIComponent(idconta)}/status`,
    jsonBody({ status: status2 ?? null })
  );
}
async function listarPedidosFilaRemoto(pendentes) {
  const qs = `?pendentes=${pendentes ? "1" : "0"}`;
  const body = await remoto(`/pos/pedidos${qs}`);
  return unwrapDataEnvelope(body);
}
async function limparFilaPedidosRemoto() {
  return remoto("/pos/pedidos/limpar-fila", jsonBody({}));
}
async function marcarPedidoEntregueRemoto(id) {
  return remoto(
    `/pos/pedidos/${encodeURIComponent(id)}/entregue`,
    jsonBody({})
  );
}
async function listarVendasRemoto() {
  return remoto("/pos/vendas");
}
async function obterVendaRemoto(id) {
  return remoto(`/pos/vendas/${encodeURIComponent(id)}`);
}
async function criarVendaRapidaRemoto(input) {
  return remoto("/pos/vendas/rapida", {
    method: "POST",
    body: JSON.stringify({
      itens: input.itens,
      lancamentos: input.lancamentos,
      meio: input.meio,
      troco: input.troco,
      cliente: input.cliente,
      desconto: input.valordesconto
    }),
    timeoutMs: TIMEOUT_OP_MS
  });
}
function slugBackupEmpresa(nome, id) {
  const slug = nome.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40).toLowerCase();
  const idCurto = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "id";
  return `${slug || "empresa"}_${idCurto}`;
}
function carimboArquivoBackup(data = /* @__PURE__ */ new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${data.getFullYear()}${p(data.getMonth() + 1)}${p(data.getDate())}-${p(data.getHours())}${p(data.getMinutes())}${p(data.getSeconds())}`;
}
async function listarArquivos(raiz) {
  const saida = [];
  async function andar(atual) {
    const entradas = await promises.readdir(atual, { withFileTypes: true });
    for (const entrada of entradas) {
      const caminho = node_path.join(atual, entrada.name);
      if (entrada.isDirectory()) {
        await andar(caminho);
      } else if (entrada.isFile()) {
        saida.push(caminho);
      }
    }
  }
  await andar(raiz);
  return saida;
}
function nomeTar(raiz, arquivo) {
  return node_path.relative(raiz, arquivo).split(node_path.sep).join("/");
}
function cabecalhoTar(nome, tamanho) {
  const buf = Buffer.alloc(512);
  const nomeBytes = Buffer.from(nome, "utf8");
  if (nomeBytes.length > 100) {
    throw new Error(`Caminho longo demais no backup: ${nome}`);
  }
  nomeBytes.copy(buf, 0);
  buf.write("0000644\0", 100, 8, "latin1");
  buf.write("0000000\0", 108, 8, "latin1");
  buf.write("0000000\0", 116, 8, "latin1");
  buf.write(`${tamanho.toString(8).padStart(11, "0")}\0`, 124, 12, "latin1");
  buf.write(
    `${Math.floor(Date.now() / 1e3).toString(8).padStart(11, "0")}\0`,
    136,
    12,
    "latin1"
  );
  buf.write("        ", 148, 8, "latin1");
  buf.write("0", 156, 1, "latin1");
  buf.write("ustar\0", 257, 6, "latin1");
  buf.write("00", 263, 2, "latin1");
  let soma = 0;
  for (let i = 0; i < 512; i++) {
    soma += buf[i] ?? 0;
  }
  buf.write(`${soma.toString(8).padStart(6, "0")}\0 `, 148, 8, "latin1");
  return buf;
}
function paddingTar(tamanho) {
  const resto = tamanho % 512;
  return resto === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - resto);
}
async function compactarPastaTarGz(pasta, destino) {
  const arquivos = await listarArquivos(pasta);
  async function* partes() {
    for (const arquivo of arquivos) {
      const dados = await promises.readFile(arquivo);
      const info = await promises.stat(arquivo);
      yield cabecalhoTar(nomeTar(pasta, arquivo), info.size);
      yield dados;
      const pad2 = paddingTar(info.size);
      if (pad2.length) {
        yield pad2;
      }
    }
    yield Buffer.alloc(1024);
  }
  await promises$1.pipeline(
    node_stream.Readable.from(partes()),
    node_zlib.createGzip({ level: 9 }),
    node_fs.createWriteStream(destino)
  );
}
const TABELAS_BACKUP_OPERACIONAL = [
  "item_conta",
  "pedido_fila",
  "conta_pagamento",
  "item_venda",
  "pagamento",
  "nfce_local",
  "venda",
  "conta_mesa",
  "caixa_turno",
  "atalho",
  "produto_cache",
  "impressora_grupo_gourmet",
  "grupo_gourmet",
  "grupo",
  "mesa",
  "outbox",
  "sync_meta"
];
async function pastaBackupPadrao() {
  return dirBackupsEmpresa();
}
async function criarBackupLocal(params) {
  const sessao = await obterSessao().catch(() => ({
    idempresa: "",
    nomeempresa: ""
  }));
  const idempresa = params.idempresa?.trim() || sessao.idempresa?.trim() || "local";
  const nomeempresa = params.nomeempresa?.trim() || sessao.nomeempresa?.trim() || "PDV";
  const pasta = (params.pasta?.trim() || dirBackupsEmpresa()).replace(
    /[/\\]+$/,
    ""
  );
  await promises.mkdir(pasta, { recursive: true });
  const slug = slugBackupEmpresa(nomeempresa, idempresa);
  const base = `${carimboArquivoBackup()}_${slug}`;
  const tmp = node_path.join(pasta, `.tmp-${base}`);
  const arquivo = node_path.join(pasta, `${base}.tar.gz`);
  try {
    await promises.mkdir(node_path.join(tmp, "tabelas"), { recursive: true });
    const pastaXml = dirXmlNfce();
    const destXml = node_path.join(tmp, "xml-nfce");
    if (node_fs.existsSync(pastaXml)) {
      await promises.cp(pastaXml, destXml, { recursive: true });
    } else {
      await promises.mkdir(destXml, { recursive: true });
    }
    const pastaCert = dirCertificadosPdv();
    const destCert = node_path.join(tmp, "certificados");
    if (node_fs.existsSync(pastaCert)) {
      await promises.cp(pastaCert, destCert, { recursive: true });
    } else {
      await promises.mkdir(destCert, { recursive: true });
    }
    const manifesto = {
      geradoem: (/* @__PURE__ */ new Date()).toISOString(),
      motivo: params.motivo,
      idempresa,
      nomeempresa,
      ...params.extraManifesto
    };
    await promises.writeFile(
      node_path.join(tmp, "manifesto.json"),
      `${JSON.stringify(manifesto, null, 2)}
`,
      "utf8"
    );
    const config = await query(
      "SELECT chave, valor FROM config"
    );
    await promises.writeFile(
      node_path.join(tmp, "config.json"),
      `${JSON.stringify(config, null, 2)}
`,
      "utf8"
    );
    for (const tabela of TABELAS_BACKUP_OPERACIONAL) {
      const rows = await query(`SELECT * FROM ${tabela}`);
      await promises.writeFile(
        node_path.join(tmp, "tabelas", `${tabela}.json`),
        `${JSON.stringify(rows)}
`,
        "utf8"
      );
    }
    const numeracao = await query("SELECT * FROM numeracao_nfce");
    await promises.writeFile(
      node_path.join(tmp, "tabelas", "numeracao_nfce.json"),
      `${JSON.stringify(numeracao)}
`,
      "utf8"
    );
    const xmls = await query(
      "SELECT chave, serie, numero, xml FROM nfce_local WHERE xml IS NOT NULL"
    );
    for (const row of xmls) {
      if (!row.xml?.trim()) continue;
      const chave = (row.chave ?? "").replace(/\D/g, "");
      const nome = chave.length === 44 ? `${chave}.xml` : `S${row.serie}-N${row.numero}.xml`;
      await promises.writeFile(node_path.join(destXml, nome), row.xml, "utf8");
    }
    await compactarPastaTarGz(tmp, arquivo);
  } catch (err) {
    await promises.rm(tmp, { recursive: true, force: true }).catch(() => void 0);
    await promises.rm(arquivo, { force: true }).catch(() => void 0);
    const detalhe = err instanceof Error ? err.message : String(err);
    throw new Error(`Não foi possível gerar o backup: ${detalhe}`);
  }
  await promises.rm(tmp, { recursive: true, force: true }).catch(() => void 0);
  return { arquivo, pasta, motivo: params.motivo };
}
const NOME_BACKUP = /^\d{8}-\d{6}_.+\.tar\.gz$/;
function normalizarFrequenciaBackup(valor) {
  if (valor === "caixa" || valor === "diario" || valor === "hora") {
    return valor;
  }
  return "manual";
}
function normalizarHoraBackup(valor) {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(valor.trim());
  if (!m) return "22:00";
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
function normalizarManterBackups(valor) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isFinite(n)) return 14;
  return Math.min(365, Math.max(1, n));
}
function deveExecutarBackupAgendado(params) {
  if (!params.habilitado) return false;
  if (params.frequencia !== "diario" && params.frequencia !== "hora") {
    return false;
  }
  const agora = params.agora ?? /* @__PURE__ */ new Date();
  const ultimo = params.ultimoIso ? new Date(params.ultimoIso) : null;
  const ultimoOk = ultimo && !Number.isNaN(ultimo.getTime()) ? ultimo : null;
  if (params.frequencia === "hora") {
    if (!ultimoOk) return true;
    return agora.getTime() - ultimoOk.getTime() >= 60 * 60 * 1e3;
  }
  const [hh, mm] = normalizarHoraBackup(params.hora).split(":").map((p) => Number(p));
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const minutosAlvo = (hh ?? 22) * 60 + (mm ?? 0);
  if (minutosAgora < minutosAlvo) return false;
  if (!ultimoOk) return true;
  return ultimoOk.getFullYear() !== agora.getFullYear() || ultimoOk.getMonth() !== agora.getMonth() || ultimoOk.getDate() !== agora.getDate();
}
async function pastaBackupEfetiva(pastaConfigurada) {
  const informada = (pastaConfigurada ?? "").trim();
  if (informada && node_path.isAbsolute(informada)) {
    return informada;
  }
  return pastaBackupPadrao();
}
async function lerConfigBackup() {
  const pasta = (await getConfig("backup_pasta", "")).trim();
  return {
    habilitado: await getConfig("backup_habilitado", "0") === "1",
    pasta,
    pastaEfetiva: await pastaBackupEfetiva(pasta),
    frequencia: normalizarFrequenciaBackup(
      await getConfig("backup_frequencia", "diario")
    ),
    hora: normalizarHoraBackup(await getConfig("backup_hora", "22:00")),
    manter: normalizarManterBackups(await getConfig("backup_manter", "14")),
    ultimoIso: await getConfig("backup_ultimo", "")
  };
}
async function statusBackupPdv() {
  const cfg = await lerConfigBackup();
  return {
    habilitado: cfg.habilitado,
    pasta: cfg.pasta,
    pastaEfetiva: cfg.pastaEfetiva,
    frequencia: cfg.frequencia,
    hora: cfg.hora,
    manter: cfg.manter,
    ultimo: await getConfig("backup_ultimo", ""),
    ultimoArquivo: await getConfig("backup_ultimo_arquivo", ""),
    ultimoErro: await getConfig("backup_ultimo_erro", "")
  };
}
async function aplicarRetencaoBackups(pasta, manter) {
  const limite = Math.max(1, manter);
  let entradas = [];
  try {
    entradas = await promises.readdir(pasta);
  } catch {
    return 0;
  }
  const arquivos = [];
  for (const nome of entradas) {
    if (!NOME_BACKUP.test(nome)) continue;
    const caminho = node_path.join(pasta, nome);
    try {
      const info = await promises.stat(caminho);
      if (info.isFile()) {
        arquivos.push({ caminho, mtime: info.mtimeMs });
      }
    } catch {
    }
  }
  arquivos.sort((a, b) => b.mtime - a.mtime);
  const remover = arquivos.slice(limite);
  for (const item of remover) {
    await promises.rm(item.caminho, { force: true });
  }
  return remover.length;
}
let gerando = false;
let timer = null;
async function executarBackupPdv(params) {
  if (gerando) {
    throw new Error("Já existe um backup em andamento");
  }
  gerando = true;
  try {
    const cfg = await lerConfigBackup();
    const motivo = params?.motivo ?? "manual";
    if (!params?.forcar && motivo === "caixa" && cfg.frequencia !== "caixa") {
      return statusBackupPdv();
    }
    if (!params?.forcar && motivo !== "manual" && !cfg.habilitado) {
      return statusBackupPdv();
    }
    const pasta = await pastaBackupEfetiva(params?.pasta || cfg.pasta);
    const resultado = await criarBackupLocal({ pasta, motivo });
    await aplicarRetencaoBackups(pasta, cfg.manter);
    await setConfig("backup_ultimo", (/* @__PURE__ */ new Date()).toISOString());
    await setConfig("backup_ultimo_arquivo", resultado.arquivo);
    await setConfig("backup_ultimo_erro", "");
    return statusBackupPdv();
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    await setConfig("backup_ultimo_erro", detalhe).catch(() => void 0);
    throw err;
  } finally {
    gerando = false;
  }
}
async function tickBackupAgendado(agora = /* @__PURE__ */ new Date()) {
  const cfg = await lerConfigBackup();
  if (!deveExecutarBackupAgendado({
    habilitado: cfg.habilitado,
    frequencia: cfg.frequencia,
    hora: cfg.hora,
    ultimoIso: cfg.ultimoIso,
    agora
  })) {
    return;
  }
  await executarBackupPdv({
    motivo: cfg.frequencia,
    forcar: true
  });
}
function pararBackupAgendado() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
async function iniciarBackupAgendado() {
  pararBackupAgendado();
  timer = setInterval(() => {
    void tickBackupAgendado().catch((err) => {
      console.error(
        err instanceof Error ? err.message : "Falha no backup agendado"
      );
    });
  }, 6e4);
  setTimeout(() => {
    void tickBackupAgendado().catch((err) => {
      console.error(
        err instanceof Error ? err.message : "Falha no backup agendado"
      );
    });
  }, 15e3);
}
async function reiniciarBackupAgendado() {
  await iniciarBackupAgendado();
}
function serieNumeroDaChave(chave) {
  const digits = (chave ?? "").replace(/\D/g, "");
  if (digits.length !== 44) {
    return {};
  }
  const serie = Number(digits.slice(22, 25));
  const numero2 = Number(digits.slice(25, 34));
  return {
    ...Number.isFinite(serie) && serie > 0 ? { serie } : {},
    ...Number.isFinite(numero2) && numero2 > 0 ? { numero: numero2 } : {}
  };
}
function numeracaoValida(serie, numero2) {
  return Number.isFinite(serie) && serie >= 1 && Number.isFinite(numero2) && numero2 >= 1;
}
async function resolverXml(dados, status2) {
  if (dados.xml?.trim()) {
    return dados.xml;
  }
  if (status2 !== "autorizada" || !dados.idnotafiscal) {
    return void 0;
  }
  try {
    const cupom = await buscarCupomNfce(dados.idnotafiscal);
    return cupom.xml;
  } catch {
    return void 0;
  }
}
async function gravarNfceLocal(dados, status2) {
  const xml = await resolverXml(dados, status2);
  const daChave = serieNumeroDaChave(dados.chave);
  const serie = Number(dados.serie ?? daChave.serie ?? 0);
  const numero2 = Number(dados.numero ?? daChave.numero ?? 0);
  if (!numeracaoValida(serie, numero2)) {
    return false;
  }
  const existente = await obterNfcePorVenda(dados.idvenda);
  if (existente) {
    await atualizarNfceLocalCampos(existente.id, {
      xml: xml ?? null,
      chave: dados.chave ?? null,
      qrcode: dados.qrCode ?? null,
      protocolo: dados.protocolo ?? null,
      serie,
      numero: numero2,
      status: status2,
      transmitida: status2 === "autorizada"
    });
    await atualizarVendaSync(dados.idvenda, {
      nfce_status: status2,
      idnfce_local: existente.id
    });
    await avancarNumeracaoNfceAposEmissao(serie, numero2);
    return true;
  }
  await salvarNfceLocal({
    id: dados.idnotafiscal ?? uuid.v4(),
    idvenda: dados.idvenda,
    serie,
    numero: numero2,
    chave: dados.chave,
    tpemis: 1,
    status: status2,
    xml,
    qrcode: dados.qrCode,
    protocolo: dados.protocolo,
    transmitida: status2 === "autorizada"
  });
  await avancarNumeracaoNfceAposEmissao(serie, numero2);
  return true;
}
async function persistirNfceOnlineLocal(dados) {
  await gravarNfceLocal(dados, "autorizada");
}
async function aplicarEmissaoNfceNaVendaLocal(vendaId, nfce) {
  const dados = {
    idvenda: vendaId,
    idnotafiscal: nfce.idnotafiscal,
    chave: nfce.chave,
    qrCode: nfce.qrCode,
    protocolo: nfce.protocolo,
    xml: nfce.xml,
    serie: nfce.serie,
    numero: nfce.numero
  };
  if (nfce.emitida || nfce.statusLocal === "autorizada") {
    await gravarNfceLocal(dados, "autorizada");
    return;
  }
  const statusLocal = nfce.statusLocal ?? "erro";
  const gravou = await gravarNfceLocal(dados, statusLocal);
  await atualizarVendaSync(vendaId, {
    nfce_status: statusLocal === "pendente" ? "pendente_contingencia" : statusLocal,
    ...!gravou && nfce.idnotafiscal ? { idnfce_local: nfce.idnotafiscal } : {}
  });
}
const persistirNfceOnline = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aplicarEmissaoNfceNaVendaLocal,
  persistirNfceOnlineLocal
}, Symbol.toStringTag, { value: "Module" }));
let sincronizando = false;
function statusNfceRetaguardaParaPdv(status2) {
  switch (status2) {
    case 100:
      return "autorizada";
    case 101:
    case 135:
      return "cancelada";
    case 102:
      return "inutilizada";
    case 110:
    case 301:
      return "erro";
    case 90:
      return "pendente";
    default:
      return null;
  }
}
async function puxarNfceDaRetaguarda(limite = 40) {
  if (sincronizando) {
    return 0;
  }
  sincronizando = true;
  let atualizadas = 0;
  try {
    const online = await pingApi();
    if (!online) {
      return 0;
    }
    const sessao = await obterSessao();
    if (!sessao.token || !sessao.idempresa) {
      return 0;
    }
    const vendas = await listarVendasComRemoto(limite);
    for (const venda of vendas) {
      if (!venda.idremoto) continue;
      try {
        const remota = await buscarVendaPdvGourmet(venda.idremoto);
        if (!remota.nfce && !remota.idnotafiscalnfce) {
          continue;
        }
        const nfce = remota.nfce ?? {
          idnotafiscal: remota.idnotafiscalnfce ?? "",
          status: null,
          chave: null,
          serie: null,
          numero: null,
          protocolo: null
        };
        if (!nfce.idnotafiscal) continue;
        await aplicarNfceRetaguardaNaVendaLocal(venda.id, nfce);
        atualizadas += 1;
      } catch {
      }
    }
  } finally {
    sincronizando = false;
  }
  return atualizadas;
}
async function aplicarNfceRetaguardaNaVendaLocal(vendaId, nfce) {
  const statusPdv = statusNfceRetaguardaParaPdv(nfce.status);
  if (!statusPdv) {
    return;
  }
  let xml;
  if (statusPdv === "autorizada") {
    const local = await obterNfcePorVenda(vendaId);
    if (!local?.xml?.trim()) {
      try {
        const cupom = await buscarCupomNfce(nfce.idnotafiscal);
        xml = cupom.xml;
      } catch {
        xml = void 0;
      }
    }
  }
  const emitida = statusPdv === "autorizada";
  await aplicarEmissaoNfceNaVendaLocal(vendaId, {
    emitida,
    idnotafiscal: nfce.idnotafiscal,
    chave: nfce.chave ?? void 0,
    protocolo: nfce.protocolo ?? void 0,
    xml,
    serie: nfce.serie ?? void 0,
    numero: nfce.numero != null ? Number(nfce.numero) : void 0,
    statusLocal: statusPdv
  });
}
const CHAVE_CACHE_TERMINAIS_PDV = "terminais_pdv_json";
function parseCacheTerminais(json) {
  try {
    const bruto = JSON.parse(json);
    if (!Array.isArray(bruto)) {
      return [];
    }
    return bruto.map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item;
      const numeropdv = Number(row.numeropdv);
      if (!Number.isInteger(numeropdv) || numeropdv < 1) {
        return null;
      }
      const descricao = typeof row.descricao === "string" && row.descricao.trim() ? row.descricao.trim() : null;
      return { numeropdv, descricao };
    }).filter((item) => item !== null);
  } catch {
    return [];
  }
}
async function lerCacheAsync() {
  return parseCacheTerminais(await getConfig(CHAVE_CACHE_TERMINAIS_PDV, "[]"));
}
async function atualizarCacheTerminaisPdv() {
  const sessao = await obterSessao();
  if (!sessao.idempresa || !sessao.token) {
    return lerCacheAsync();
  }
  const remoto2 = await listarTerminaisPdv(sessao.idempresa);
  const lista = remoto2.filter((item) => item.ativo).map((item) => ({
    numeropdv: item.numeropdv,
    descricao: item.descricao?.trim() ? item.descricao.trim() : null
  })).sort((a, b) => a.numeropdv - b.numeropdv);
  await setConfig(CHAVE_CACHE_TERMINAIS_PDV, JSON.stringify(lista));
  return lista;
}
async function obterTerminaisPdvLocais() {
  try {
    return await atualizarCacheTerminaisPdv();
  } catch {
    return lerCacheAsync();
  }
}
let syncing = false;
async function statusConexao() {
  const online = await pingApi();
  return { online, outboxPendentes: await contarOutboxPendentes() };
}
async function pullCatalogo() {
  const sessao = await obterSessao();
  if (!sessao.idempresa || !sessao.token) {
    return {
      produtos: 0,
      atalhos: 0,
      grupos: 0,
      gruposGourmet: 0,
      clientes: 0,
      bandeiras: 0,
      meiosPagamento: 0
    };
  }
  try {
    return await puxarCatalogoDaEmpresa(sessao.idempresa);
  } catch (err) {
    if (isEmpresaAcessoNegado(err)) {
      await salvarSessao({
        idempresa: null,
        nomeempresa: null,
        modulogourmet: null
      });
      return {
        produtos: 0,
        atalhos: 0,
        grupos: 0,
        gruposGourmet: 0,
        clientes: 0,
        bandeiras: 0,
        meiosPagamento: 0,
        acessoNegado: true
      };
    }
    throw err;
  }
}
async function puxarCatalogoDaEmpresa(idempresa) {
  let totalGrupos = 0;
  {
    let page2 = 1;
    for (; ; ) {
      const grupos = await listarGrupos({
        idempresa,
        page: page2,
        limit: 100
      });
      if (!grupos.length) {
        break;
      }
      await upsertGrupos(grupos);
      totalGrupos += grupos.length;
      if (grupos.length < 100 || page2 > 50) {
        break;
      }
      page2 += 1;
    }
  }
  let totalGruposGourmet = 0;
  {
    let page2 = 1;
    for (; ; ) {
      const grupos = await listarGruposGourmet({
        idempresa,
        page: page2,
        limit: 100
      });
      if (!grupos.length) {
        break;
      }
      await upsertGruposGourmet(grupos);
      totalGruposGourmet += grupos.length;
      if (grupos.length < 100 || page2 > 50) {
        break;
      }
      page2 += 1;
    }
  }
  const unidades = await listarUnidadesMedida(idempresa).catch(
    () => []
  );
  const mapaUnidades = new Map(unidades.map((u) => [u.id, u]));
  let page = 1;
  let total = 0;
  for (; ; ) {
    const produtos = await listarProdutos({
      idempresa,
      page,
      limit: 100
    });
    if (!produtos.length) {
      break;
    }
    await upsertProdutos(
      produtos.map((p) => {
        const atual = p.unidademedida?.trim();
        if (atual) return p;
        const unidade = p.idunidademedida ? mapaUnidades.get(p.idunidademedida) : void 0;
        const sigla = unidade?.codigo?.trim() || unidade?.nome?.trim() || null;
        return { ...p, unidademedida: sigla };
      })
    );
    total += produtos.length;
    if (produtos.length < 100) {
      break;
    }
    page += 1;
    if (page > 50) {
      break;
    }
  }
  const ids = await listarAtalhosRemotos(idempresa);
  if (ids.length) {
    await salvarAtalhos(ids);
  }
  let totalClientes = 0;
  try {
    let page2 = 1;
    for (; ; ) {
      const clientes = await listarClientes({
        idempresa,
        page: page2,
        limit: 100
      });
      if (!clientes.length) {
        break;
      }
      await upsertClientes(clientes);
      totalClientes += clientes.length;
      if (clientes.length < 100 || page2 > 50) {
        break;
      }
      page2 += 1;
    }
  } catch {
  }
  let totalBandeiras = 0;
  try {
    let page2 = 1;
    for (; ; ) {
      const bandeiras = await listarBandeirasCartao({
        idempresa,
        page: page2,
        limit: 100
      });
      if (!bandeiras.length) {
        break;
      }
      await upsertBandeirasCartao(bandeiras);
      totalBandeiras += bandeiras.length;
      if (bandeiras.length < 100 || page2 > 20) {
        break;
      }
      page2 += 1;
    }
  } catch {
  }
  let totalMeios = 0;
  try {
    let page2 = 1;
    for (; ; ) {
      const meios = await listarTiposDocumentoFinanceiro({
        idempresa,
        page: page2,
        limit: 100
      });
      if (!meios.length) {
        break;
      }
      await upsertMeiosPagamento(meios);
      totalMeios += meios.length;
      if (meios.length < 100 || page2 > 20) {
        break;
      }
      page2 += 1;
    }
  } catch {
  }
  try {
    const fiscal = await sincronizarFiscalPdv();
    if (!fiscal.ok) {
      const cfg = await buscarNfceConfig(idempresa);
      const ambiente = Number(cfg.ambiente ?? 2);
      const cscId = ambiente === 1 ? cfg.idcsc_producao : cfg.idcsc_homologacao;
      const cscToken = ambiente === 1 ? cfg.csctoken_producao : cfg.csctoken_homologacao;
      let cnpj = cfg.cnpj ?? null;
      let uf = null;
      try {
        const empresa = await buscarEmpresa(idempresa);
        cnpj = empresa.cnpj ?? cnpj;
        uf = empresa.uf ?? null;
      } catch {
      }
      await atualizarNumeracaoNfce({
        csc_id: cscId ?? null,
        csc_token: cscToken ?? null,
        ambiente,
        cnpj,
        uf
      });
      await cachearEmitenteDanfce(idempresa, cnpj, uf);
    }
  } catch {
  }
  try {
    await atualizarCacheTerminaisPdv();
  } catch {
  }
  await execute(
    `INSERT INTO sync_meta (chave, valor, atualizadoem) VALUES ('ultimo_pull', $1, $2)
		 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizadoem = excluded.atualizadoem`,
    [String(total), (/* @__PURE__ */ new Date()).toISOString()]
  );
  return {
    produtos: total,
    atalhos: ids.length,
    grupos: totalGrupos,
    gruposGourmet: totalGruposGourmet,
    clientes: totalClientes,
    bandeiras: totalBandeiras,
    meiosPagamento: totalMeios
  };
}
async function gravarCertificadoPfx(pfxBase64, senha) {
  const dir = node_path.join(electron.app.getPath("userData"), "certificados");
  await promises.mkdir(dir, { recursive: true });
  const caminho = node_path.join(dir, "nfce.pfx");
  await promises.writeFile(caminho, Buffer.from(pfxBase64, "base64"));
  await setConfig("certificado_path", caminho);
  await setConfig("certificado_senha", senha);
}
async function cachearEmitenteDanfce(idempresa, cnpj, uf) {
  const { CHAVE_EMITENTE_DANFCE: CHAVE_EMITENTE_DANFCE2 } = await Promise.resolve().then(() => danfce);
  let nome = "";
  let ie;
  let logradouro;
  let numero2;
  let bairro;
  let municipio;
  let fone;
  let crt;
  let cnpjFinal = cnpj ?? void 0;
  let ufFinal = uf ?? void 0;
  try {
    const fiscal = await buscarEmpresaFiscal(idempresa);
    nome = (fiscal.razaosocial || fiscal.nomefantasia || "").trim();
    ie = fiscal.inscricaoestadual ?? void 0;
    logradouro = fiscal.logradouro ?? void 0;
    numero2 = fiscal.numero ?? void 0;
    bairro = fiscal.bairro ?? void 0;
    ufFinal = fiscal.uf ?? ufFinal;
    fone = fiscal.telefone ?? void 0;
    if (fiscal.crt != null && Number.isFinite(fiscal.crt)) {
      crt = fiscal.crt;
    }
  } catch {
  }
  try {
    const empresa = await buscarEmpresa(idempresa);
    nome = nome || (empresa.nome ?? empresa.razaosocial ?? "");
    cnpjFinal = cnpjFinal || empresa.cnpj || void 0;
    ufFinal = ufFinal || empresa.uf || void 0;
    fone = fone || empresa.telefone || void 0;
    logradouro = logradouro || empresa.endereco || void 0;
    numero2 = numero2 || empresa.numero || void 0;
    bairro = bairro || empresa.bairro || void 0;
  } catch {
  }
  await setConfig(
    CHAVE_EMITENTE_DANFCE2,
    JSON.stringify({
      nome,
      cnpj: cnpjFinal ?? "",
      ie,
      logradouro,
      numero: numero2,
      bairro,
      municipio,
      uf: ufFinal,
      fone,
      crt
    })
  );
}
async function sincronizarFiscalPdv() {
  const sessao = await obterSessao();
  if (!sessao.idempresa || !sessao.token) {
    return { ok: false, erro: "Sessão inválida" };
  }
  const numeropdv = Math.max(1, Number(await getConfig("numeropdv", "1")) || 1);
  try {
    const fiscal = await buscarPdvFiscal(sessao.idempresa, numeropdv);
    const serie = Number(fiscal.serie);
    await atualizarNumeracaoNfce({
      ...Number.isFinite(serie) && serie > 0 ? { serie } : {},
      proximo_numero: fiscal.numeroproximo,
      csc_id: fiscal.csc_id,
      csc_token: fiscal.csc_token,
      ambiente: fiscal.ambiente,
      cnpj: fiscal.cnpj,
      uf: fiscal.uf
    });
    if (fiscal.certificado?.pfxBase64) {
      await gravarCertificadoPfx(
        fiscal.certificado.pfxBase64,
        fiscal.certificado.senha
      );
      await setConfig("certificado_apelido", fiscal.certificado.apelido);
      await setConfig(
        "certificado_validade",
        fiscal.certificado.validadefim ?? ""
      );
    } else {
      await setConfig("certificado_apelido", "");
      await setConfig("certificado_validade", "");
    }
    await setConfig("fiscal_sync_erro", "");
    await setConfig("fiscal_ultima_sync", (/* @__PURE__ */ new Date()).toISOString());
    await cachearEmitenteDanfce(sessao.idempresa, fiscal.cnpj, fiscal.uf);
    return { ok: true };
  } catch (err) {
    const erro = err instanceof Error ? err.message : "Falha ao buscar dados fiscais";
    await setConfig("fiscal_sync_erro", erro);
    return { ok: false, erro };
  }
}
async function processarOutbox() {
  if (syncing) {
    return { processados: 0, erros: 0 };
  }
  syncing = true;
  let processados = 0;
  let erros = 0;
  try {
    const online = await pingApi();
    if (!online) {
      return { processados, erros };
    }
    const sessao = await obterSessao();
    if (!sessao.idempresa || !sessao.token || !sessao.userid) {
      return { processados, erros };
    }
    for (const item of await listarOutboxPendentes()) {
      try {
        const payload = JSON.parse(item.payload);
        if (item.tipo === "criar_venda") {
          await syncCriarVenda(payload, sessao.idempresa, sessao.userid);
        } else if (item.tipo === "transmitir_nfce_contingencia") {
          await syncTransmitirContingencia(payload, sessao.idempresa);
        } else if (item.tipo === "atalhos_pdv") {
          const ids = Array.isArray(payload.idsProdutos) ? payload.idsProdutos.map((id) => String(id)) : [];
          await substituirAtalhosRemotos(sessao.idempresa, ids);
        } else if (item.tipo === "abrir_caixa") {
          await syncAbrirCaixa(payload);
        } else if (item.tipo === "fechamento_caixa") {
          await syncFecharCaixa(payload, sessao.idempresa, sessao.userid);
        } else if (item.tipo === "conta_mesa") {
        }
        await marcarOutboxConcluido(item.id);
        processados += 1;
      } catch (err) {
        erros += 1;
        await marcarOutboxErro(
          item.id,
          err instanceof Error ? err.message : "Erro desconhecido"
        );
      }
    }
  } catch (err) {
    if (!isBancoIndisponivelError(err)) {
      throw err;
    }
  } finally {
    syncing = false;
  }
  void puxarNfceDaRetaguarda().catch(() => void 0);
  return { processados, erros };
}
function moneyApi(valor) {
  const n = Number(valor ?? 0);
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}
async function garantirCaixaRemoto(payload, idempresa, userid) {
  const idlocal = String(payload.idlocal ?? "");
  const local = idlocal ? await obterCaixaTurno(idlocal) : null;
  if (local?.idremoto) {
    return local.idremoto;
  }
  const idusuario = String(payload.idusuario ?? local?.idusuario ?? userid);
  const idremoto = await criarFechamentoCaixaRemoto({
    idempresa: String(payload.idempresa ?? local?.idempresa ?? idempresa),
    pdv: Number(payload.numeropdv ?? local?.numeropdv ?? 1),
    idusuario,
    idusuariosuprimento: idusuario,
    suprimentoinicial: moneyApi(
      payload.valorabertura ?? local?.valorabertura ?? 0
    ),
    status: STATUS_CAIXA_ABERTO,
    local: 1,
    datahora: String(
      payload.abertoem ?? local?.abertoem ?? (/* @__PURE__ */ new Date()).toISOString()
    )
  });
  if (idlocal) {
    await atualizarCaixaIdRemoto(idlocal, idremoto);
  }
  return idremoto;
}
async function syncAbrirCaixa(payload) {
  const sessao = await obterSessao();
  if (!sessao.idempresa || !sessao.userid) {
    throw new Error("Sessão inválida para abrir caixa remoto");
  }
  await garantirCaixaRemoto(payload, sessao.idempresa, sessao.userid);
}
async function syncFecharCaixa(payload, idempresa, userid) {
  const idremoto = await garantirCaixaRemoto(payload, idempresa, userid);
  const idlocal = String(payload.idlocal ?? "");
  const local = idlocal ? await obterCaixaTurno(idlocal) : null;
  let saldoapurado = Number(payload.saldoapurado);
  let sobra = Number(payload.sobra);
  let falta = Number(payload.falta);
  let saldoinformadoNum = Number(
    payload.saldoinformado ?? payload.valorfechamento ?? 0
  );
  const precisaRecalcular = !Number.isFinite(saldoapurado) || !Number.isFinite(sobra) || !Number.isFinite(falta);
  if (precisaRecalcular && local) {
    const resumo = await calcularResumoTurno(local);
    const conferencia = calcularConferenciaCaixa(
      saldoinformadoNum,
      resumo.saldoCaixaFisico
    );
    saldoapurado = resumo.saldoapurado;
    sobra = conferencia.sobra;
    falta = conferencia.falta;
    saldoinformadoNum = conferencia.saldoinformado;
  }
  const saldoinformado = moneyApi(saldoinformadoNum);
  await atualizarFechamentoCaixaRemoto(idremoto, {
    status: STATUS_CAIXA_FECHADO,
    saldoapurado: moneyApi(saldoapurado),
    saldoinformado,
    saldoconferido: moneyApi(payload.saldoconferido ?? saldoinformado),
    sobra: moneyApi(sobra),
    falta: moneyApi(falta),
    idusuariofechamento: userid,
    observacao: typeof payload.observacao === "string" && payload.observacao.trim() ? payload.observacao.trim() : null,
    datahora: String(payload.fechadoem ?? (/* @__PURE__ */ new Date()).toISOString())
  });
}
async function baixarEstoqueVendaOutbox(params) {
  const emitir = await getConfig("emitir_nfce", "1") === "1";
  try {
    const baixa = await baixaEstoqueVenda({
      idempresa: params.idempresa,
      idvenda: params.idremoto,
      itens: params.itens.map((i) => ({
        idproduto: i.idproduto,
        quantidade: i.quantidade,
        precounitario: i.precounitario,
        nomeproduto: i.descricao
      })),
      pagamentos: {
        valortotal: params.total,
        valortroco: params.sync.valortroco,
        valordinheiro: params.sync.valordinheiro,
        valorpix: params.sync.valorpix,
        valorcartaocredito: params.sync.valorcartaocredito,
        valorcartaodebito: params.sync.valorcartaodebito,
        valorcartao: params.sync.valorcartao,
        valorprepago: params.sync.valorprepago,
        desconto: Number(params.payload.valordesconto ?? 0),
        valortaxaservico: Number(params.payload.valortaxaservico ?? 0),
        valorcouverartistico: Number(params.payload.valorcouvert ?? 0),
        valorentrega: Number(params.payload.valorentrega ?? 0)
      },
      emitirNfce: emitir
    });
    if (!emitir) {
      await atualizarVendaSync(params.idlocal, { nfce_status: "nao_fiscal" });
      return;
    }
    const nfce = extrairNfceDaBaixa(baixa);
    const { aplicarEmissaoNfceNaVendaLocal: aplicarEmissaoNfceNaVendaLocal2 } = await Promise.resolve().then(() => persistirNfceOnline);
    await aplicarEmissaoNfceNaVendaLocal2(params.idlocal, nfce);
    if (nfce.emitida) {
      await atualizarVendaSync(params.idlocal, { nfce_status: "autorizada" });
    }
  } catch (err) {
    if (err instanceof ApiError && (err.status === 0 || err.status === 408 || (err.status ?? 0) >= 500)) {
      if (emitir) {
        await atualizarVendaSync(params.idlocal, {
          nfce_status: "pendente_contingencia"
        });
      }
      throw err;
    }
    if (emitir) {
      await atualizarVendaSync(params.idlocal, { nfce_status: "erro" });
    }
  }
}
async function syncCriarVenda(payload, idempresa, userid) {
  const itens = payload.itens;
  const total = Number(payload.valortotal ?? 0);
  const idlocal = String(payload.idlocal);
  const numeropdv = Number(await getConfig("numeropdv", "1"));
  const valortroco = Number(payload.valortroco ?? 0);
  const pagamentos = resolverPagamentosPayload(payload, total);
  const sync = totaisParaSync(pagamentos, valortroco);
  const local = await obterVenda(idlocal);
  if (local?.idremoto) {
    await baixarEstoqueVendaOutbox({
      idlocal,
      idremoto: local.idremoto,
      idempresa,
      itens,
      total,
      sync,
      payload
    });
    return;
  }
  const pagamentosErp = pagamentosErpDosLancamentos(pagamentos);
  const identidade = [payload.identidade, local?.idcliente].map((valor) => typeof valor === "string" ? valor.trim() : "").find(Boolean);
  const venda = await criarVendaPdv({
    idempresa,
    numeropdv,
    usuarioquefechouvenda: userid,
    vendalocal: VENDA_LOCAL_PDV_HIBRIDO,
    valortotal: total,
    valortroco: sync.valortroco,
    valordinheiro: sync.valordinheiro,
    valorpix: sync.valorpix,
    valorcartaocredito: sync.valorcartaocredito,
    valorcartaodebito: sync.valorcartaodebito,
    valorcartao: sync.valorcartao,
    valorprepago: sync.valorprepago,
    pagamentos: pagamentosNativosParaApi(pagamentos),
    ...pagamentosErp.length ? { pagamentosErp } : {},
    ...identidade ? { identidade } : {}
  });
  await atualizarVendaSync(idlocal, {
    idremoto: venda.id,
    sync_status: "sincronizado"
  });
  for (const item of itens) {
    await criarItemVendaPdv({
      idempresa,
      idvenda: venda.id,
      idproduto: item.idproduto,
      quantidade: item.quantidade,
      precounitario: item.precounitario,
      precototal: item.precototal,
      precopromocao: 0,
      precoalterado: 0,
      descricao: item.descricao
    });
  }
  await baixarEstoqueVendaOutbox({
    idlocal,
    idremoto: venda.id,
    idempresa,
    itens,
    total,
    sync,
    payload
  });
}
async function syncTransmitirContingencia(payload, idempresa) {
  const idlocal = payload.idvenda ? String(payload.idvenda) : "";
  const local = idlocal ? await obterVenda(idlocal) : null;
  if (local && (local.nfce_status === "autorizada" || local.nfce_status === "erro" || local.nfce_status === "transmitida")) {
    if (payload.idnfce_local) {
      await marcarNfceTransmitida(String(payload.idnfce_local));
    }
    return;
  }
  const result = await transmitirNfceContingencia({
    idempresa,
    idvenda: local?.idremoto ?? (idlocal || void 0),
    xml: String(payload.xml),
    chave: payload.chave ? String(payload.chave) : void 0,
    serie: Number(payload.serie),
    numero: Number(payload.numero),
    motivo: String(payload.motivo ?? "Contingencia offline PDV"),
    datacontingencia: String(payload.datacontingencia)
  });
  if (payload.idnfce_local) {
    await marcarNfceTransmitida(String(payload.idnfce_local));
  }
  if (idlocal) {
    await atualizarVendaSync(idlocal, {
      nfce_status: result.transmitida ? "transmitida" : "contingencia"
    });
  }
}
function resolverPagamentosPayload(payload, total) {
  const lista = normalizarLancamentos(
    payload.pagamentos ?? payload.lancamentos
  );
  if (lista.length) {
    return lista;
  }
  const fromTotais = [];
  const dinheiro = Number(payload.valordinheiro ?? 0);
  const pix = Number(payload.valorpix ?? 0);
  const cartao = Number(payload.valorcartao ?? 0);
  if (dinheiro > 0) {
    fromTotais.push(lancamentoUnico("DINHEIRO", dinheiro));
  }
  if (pix > 0) {
    fromTotais.push(lancamentoUnico("PIX", pix));
  }
  if (cartao > 0) {
    fromTotais.push(lancamentoUnico("CARTAO", cartao));
  }
  if (fromTotais.length) {
    return fromTotais;
  }
  const meio = String(payload.meio ?? "").trim().toUpperCase();
  if (meio && meio !== "MISTO" && total > 0) {
    return [lancamentoUnico(normalizarMeioPagamento(meio), total)];
  }
  return [];
}
function iniciarSyncPeriodico(intervalMs = 3e4) {
  return setInterval(() => {
    void (async () => {
      try {
        const { sincronizarSecundarioPeriodico: sincronizarSecundarioPeriodico2 } = await Promise.resolve().then(() => servico);
        await sincronizarSecundarioPeriodico2();
      } catch {
      }
      void processarOutbox();
    })();
  }, intervalMs);
}
const CHAVE_ULTIMA_IDEMPRESA = "ultima_idempresa";
const CHAVE_ULTIMA_NOMEEMPRESA = "ultima_nomeempresa";
const CHAVE_AVISO_BACKUP = "ultimo_backup_aviso";
const CHAVES_CONFIG_EMPRESA = [
  ["certificado_path", ""],
  ["certificado_senha", ""],
  ["certificado_apelido", ""],
  ["certificado_validade", ""],
  ["fiscal_ultima_sync", ""],
  ["fiscal_sync_erro", ""],
  ["emitente_danfce_json", ""],
  ["terminais_pdv_json", "[]"],
  ["senha_gerencial_hash", ""],
  ["senha_gerencial_salt", ""],
  ["pix_chave", ""],
  ["qtd_mesas", "20"],
  ["modelo_atendimento", "mesa"],
  ["taxa_servico_percentual", "10"],
  ["couvert_valor", "0"]
];
async function lembrarEmpresaDaSessao() {
  const sessao = await obterSessao();
  if (!sessao.idempresa) {
    return;
  }
  await setConfig(CHAVE_ULTIMA_IDEMPRESA, sessao.idempresa);
  if (sessao.nomeempresa) {
    await setConfig(CHAVE_ULTIMA_NOMEEMPRESA, sessao.nomeempresa);
  }
}
async function consumirAvisoBackupEmpresa() {
  const aviso = await getConfig(CHAVE_AVISO_BACKUP, "");
  if (aviso) {
    await setConfig(CHAVE_AVISO_BACKUP, "");
  }
  return aviso;
}
async function arquivarSeTrocaEmpresa(idempresaNova, nomeempresaNova) {
  const sessao = await obterSessao();
  const idAnterior = (await getConfig(CHAVE_ULTIMA_IDEMPRESA, "")).trim() || sessao.idempresa?.trim() || "";
  const nomeAnterior = (await getConfig(CHAVE_ULTIMA_NOMEEMPRESA, "")).trim() || sessao.nomeempresa?.trim() || idAnterior;
  if (!idAnterior || idAnterior === idempresaNova) {
    await setConfig(CHAVE_ULTIMA_IDEMPRESA, idempresaNova);
    await setConfig(CHAVE_ULTIMA_NOMEEMPRESA, nomeempresaNova);
    return null;
  }
  const backup = await backupELimparDadosEmpresa({
    idAnterior,
    nomeAnterior,
    idNova: idempresaNova,
    nomeNova: nomeempresaNova
  });
  await setConfig(CHAVE_ULTIMA_IDEMPRESA, idempresaNova);
  await setConfig(CHAVE_ULTIMA_NOMEEMPRESA, nomeempresaNova);
  await setConfig(
    CHAVE_AVISO_BACKUP,
    `Dados da empresa ${nomeAnterior} arquivados em ${backup.arquivo}`
  );
  return backup;
}
async function backupELimparDadosEmpresa(params) {
  let arquivo = "";
  try {
    const backup = await criarBackupLocal({
      pasta: dirBackupsEmpresa(),
      motivo: "troca-empresa",
      idempresa: params.idAnterior,
      nomeempresa: params.nomeAnterior,
      extraManifesto: {
        idempresaNova: params.idNova,
        nomeempresaNova: params.nomeNova
      }
    });
    arquivo = backup.arquivo;
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Não foi possível arquivar os dados da empresa anterior: ${detalhe}`
    );
  }
  try {
    await limparDadosOperacionais();
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Backup salvo em ${arquivo}, mas a limpeza local falhou: ${detalhe}`
    );
  }
  return {
    arquivo,
    empresaAnterior: params.idAnterior,
    nomeAnterior: params.nomeAnterior
  };
}
async function limparDadosOperacionais() {
  await withTransaction(async (client) => {
    await execute(
      `TRUNCATE TABLE ${TABELAS_BACKUP_OPERACIONAL.join(", ")} RESTART IDENTITY`,
      [],
      client
    );
    await execute(
      `UPDATE numeracao_nfce SET
				serie = 1,
				proximo_numero = 1,
				csc_id = NULL,
				csc_token = NULL,
				cnpj = NULL,
				uf = NULL,
				ambiente = 2,
				atualizadoem = $1
			 WHERE id = 1`,
      [(/* @__PURE__ */ new Date()).toISOString()],
      client
    );
    for (const [chave, valor] of CHAVES_CONFIG_EMPRESA) {
      await execute(
        `INSERT INTO config (chave, valor) VALUES ($1, $2)
				 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
        [chave, valor],
        client
      );
    }
  });
  await esvaziarPasta(dirXmlNfce());
  await esvaziarPasta(dirCertificadosPdv());
  await garantirMesas(20);
}
function avisarTecnibra() {
  void syncTecnibra();
}
async function sincronizarRolesSessao(sessao) {
  if (!sessao.token) return sessao;
  try {
    const perfil = await obterPerfilUsuario();
    return await salvarSessao({
      roles: JSON.stringify(normalizarPerfis(perfil.perfil))
    });
  } catch {
    return sessao;
  }
}
async function sincronizarModuloGourmet(sessao) {
  if (!sessao.token || !sessao.idempresa) return sessao;
  try {
    const plano = await obterMeuPlano(sessao.idempresa);
    return await salvarSessao({
      modulogourmet: planoTemGourmet(plano.modulos) ? "1" : "0"
    });
  } catch {
    return sessao;
  }
}
const ERRO_SEM_GOURMET = "O plano desta empresa não inclui o módulo Gourmet. Mesas e comandas ficam indisponíveis.";
async function assertModuloGourmet() {
  const sessao = await obterSessao();
  if (!sessaoTemGourmet(sessao.modulogourmet)) {
    throw new Error(ERRO_SEM_GOURMET);
  }
}
async function assertPodeSalvarConfig(dados) {
  let sessao = null;
  try {
    sessao = await obterSessao();
  } catch {
    sessao = null;
  }
  if (podeConfigurarPdv(sessao?.roles)) return;
  const logado = Boolean(sessao?.token);
  if (!logado) {
    if (!payloadSoTemChaves(dados, CHAVES_CONFIG_PRE_LOGIN)) {
      throw new Error(
        "Faça login como administrador ou proprietário para alterar as configurações."
      );
    }
    return;
  }
  if (!payloadSoTemChaves(dados, CHAVES_CONFIG_OPERADOR)) {
    throw new Error(
      "Somente administrador ou proprietário pode alterar as configurações."
    );
  }
}
async function emitirNfceOnlineDaVenda(vendaId, emitirNfce = true) {
  const online = await pingApi();
  if (!online) {
    return { ok: false, indisponivel: true, erro: "API offline" };
  }
  const venda = await obterVenda(vendaId);
  if (!venda) {
    return { ok: false, erro: "Venda não encontrada" };
  }
  try {
    const sessao = await obterSessao();
    if (!sessao.idempresa || !sessao.userid) {
      return { ok: false, erro: "Sessão inválida" };
    }
    const pagamentos = venda.pagamentos.length > 0 ? venda.pagamentos : await listarLancamentosVenda(venda.id);
    const sync = totaisParaSync(pagamentos, venda.valortroco);
    const pagamentosErp = pagamentosErpDosLancamentos(pagamentos);
    let idremoto = venda.idremoto;
    if (!idremoto) {
      const criada = await criarVendaPdv({
        idempresa: sessao.idempresa,
        numeropdv: Number(await getConfig("numeropdv", "1")),
        usuarioquefechouvenda: sessao.userid,
        vendalocal: VENDA_LOCAL_PDV_HIBRIDO,
        valortotal: venda.valortotal,
        valortroco: sync.valortroco,
        valordinheiro: sync.valordinheiro,
        valorpix: sync.valorpix,
        valorcartaocredito: sync.valorcartaocredito,
        valorcartaodebito: sync.valorcartaodebito,
        valorcartao: sync.valorcartao,
        valorprepago: sync.valorprepago,
        pagamentos: pagamentosNativosParaApi(pagamentos),
        ...pagamentosErp.length ? { pagamentosErp } : {},
        ...venda.idcliente?.trim() ? { identidade: venda.idcliente.trim() } : {}
      });
      idremoto = criada.id;
      for (const item of venda.itens) {
        await criarItemVendaPdv({
          idempresa: sessao.idempresa,
          idvenda: idremoto,
          idproduto: item.idproduto,
          quantidade: item.quantidade,
          precounitario: item.precounitario,
          precototal: item.precototal,
          precopromocao: 0,
          precoalterado: 0,
          descricao: item.descricao
        });
      }
      await atualizarVendaSync(vendaId, {
        idremoto,
        sync_status: "sincronizado"
      });
    }
    const baixa = await baixaEstoqueVenda({
      idempresa: sessao.idempresa,
      idvenda: idremoto,
      itens: venda.itens.map((i) => ({
        idproduto: i.idproduto,
        quantidade: i.quantidade,
        precounitario: i.precounitario,
        nomeproduto: i.descricao
      })),
      pagamentos: {
        valortotal: venda.valortotal,
        valortroco: sync.valortroco,
        valordinheiro: sync.valordinheiro,
        valorpix: sync.valorpix,
        valorcartaocredito: sync.valorcartaocredito,
        valorcartaodebito: sync.valorcartaodebito,
        valorcartao: sync.valorcartao,
        valorprepago: sync.valorprepago,
        desconto: venda.valordesconto ?? 0,
        valortaxaservico: venda.valortaxaservico ?? 0,
        valorcouverartistico: venda.valorcouvert ?? 0
      },
      emitirNfce
    });
    await concluirOutboxCriarVendaLocal(vendaId);
    if (!emitirNfce) {
      await atualizarVendaSync(vendaId, { nfce_status: "nao_fiscal" });
      return { ok: true };
    }
    const nfce = extrairNfceDaBaixa(baixa);
    const { aplicarEmissaoNfceNaVendaLocal: aplicarEmissaoNfceNaVendaLocal2 } = await Promise.resolve().then(() => persistirNfceOnline);
    await aplicarEmissaoNfceNaVendaLocal2(vendaId, nfce);
    return {
      ok: nfce.emitida,
      chave: nfce.chave,
      qrCode: nfce.qrCode,
      protocolo: nfce.protocolo,
      idnotafiscal: nfce.idnotafiscal,
      cStat: nfce.cStat,
      erro: nfce.erro,
      indisponivel: !nfce.emitida && !nfce.erro,
      xml: nfce.xml,
      serie: nfce.serie,
      numero: nfce.numero
    };
  } catch (err) {
    const indisponivel = err instanceof ApiError && (err.status === 0 || err.status === 408 || (err.status ?? 0) >= 500);
    if (indisponivel) {
      const vendaAtual = await obterVenda(vendaId);
      const idremoto = vendaAtual?.idremoto;
      if (idremoto) {
        try {
          const remota = await buscarVendaPdvGourmet(idremoto);
          if (remota.idnotafiscalnfce) {
            return {
              ok: false,
              idnotafiscal: remota.idnotafiscalnfce,
              erro: err instanceof Error ? err.message : "Falha na emissão (nota já na retaguarda)"
            };
          }
        } catch {
        }
      }
    }
    return {
      ok: false,
      indisponivel,
      erro: err instanceof Error ? err.message : "Falha emissão"
    };
  }
}
const localApi = {
  async health() {
    return { ok: true, app: "pdv-mais-gestao", version: "0.1.0" };
  },
  async getStatus() {
    const conexao = await statusConexao();
    let sessao = await obterSessao();
    if (sessao.token && sessao.roles == null && conexao.online) {
      sessao = await sincronizarRolesSessao(sessao);
    }
    if (sessao.token && sessao.idempresa && sessao.modulogourmet == null && conexao.online) {
      sessao = await sincronizarModuloGourmet(sessao);
    }
    const caixa = await caixaAberto();
    const caixaOutroOperador = caixa ? null : await caixaAbertoOutroOperador();
    const modo = normalizarModoPdv(await getConfig("pdv_modo", "principal"));
    const principal = modo === "secundario" ? statusPrincipalCache() : null;
    return {
      ...conexao,
      podeConfigurar: podeConfigurarPdv(sessao.roles),
      moduloGourmet: sessaoTemGourmet(sessao.modulogourmet),
      sessao: {
        logado: Boolean(sessao.token),
        username: sessao.username,
        idempresa: sessao.idempresa,
        nomeempresa: sessao.nomeempresa
      },
      caixa,
      caixaOutroOperador,
      emitirNfce: await getConfig("emitir_nfce", "1") === "1",
      modeloAtendimento: await getConfig("modelo_atendimento", "mesa") === "comanda" ? "comanda" : "mesa",
      qtdMesas: Math.max(1, Number(await getConfig("qtd_mesas", "20")) || 20),
      numeropdv: Math.max(1, Number(await getConfig("numeropdv", "1")) || 1),
      modo,
      principalOnline: principal ? principal.online : null,
      principalErro: principal?.erro ?? null,
      balancaHabilitada: await getConfig("balanca_habilitada", "0") === "1"
    };
  },
  async login(email, password) {
    const url = await apiBaseUrl();
    try {
      await lembrarEmpresaDaSessao();
      const result = await loginEmail(email, password);
      await salvarSessao({
        token: result.token,
        userid: result.userid,
        username: result.username,
        roles: null,
        idempresa: null,
        nomeempresa: null,
        modulogourmet: null
      });
      await sincronizarRolesSessao(await obterSessao());
      const empresas = await listarEmpresas(result.userid);
      return { username: result.username, empresas };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 0 || err.status === 408)) {
        throw new Error(
          `Não foi possível conectar em ${url}. Verifique a URL e se a API está no ar.`
        );
      }
      if (err instanceof ApiError) {
        throw new Error(`${err.message} (${url})`);
      }
      throw err instanceof Error ? err : new Error(`Falha no login (${url})`);
    }
  },
  async selecionarEmpresa(idempresa, nomeempresa) {
    const backup = await arquivarSeTrocaEmpresa(idempresa, nomeempresa);
    await salvarSessao({ idempresa, nomeempresa, modulogourmet: null });
    await sincronizarModuloGourmet(await obterSessao());
    const vazio = {
      produtos: 0,
      atalhos: 0,
      grupos: 0,
      gruposGourmet: 0,
      clientes: 0,
      bandeiras: 0,
      meiosPagamento: 0
    };
    const pull = await ehSecundario() ? await puxarDoPrincipal().catch(() => vazio) : await pullCatalogo().catch((err) => {
      if (isEmpresaAcessoNegado(err)) {
        throw err;
      }
      return vazio;
    });
    if ("acessoNegado" in pull && pull.acessoNegado) {
      throw new Error(
        "Este usuário não tem acesso à empresa selecionada. Escolha outra empresa."
      );
    }
    void processarOutbox();
    return { ok: true, pull, backup };
  },
  async logout() {
    await lembrarEmpresaDaSessao();
    await limparSessao();
    return { ok: true };
  },
  async listarEmpresasSessao() {
    const sessao = await obterSessao();
    if (!sessao.token || !sessao.userid) {
      throw new Error("Faça login para listar as empresas");
    }
    return listarEmpresas(sessao.userid);
  },
  async consumirAvisoBackupEmpresa() {
    return consumirAvisoBackupEmpresa();
  },
  async statusBackup() {
    return statusBackupPdv();
  },
  async gerarBackup(pasta) {
    return executarBackupPdv({
      motivo: "manual",
      pasta,
      forcar: true
    });
  },
  async escolherPastaBackup() {
    const win = electron.BrowserWindow.getFocusedWindow();
    if (!win) {
      return null;
    }
    const resultado = await electron.dialog.showOpenDialog(win, {
      title: "Pasta para backups do PDV",
      properties: ["openDirectory", "createDirectory"]
    });
    if (resultado.canceled || !resultado.filePaths[0]) {
      return null;
    }
    return resultado.filePaths[0];
  },
  async abrirPastaBackup(pasta) {
    const status2 = await statusBackupPdv();
    const destino = (pasta?.trim() || status2.pastaEfetiva).trim();
    if (!destino) {
      throw new Error("Pasta de backup não configurada");
    }
    await promises.mkdir(destino, { recursive: true });
    const erro = await electron.shell.openPath(destino);
    if (erro) {
      throw new Error(erro);
    }
    return { ok: true, pasta: destino };
  },
  async exportarXmlsNfce(params) {
    const win = electron.BrowserWindow.getFocusedWindow();
    if (!win) {
      throw new Error("Janela do PDV indisponível");
    }
    const escolha = await electron.dialog.showOpenDialog(win, {
      title: "Pasta para salvar os XMLs da NFC-e",
      properties: ["openDirectory", "createDirectory"]
    });
    if (escolha.canceled || !escolha.filePaths[0]) {
      return { cancelado: true, total: 0, ignorados: 0, pasta: "" };
    }
    const resultado = await exportarXmlsNfce({
      dataInicio: params.dataInicio,
      dataFim: params.dataFim,
      criterio: params.criterio,
      pasta: escolha.filePaths[0]
    });
    const erro = await electron.shell.openPath(resultado.pasta);
    if (erro) {
      throw new Error(erro);
    }
    return { cancelado: false, ...resultado };
  },
  async getConfig() {
    const database_url = obterDatabaseUrl();
    try {
      const config = await getAllConfig();
      const definida = Boolean(config.senha_gerencial_hash);
      delete config.senha_gerencial_hash;
      delete config.senha_gerencial_salt;
      return {
        ...config,
        database_url,
        senha_gerencial: "",
        senha_gerencial_definida: definida ? "1" : "0"
      };
    } catch (err) {
      if (isBancoIndisponivelError(err)) {
        return { database_url };
      }
      throw err;
    }
  },
  async saveConfig(dados) {
    const payload = { ...dados };
    let sessao = null;
    try {
      sessao = await obterSessao();
    } catch {
      sessao = null;
    }
    if (!sessaoTemGourmet(sessao?.modulogourmet)) {
      for (const chave of CHAVES_CONFIG_GOURMET) {
        delete payload[chave];
      }
    }
    await assertPodeSalvarConfig(payload);
    const { database_url, ...resto } = payload;
    if (database_url !== void 0) {
      const atual = obterDatabaseUrl();
      const url = database_url.trim() || DATABASE_URL_PADRAO;
      salvarDatabaseUrlArquivo(url);
      if (url !== atual || !isDbReady()) {
        await reconectarDb();
      }
    }
    if (resto.senha_gerencial !== void 0) {
      const senha = resto.senha_gerencial.trim();
      delete resto.senha_gerencial;
      delete resto.senha_gerencial_definida;
      if (senha) {
        const { hashSenhaGerencial } = await Promise.resolve().then(() => require("./chunks/senha-gerencial-d9aLeKH9.js"));
        const { salt, hash } = hashSenhaGerencial(senha);
        resto.senha_gerencial_salt = salt;
        resto.senha_gerencial_hash = hash;
      }
    }
    if (Object.keys(resto).length) {
      await validarIdentidadeAoSalvar(resto);
      const modo = normalizarModoPdv(
        resto.pdv_modo ?? await getConfig("pdv_modo", "principal")
      );
      if (modo === "principal" && resto.numeropdv !== void 0) {
        const numero2 = parseNumeroPdv(resto.numeropdv);
        if (numero2) {
          await assertNumeroPrincipalLivre(numero2);
        }
      }
    }
    const saved = Object.keys(resto).length ? await salvarConfiguracoes(resto) : {};
    if (resto.lan_habilitada !== void 0 || resto.lan_porta !== void 0 || resto.pdv_modo !== void 0) {
      const { restartLanServer: restartLanServer2 } = await Promise.resolve().then(() => server$1);
      await restartLanServer2();
    }
    if (await ehSecundario()) {
      await puxarDoPrincipal().catch(() => void 0);
    }
    if (resto.tecnibra_habilitada !== void 0 || resto.tecnibra_xml_path !== void 0 || resto.tecnibra_intervalo_ms !== void 0 || resto.tecnibra_xml_root !== void 0 || resto.tecnibra_xml_item !== void 0) {
      await reiniciarTecnibra();
    }
    if (resto.sitef_habilitado !== void 0 || resto.sitef_ip !== void 0 || resto.sitef_loja !== void 0 || resto.sitef_terminal !== void 0 || resto.sitef_parametros !== void 0 || resto.sitef_porta_pinpad !== void 0 || resto.sitef_dll_path !== void 0) {
      const { resetarDllCarregada: resetarDllCarregada2 } = await Promise.resolve().then(() => dll);
      const { resetarConfiguracaoSitef: resetarConfiguracaoSitef2 } = await Promise.resolve().then(() => servico$1);
      resetarDllCarregada2();
      resetarConfiguracaoSitef2();
    }
    if (resto.balanca_habilitada !== void 0 || resto.balanca_porta !== void 0 || resto.balanca_baud !== void 0 || resto.balanca_protocolo !== void 0) {
      await resetarConexaoBalanca();
    }
    if (resto.backup_habilitado !== void 0 || resto.backup_pasta !== void 0 || resto.backup_frequencia !== void 0 || resto.backup_hora !== void 0 || resto.backup_manter !== void 0) {
      await reiniciarBackupAgendado();
    }
    return { ...saved, database_url: obterDatabaseUrl() };
  },
  async statusTecnibra() {
    return statusTecnibra();
  },
  async "sitef.status"() {
    return statusSitef();
  },
  async "sitef.pagar"(params) {
    return sitefPagar(params);
  },
  async "sitef.cancelar"(params) {
    return sitefCancelar(params);
  },
  async "balanca.status"() {
    return statusBalanca();
  },
  async "balanca.lerPeso"() {
    return lerPesoBalanca();
  },
  async "balanca.listarPortas"() {
    return listarPortasBalanca();
  },
  async "balanca.testar"() {
    return testarBalanca();
  },
  async listarEmpresasLan() {
    const sessao = await obterSessao();
    if (!sessao.token || !sessao.userid) {
      throw new Error("Sessão inválida");
    }
    return listarEmpresas(sessao.userid);
  },
  async catalogoCarga() {
    return listarCatalogoCarga();
  },
  async buscarClientes(termo) {
    return buscarClientesLocal(termo ?? "", 20);
  },
  async listarBandeirasCartao() {
    return listarBandeirasCartaoLocal();
  },
  async listarMeiosPagamento() {
    return listarMeiosPagamentoLocal();
  },
  async statusLan() {
    const { statusLanAtual: statusLanAtual2 } = await Promise.resolve().then(() => server$1);
    const atual = statusLanAtual2();
    let habilitada = atual.habilitada;
    let portaConfigurada = 5050;
    try {
      habilitada = await getConfig("lan_habilitada", "1") === "1";
      portaConfigurada = Number(await getConfig("lan_porta", "5050")) || 5050;
    } catch {
    }
    return {
      habilitada,
      ouvindo: atual.ouvindo,
      porta: atual.porta,
      portaConfigurada,
      ips: atual.ips,
      erro: atual.erro,
      motivo: atual.motivo
    };
  },
  async reiniciarLan() {
    const { restartLanServer: restartLanServer2 } = await Promise.resolve().then(() => server$1);
    return restartLanServer2();
  },
  async listarImpressoras() {
    return listarImpressoras();
  },
  async testarImpressora(destino) {
    return testarImpressora(destino);
  },
  async abrirCaixa(valorabertura) {
    const caixa = await abrirCaixa(valorabertura);
    void processarOutbox();
    return caixa;
  },
  async resumoTurnoCaixa() {
    return calcularResumoTurnoAberto();
  },
  async fecharCaixa(saldoinformado, observacao) {
    const fechamento = await fecharCaixa({
      saldoinformado: Number(saldoinformado) || 0,
      observacao
    });
    void processarOutbox();
    void executarBackupPdv({ motivo: "caixa" }).catch((err) => {
      console.error(
        err instanceof Error ? err.message : "Falha no backup ao fechar o caixa"
      );
    });
    try {
      await imprimirComprovanteFechamentoCaixa({
        nomeempresa: fechamento.nomeempresa,
        username: fechamento.username,
        numeropdv: fechamento.numeropdv,
        abertoem: fechamento.abertoem,
        fechadoem: fechamento.fechadoem,
        resumo: fechamento.resumo,
        conferencia: fechamento.conferencia,
        observacao: fechamento.observacao
      });
    } catch (err) {
      console.error(
        err instanceof Error ? err.message : "Falha ao imprimir comprovante de caixa"
      );
    }
    return { ok: true };
  },
  async buscarProdutos(termo) {
    return buscarProdutosLocal(termo ?? "", 80);
  },
  async listarAtalhos() {
    return listarAtalhos();
  },
  async salvarAtalhos(ids) {
    if (await ehSecundario()) {
      throw new Error(
        "No PDV secundário os atalhos vêm do principal. Configure no PDV principal e use Carga local."
      );
    }
    const unicos = [...new Set(ids.filter(Boolean))];
    await salvarAtalhos(unicos);
    const sessao = await obterSessao();
    if (!sessao.token || !sessao.idempresa) {
      return {
        ok: true,
        quantidade: unicos.length,
        nuvem: false
      };
    }
    try {
      await substituirAtalhosRemotos(sessao.idempresa, unicos);
      return {
        ok: true,
        quantidade: unicos.length,
        nuvem: true
      };
    } catch {
      await enfileirarOutbox("atalhos_pdv", {
        idempresa: sessao.idempresa,
        idsProdutos: unicos
      });
      return {
        ok: true,
        quantidade: unicos.length,
        nuvem: false
      };
    }
  },
  async listarGrupos() {
    return listarGruposLocal();
  },
  async listarProdutosPorGrupo(idgrupo, termo) {
    return listarProdutosPorGrupo(idgrupo, termo ?? "", 200);
  },
  async listarGruposGourmet() {
    return listarGruposGourmetLocal();
  },
  async listarProdutosPorGrupoGourmet(idgrupogourmet, termo) {
    return listarProdutosPorGrupoGourmet(idgrupogourmet, termo ?? "", 200);
  },
  async listarPizzas(excetoId) {
    return listarPizzasLocal(excetoId ?? "", 200);
  },
  async listarMapeamentoImpressorasGourmet() {
    return listarMapeamentoImpressorasGourmet();
  },
  async salvarMapeamentoImpressorasGourmet(itens) {
    await salvarMapeamentoImpressorasGourmet(itens);
    return { ok: true };
  },
  async buscarProdutoPorEan(ean) {
    return buscarProdutoPorEan(ean);
  },
  async buscarLeituraCodigoBarras(codigo) {
    const lido = codigo.trim();
    if (!lido) return null;
    const cfg = configEtiquetaDeMapa(await getAllConfig());
    const parse = parsearEtiquetaBalanca(lido, cfg);
    if (parse) {
      const produto = await buscarProdutoPorCodigo(parse.codigo);
      if (produto) {
        const lancamento = montarLancamentoEtiqueta(produto, parse, cfg);
        return {
          produto,
          ...lancamento,
          origem: "etiqueta-balanca"
        };
      }
    }
    const porEan = await buscarProdutoPorEan(lido);
    if (porEan) {
      return {
        produto: porEan,
        quantidade: 1,
        precounitario: porEan.preco,
        precototal: porEan.preco,
        pesado: false,
        origem: "ean"
      };
    }
    if (/^\d+$/.test(lido)) {
      const plu = Number(lido);
      if (Number.isInteger(plu) && plu > 0) {
        const porCodigo = await buscarProdutoPorCodigo(plu);
        if (porCodigo) {
          return {
            produto: porCodigo,
            quantidade: 1,
            precounitario: porCodigo.preco,
            precototal: porCodigo.preco,
            pesado: false,
            origem: "ean"
          };
        }
      }
      return null;
    }
    const porNome = await buscarProdutosLocal(lido, 8);
    if (porNome.length === 1) {
      const produto = porNome[0];
      return {
        produto,
        quantidade: 1,
        precounitario: produto.preco,
        precototal: produto.preco,
        pesado: false,
        origem: "nome"
      };
    }
    return null;
  },
  async syncAgora() {
    const pull = await ehSecundario() ? await puxarDoPrincipal() : await pullCatalogo();
    const outbox = await processarOutbox();
    return { pull, outbox, pendentes: await contarOutboxPendentes() };
  },
  async sincronizarFiscalPdv() {
    if (await ehSecundario()) {
      throw new Error("Sincronize o certificado no PDV principal.");
    }
    const resultado = await sincronizarFiscalPdv();
    if (!resultado.ok) {
      throw new Error(resultado.erro ?? "Falha ao buscar dados fiscais");
    }
    return resultado;
  },
  async statusFiscalPdv() {
    const numeracao = await obterNumeracaoNfce().catch(() => null);
    return {
      apelido: await getConfig("certificado_apelido", ""),
      validade: await getConfig("certificado_validade", ""),
      serie: numeracao?.serie ?? null,
      proximoNumero: numeracao?.proximo_numero ?? null,
      ultimaSync: await getConfig("fiscal_ultima_sync", ""),
      erro: await getConfig("fiscal_sync_erro", ""),
      caminho: await getConfig("certificado_path", "")
    };
  },
  async listarTerminaisPdv() {
    return obterTerminaisPdvLocais();
  },
  async cargaLocal() {
    const sessao = await obterSessao();
    if (!sessao.token || !sessao.idempresa) {
      throw new Error(
        "Faça login e selecione a empresa antes de carregar o catálogo."
      );
    }
    const secundario = await ehSecundario();
    const pull = secundario ? await puxarDoPrincipal() : await pullCatalogo();
    if (!secundario) {
      void puxarNfceDaRetaguarda().catch(() => 0);
    }
    return {
      ok: true,
      origem: secundario ? "principal" : "nuvem",
      produtos: pull.produtos,
      grupos: pull.grupos,
      gruposGourmet: pull.gruposGourmet,
      atalhos: pull.atalhos,
      clientes: pull.clientes,
      bandeiras: pull.bandeiras,
      meiosPagamento: pull.meiosPagamento
    };
  },
  async testarPrincipal(params) {
    return testarConexaoPrincipal(params);
  },
  async buscarTerminaisPrincipal(params) {
    return buscarOpcoesPdvNoPrincipal(params);
  },
  async conectarPrincipal() {
    const { conectarNoPrincipal: conectarNoPrincipal2 } = await Promise.resolve().then(() => servico);
    return conectarNoPrincipal2();
  },
  async criarVendaRapida(input) {
    const desconto = Number(input.valordesconto) || 0;
    const subtotal = input.itens.reduce(
      (acc, item) => acc + item.precototal,
      0
    );
    const total = Math.max(0, subtotal - desconto);
    const lancamentos = input.lancamentos?.length ? input.lancamentos : [lancamentoUnico(input.meio ?? "DINHEIRO", total)];
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const result = await criarVendaRapidaRemoto({
        ...input,
        lancamentos,
        valordesconto: desconto
      });
      avisarTecnibra();
      return result;
    }
    const venda = await criarVendaRapida({
      itens: input.itens,
      lancamentos,
      troco: input.troco,
      cliente: input.cliente,
      valordesconto: desconto
    });
    const emitir = await getConfig("emitir_nfce", "1") === "1";
    let fiscal = {
      modo: "nao_fiscal",
      mensagem: "Cupom não fiscal"
    };
    if (emitir) {
      fiscal = await emitirOuContingencia({
        idvenda: venda.id,
        onlineEmitir: () => emitirNfceOnlineDaVenda(venda.id)
      });
    } else {
      await emitirNfceOnlineDaVenda(venda.id, false);
      await imprimirCupomNaoFiscal(venda.id);
    }
    void imprimirProducaoPedido({
      origem: "Balcão",
      itens: input.itens
    });
    void processarOutbox();
    return { venda, fiscal };
  },
  async listarVendas() {
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return listarVendasRemoto();
    }
    return listarVendas(200);
  },
  async obterVenda(id) {
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return obterVendaRemoto(id);
    }
    return obterVenda(id);
  },
  async listarMesas() {
    await assertModuloGourmet();
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return listarMesasRemoto();
    }
    return listarMesas();
  },
  async obterMesa(numero2) {
    await assertModuloGourmet();
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return obterMesaRemoto(numero2);
    }
    return obterMesa(numero2);
  },
  async obterContaPorNumero(numero2) {
    await assertModuloGourmet();
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return obterContaPorNumeroRemoto(numero2);
    }
    return obterContaPorNumero(numero2);
  },
  async limparContasVazias() {
    await assertModuloGourmet();
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      const removidas2 = await limparContasVaziasRemoto();
      avisarTecnibra();
      return removidas2;
    }
    const removidas = await limparContasVazias();
    avisarTecnibra();
    return removidas;
  },
  async cancelarContaMesa(idconta) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const result = await cancelarContaMesaRemoto(idconta);
      avisarTecnibra();
      return result;
    }
    await cancelarContaMesa(idconta);
    avisarTecnibra();
    return { ok: true };
  },
  async cancelarItemConta(idconta, iditem, senha) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await cancelarItemContaRemoto(
        idconta,
        iditem,
        senha
      );
      avisarTecnibra();
      return conta2;
    }
    const conta = await cancelarItemConta(idconta, iditem, senha);
    avisarTecnibra();
    return conta;
  },
  async abrirContaMesa(numero2, nomecliente) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await abrirContaMesaRemoto(numero2, nomecliente);
      avisarTecnibra();
      return conta2;
    }
    const conta = await abrirContaMesa(numero2, nomecliente);
    avisarTecnibra();
    return conta;
  },
  async obterContaMesa(id) {
    await assertModuloGourmet();
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return obterContaMesaRemoto(id);
    }
    return obterContaMesa(id);
  },
  async adicionarItemConta(idconta, item) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await adicionarItemContaRemoto(idconta, item);
      avisarTecnibra();
      return conta2;
    }
    const conta = await adicionarItemConta(idconta, item);
    avisarTecnibra();
    return conta;
  },
  async atualizarNomeClienteConta(idconta, nomecliente) {
    await assertModuloGourmet();
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return atualizarNomeClienteContaRemoto(idconta, nomecliente);
    }
    return atualizarNomeClienteConta(idconta, nomecliente);
  },
  async enviarPedidoConta(idconta, clientOrderId, itens) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await enviarPedidoContaRemoto(
        idconta,
        clientOrderId,
        itens
      );
      avisarTecnibra();
      return conta2;
    }
    const conta = await enviarPedidoConta({ idconta, clientOrderId, itens });
    if (conta.pedidoNovo) {
      try {
        void imprimirProducaoPedido({
          origem: rotuloOrigemConta(conta),
          cliente: conta.nomecliente,
          itens: conta.itensProducao
        });
      } catch {
      }
    }
    avisarTecnibra();
    return conta;
  },
  async listarPedidosFila(pendentes) {
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return listarPedidosFilaRemoto(pendentes);
    }
    return listarPedidosFila(pendentes);
  },
  async listarPedidosProducao(idconta) {
    const linhas = await listarPedidosFila(false);
    const filtradas = idconta ? linhas.filter((linha) => linha.idconta === idconta) : linhas;
    const grupos = agruparLinhasPedidoFila(filtradas);
    const pedidos = [];
    for (const itens of grupos) {
      const primeiro = itens[0];
      if (!primeiro) {
        continue;
      }
      const conta = await obterContaMesa(primeiro.idconta);
      const origem = conta ? rotuloOrigemConta(conta) : await rotuloOrigemMesa(primeiro.numero_mesa);
      pedidos.push({
        clientOrderId: primeiro.client_order_id,
        idconta: primeiro.idconta,
        numeroMesa: primeiro.numero_mesa,
        nomecliente: primeiro.nomecliente,
        origem,
        criadoem: primeiro.criadoem,
        status: itens.some((item) => item.status === "pendente") ? "pendente" : "entregue",
        itens: itens.map((item) => ({
          id: item.id,
          idproduto: item.idproduto,
          descricao: item.descricao,
          quantidade: item.quantidade,
          observacao: item.observacao
        }))
      });
    }
    return pedidos;
  },
  async reimprimirPedidoProducao(clientOrderId) {
    const id = clientOrderId.trim();
    if (!id) {
      throw new Error("Pedido inválido");
    }
    const pedidos = await localApi.listarPedidosProducao();
    const pedido = pedidos.find((item) => item.clientOrderId === id);
    if (!pedido) {
      throw new Error("Pedido não encontrado");
    }
    await imprimirProducaoPedido({
      origem: pedido.origem,
      cliente: pedido.nomecliente,
      itens: pedido.itens,
      reimpressao: true
    });
    return { ok: true };
  },
  async marcarPedidoEntregue(id) {
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return marcarPedidoEntregueRemoto(id);
    }
    await marcarPedidoEntregue(id);
    return { ok: true };
  },
  async limparFilaPedidos() {
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return limparFilaPedidosRemoto();
    }
    await limparFilaPedidos();
    return { ok: true };
  },
  async adicionarItemNaMesa(numero2, item, nomecliente) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await adicionarItemNaMesaRemoto(
        numero2,
        item,
        nomecliente
      );
      avisarTecnibra();
      return conta2;
    }
    const conta = await adicionarItemNaMesa(numero2, item, nomecliente);
    try {
      void imprimirProducaoPedido({
        origem: await rotuloOrigemMesa(conta.numero_mesa),
        cliente: conta.nomecliente,
        itens: [
          {
            idproduto: item.idproduto,
            descricao: item.descricao,
            quantidade: item.quantidade,
            observacao: item.observacao
          }
        ]
      });
    } catch {
    }
    avisarTecnibra();
    return conta;
  },
  async fecharContaMesa(idconta, lancamentosOuMeio, troco, cliente) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    const secundario = await ehSecundario();
    let lancamentos;
    if (typeof lancamentosOuMeio === "string") {
      if (!ehMeioPagamento(lancamentosOuMeio)) {
        throw new Error("Meio de pagamento inválido");
      }
      const conta = secundario ? await obterContaMesaRemoto(idconta) : await obterContaMesa(idconta);
      if (!conta) {
        throw new Error("Conta inválida");
      }
      lancamentos = [lancamentoUnico(lancamentosOuMeio, conta.valorrestante)];
    } else {
      lancamentos = lancamentosOuMeio;
    }
    if (secundario) {
      const result = await fecharContaMesaRemoto(
        idconta,
        lancamentos,
        troco,
        cliente
      );
      avisarTecnibra();
      return result;
    }
    const venda = await fecharContaMesa({
      idconta,
      lancamentos,
      troco,
      cliente
    });
    const emitir = await getConfig("emitir_nfce", "1") === "1";
    let fiscal = {
      modo: "nao_fiscal",
      mensagem: "Conta fechada"
    };
    if (emitir) {
      const result = await emitirOuContingencia({
        idvenda: venda.id,
        onlineEmitir: () => emitirNfceOnlineDaVenda(venda.id)
      });
      fiscal = {
        modo: result.modo,
        mensagem: result.mensagem,
        cStat: result.cStat
      };
      if (result.modo === "nao_fiscal") {
        const nfce = await obterNfcePorVenda(venda.id);
        if (nfce?.chave) {
          await imprimirDanfce({
            vendaId: venda.id,
            chave: nfce.chave ?? void 0,
            qrcode: nfce.qrcode ?? void 0,
            contingencia: nfce.tpemis === 9,
            motivo: nfce.motivo_contingencia ?? void 0
          });
        }
      }
    } else {
      await emitirNfceOnlineDaVenda(venda.id, false);
      await imprimirCupomNaoFiscal(venda.id);
    }
    void processarOutbox();
    avisarTecnibra();
    return { venda, fiscal };
  },
  async listarPedidosEntrega(statusFiltro) {
    await assertModuloGourmet();
    if (await ehSecundario()) {
      await garantirOperacaoSecundario();
      return listarPedidosEntregaRemoto(statusFiltro);
    }
    return listarPedidosEntrega(statusFiltro);
  },
  async abrirPedidoEntrega(params) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await abrirPedidoEntregaRemoto(params);
      avisarTecnibra();
      return conta2;
    }
    const conta = await abrirPedidoEntrega(params);
    avisarTecnibra();
    return conta;
  },
  async atualizarStatusEntrega(idconta, status2) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      return atualizarStatusEntregaRemoto(idconta, status2);
    }
    return atualizarStatusEntrega(idconta, status2);
  },
  async aplicarTaxaEntrega(idconta, valorentrega) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await aplicarTaxaEntregaRemoto(
        idconta,
        valorentrega
      );
      avisarTecnibra();
      return conta2;
    }
    const conta = await aplicarTaxaEntrega(idconta, valorentrega);
    avisarTecnibra();
    return conta;
  },
  async atualizarDadosEntrega(idconta, dados) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      return atualizarDadosEntregaRemoto(idconta, dados);
    }
    return atualizarDadosEntrega(idconta, dados);
  },
  async buscarClientesPdv(termo, limit) {
    await assertModuloGourmet();
    return buscarClientesPdv(termo, limit);
  },
  async salvarClientePdv(params) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    return salvarClientePdv(params);
  },
  async ingestPedidoDelivery(params) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    const result = await ingestPedidoDelivery(params);
    if (result.action === "created" && result.itensProducao.length) {
      try {
        void imprimirProducaoPedido({
          origem: rotuloOrigemConta(result.conta) || rotuloProducaoEntrega({
            modalidade: result.conta.modalidade,
            senhaChamada: result.conta.senha_chamada,
            protocolo: result.conta.orderidintegracao
          }),
          cliente: result.conta.nomecliente,
          itens: result.itensProducao
        });
      } catch {
      }
    }
    avisarTecnibra();
    return result;
  },
  async aplicarAjustesConta(idconta, ajustes) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      return aplicarAjustesContaRemoto(idconta, ajustes);
    }
    return aplicarAjustesConta({ idconta, ...ajustes });
  },
  async validarSenhaGerencial(senha) {
    return validarSenhaGerencial(senha);
  },
  async senhaGerencialDefinida() {
    return senhaGerencialDefinida();
  },
  async imprimirPreConta(idconta) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta = await obterContaMesaRemoto(idconta);
      if (!conta) {
        throw new Error("Conta inválida");
      }
      return imprimirPreConta(conta);
    }
    return imprimirPreConta(idconta);
  },
  async registrarPagamentoConta(idconta, lancamentos, troco) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const result2 = await registrarPagamentoContaRemoto(
        idconta,
        lancamentos,
        troco
      );
      avisarTecnibra();
      return result2;
    }
    const result = await registrarPagamentoConta({
      idconta,
      lancamentos,
      troco
    });
    if (result.venda) {
      const emitir = await getConfig("emitir_nfce", "1") === "1";
      if (emitir) {
        await emitirOuContingencia({
          idvenda: result.venda.id,
          onlineEmitir: () => emitirNfceOnlineDaVenda(result.venda.id)
        });
      } else {
        await emitirNfceOnlineDaVenda(result.venda.id, false);
        await imprimirCupomNaoFiscal(result.venda.id);
      }
      void processarOutbox();
      avisarTecnibra();
    }
    return result;
  },
  async fecharFatiaItens(idconta, idsItens, lancamentos, troco, cliente) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const result2 = await fecharFatiaItensRemoto(
        idconta,
        idsItens,
        lancamentos,
        troco,
        cliente
      );
      avisarTecnibra();
      return result2;
    }
    const result = await fecharFatiaItens({
      idconta,
      idsItens,
      lancamentos,
      troco,
      cliente
    });
    const emitir = await getConfig("emitir_nfce", "1") === "1";
    if (emitir) {
      await emitirOuContingencia({
        idvenda: result.venda.id,
        onlineEmitir: () => emitirNfceOnlineDaVenda(result.venda.id)
      });
    } else {
      await emitirNfceOnlineDaVenda(result.venda.id, false);
      await imprimirCupomNaoFiscal(result.venda.id);
    }
    void processarOutbox();
    avisarTecnibra();
    return result;
  },
  async transferirConta(idconta, numeroDestino) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await transferirContaRemoto(
        idconta,
        numeroDestino
      );
      avisarTecnibra();
      return conta2;
    }
    const conta = await transferirConta(idconta, numeroDestino);
    avisarTecnibra();
    return conta;
  },
  async transferirItens(idcontaOrigem, idsItens, numeroDestino) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const result2 = await transferirItensRemoto(
        idcontaOrigem,
        idsItens,
        numeroDestino
      );
      avisarTecnibra();
      return result2;
    }
    const result = await transferirItens({
      idcontaOrigem,
      idsItens,
      numeroDestino
    });
    avisarTecnibra();
    return result;
  },
  async juntarContas(idOrigem, numeroDestino) {
    await assertModuloGourmet();
    await garantirOperacaoSecundario();
    if (await ehSecundario()) {
      const conta2 = await juntarContasRemoto(idOrigem, numeroDestino);
      avisarTecnibra();
      return conta2;
    }
    const mesa = await obterMesa(numeroDestino);
    if (!mesa.idconta) {
      throw new Error("Destino sem conta aberta");
    }
    const conta = await juntarContas(idOrigem, mesa.idconta);
    avisarTecnibra();
    return conta;
  },
  async reimprimir(vendaId) {
    const nfce = await obterNfcePorVenda(vendaId);
    if (nfce?.chave) {
      return imprimirDanfce({
        vendaId,
        chave: nfce.chave ?? void 0,
        qrcode: nfce.qrcode ?? void 0,
        contingencia: nfce.tpemis === 9,
        motivo: nfce.motivo_contingencia ?? void 0
      });
    }
    return imprimirCupomNaoFiscal(vendaId);
  },
  async retransmitirNfce(vendaId) {
    const venda = await obterVenda(vendaId);
    if (!venda) {
      throw new Error("Venda não encontrada");
    }
    const nfce = await obterNfcePorVenda(vendaId);
    const online = await pingApi();
    if (!online) {
      throw new Error(
        "Sem conexão com a retaguarda. Tente novamente quando estiver online."
      );
    }
    const sessao = await obterSessao();
    if (!sessao.idempresa || !sessao.userid) {
      throw new Error("Sessão inválida");
    }
    const { aplicarEmissaoNfceNaVendaLocal: aplicarEmissaoNfceNaVendaLocal2 } = await Promise.resolve().then(() => persistirNfceOnline);
    if (nfce && nfce.tpemis === 9 && nfce.status !== "transmitida" && nfce.status !== "autorizada") {
      let notaRemotaJaExiste = false;
      if (venda.idremoto) {
        try {
          const remota = await buscarVendaPdvGourmet(venda.idremoto);
          notaRemotaJaExiste = Boolean(remota.idnotafiscalnfce);
        } catch {
          notaRemotaJaExiste = false;
        }
      }
      if (!notaRemotaJaExiste) {
        await processarOutbox();
        const depois = await obterNfcePorVenda(vendaId);
        if (depois?.status === "transmitida" || depois?.status === "autorizada") {
          return {
            modo: "contingencia",
            mensagem: "NFC-e de contingência enviada à retaguarda",
            chave: depois.chave ?? void 0
          };
        }
        if (!nfce.xml) {
          throw new Error(
            "XML de contingência não encontrado para retransmitir"
          );
        }
        const result = await transmitirNfceContingencia({
          idempresa: sessao.idempresa,
          idvenda: venda.idremoto ?? void 0,
          xml: nfce.xml,
          chave: nfce.chave ?? void 0,
          serie: nfce.serie,
          numero: nfce.numero,
          motivo: nfce.motivo_contingencia ?? "Contingencia offline PDV",
          datacontingencia: (/* @__PURE__ */ new Date()).toISOString()
        });
        await marcarNfceTransmitida(nfce.id);
        await atualizarVendaSync(vendaId, {
          nfce_status: result.transmitida ? "transmitida" : "contingencia"
        });
        return {
          modo: "contingencia",
          mensagem: result.transmitida ? "NFC-e de contingência enviada à retaguarda" : result.erro ?? "Contingência registrada na retaguarda, aguardando SEFAZ",
          chave: nfce.chave ?? void 0
        };
      }
    }
    if (!venda.idremoto) {
      const resultado = await emitirNfceOnlineDaVenda(vendaId);
      if (resultado.ok) {
        await imprimirDanfce({
          chave: resultado.chave,
          qrcode: resultado.qrCode,
          contingencia: false,
          vendaId
        });
        return {
          modo: "online",
          mensagem: "NFC-e autorizada",
          chave: resultado.chave,
          qrcode: resultado.qrCode
        };
      }
      return {
        modo: "erro",
        mensagem: resultado.cStat ? `NFC-e rejeitada (${resultado.cStat}): ${resultado.erro}` : resultado.erro ?? "Falha na retransmissão da NFC-e",
        cStat: resultado.cStat
      };
    }
    const emissao = await retransmitirNfceVendaPdv({
      idempresa: sessao.idempresa,
      idvenda: venda.idremoto
    });
    await aplicarEmissaoNfceNaVendaLocal2(vendaId, {
      emitida: emissao.emitida,
      idnotafiscal: emissao.idnotafiscal,
      chave: emissao.chave,
      qrCode: emissao.qrCode,
      protocolo: emissao.protocolo,
      xml: emissao.xml,
      serie: emissao.serie,
      numero: emissao.numero
    });
    if (emissao.emitida) {
      await imprimirDanfce({
        chave: emissao.chave,
        qrcode: emissao.qrCode,
        contingencia: false,
        vendaId
      });
      return {
        modo: "online",
        mensagem: "NFC-e autorizada",
        chave: emissao.chave,
        qrcode: emissao.qrCode
      };
    }
    const motivo = emissao.erro ?? emissao.xMotivo ?? emissao.pendencias?.map((p) => p.mensagem).join("; ") ?? "Falha na retransmissão da NFC-e";
    return {
      modo: "erro",
      mensagem: emissao.cStat ? `NFC-e rejeitada (${emissao.cStat}): ${motivo}` : `NFC-e rejeitada: ${motivo}`,
      cStat: emissao.cStat
    };
  },
  async inutilizarNfce(vendaId, justificativa) {
    const venda = await obterVenda(vendaId);
    if (!venda) {
      throw new Error("Venda não encontrada");
    }
    const online = await pingApi();
    if (!online) {
      throw new Error(
        "Sem conexão com a retaguarda. Tente novamente quando estiver online."
      );
    }
    const sessao = await obterSessao();
    if (!sessao.idempresa || !sessao.userid) {
      throw new Error("Sessão inválida");
    }
    if (!venda.idremoto) {
      await processarOutbox();
    }
    const vendaAtual = await obterVenda(vendaId) ?? venda;
    if (!vendaAtual.idremoto) {
      throw new Error(
        "Venda ainda não está na retaguarda. Sincronize e tente novamente."
      );
    }
    const resultado = await inutilizarNfceVendaPdv({
      idempresa: sessao.idempresa,
      idvenda: vendaAtual.idremoto,
      justificativa
    });
    const nfce = await obterNfcePorVenda(vendaId);
    if (nfce) {
      await atualizarNfceLocalCampos(nfce.id, {
        status: "inutilizada",
        transmitida: false
      });
    }
    await atualizarVendaSync(vendaId, { nfce_status: "inutilizada" });
    return {
      modo: "inutilizada",
      mensagem: resultado.xMotivo?.trim() || "Numeração da NFC-e inutilizada na SEFAZ",
      idnotafiscal: resultado.idnotafiscal,
      cStat: resultado.cStat,
      protocolo: resultado.protocolo
    };
  }
};
const execFileAsync = node_util.promisify(node_child_process.execFile);
const REGRA_EXE = "PDV Mais Gestao LAN";
const REGRA_TCP = "PDV Mais Gestao LAN TCP";
async function garantirRegraFirewall(porta) {
  if (process.platform !== "win32") return;
  const exe = process.execPath;
  await execNetsh([
    "advfirewall",
    "firewall",
    "delete",
    "rule",
    `name=${REGRA_EXE}`
  ]);
  await execNetsh([
    "advfirewall",
    "firewall",
    "delete",
    "rule",
    `name=${REGRA_TCP}`
  ]);
  await execNetsh([
    "advfirewall",
    "firewall",
    "add",
    "rule",
    `name=${REGRA_EXE}`,
    "dir=in",
    "action=allow",
    `program=${exe}`,
    "enable=yes",
    "profile=any"
  ]);
  await execNetsh([
    "advfirewall",
    "firewall",
    "add",
    "rule",
    `name=${REGRA_TCP}`,
    "dir=in",
    "action=allow",
    "protocol=TCP",
    `localport=${porta}`,
    "profile=any"
  ]);
}
async function execNetsh(args) {
  await execFileAsync("netsh", args, { windowsHide: true }).catch(
    () => void 0
  );
}
function listarIpsLan() {
  const ips = [];
  const ifaces = node_os.networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    for (const addr of addrs ?? []) {
      const family = String(addr.family);
      if ((family === "IPv4" || family === "4") && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}
const ROTAS_PUBLICAS = /* @__PURE__ */ new Set([
  "GET /pos/health",
  "POST /pos/login",
  "GET /pos/pdv/identidade",
  "GET /pos/pdv/terminais",
  "POST /pos/pdv/handshake"
]);
const CABECALHOS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type"
};
const RETRY_MS = 5e3;
let server = null;
let portaAtual = 0;
let ultimoErro = null;
let retryTimer = null;
let encerrando = false;
function statusLanAtual() {
  return {
    habilitada: true,
    ouvindo: server != null && portaAtual > 0,
    porta: portaAtual,
    ips: listarIpsLan(),
    erro: ultimoErro
  };
}
async function lerConfigLan() {
  try {
    return {
      modo: normalizarModoPdv(await getConfig("pdv_modo", "principal")),
      habilitada: await getConfig("lan_habilitada", "1") === "1",
      porta: Math.max(1, Number(await getConfig("lan_porta", "5050")) || 5050)
    };
  } catch {
    return { modo: "principal", habilitada: true, porta: 5050 };
  }
}
function limparRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}
function agendarRetry() {
  if (encerrando || retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void startLanServer().catch(() => void 0);
  }, RETRY_MS);
}
function marcarErro(err) {
  ultimoErro = err instanceof Error ? err.message : String(err);
}
async function startLanServer() {
  if (encerrando) {
    return { ...statusLanAtual(), habilitada: false, motivo: "encerrando" };
  }
  const config = await lerConfigLan();
  if (config.modo === "secundario") {
    limparRetry();
    await fecharServidor();
    ultimoErro = null;
    return {
      habilitada: false,
      ouvindo: false,
      porta: 0,
      ips: listarIpsLan(),
      erro: null,
      motivo: "PDV secundário não expõe API LAN"
    };
  }
  if (!config.habilitada) {
    limparRetry();
    await fecharServidor();
    ultimoErro = null;
    return {
      habilitada: false,
      ouvindo: false,
      porta: 0,
      ips: listarIpsLan(),
      erro: null,
      motivo: "LAN desabilitada"
    };
  }
  if (server && portaAtual === config.porta) {
    ultimoErro = null;
    return {
      habilitada: true,
      ouvindo: true,
      porta: portaAtual,
      ips: listarIpsLan(),
      erro: null
    };
  }
  await fecharServidor();
  try {
    const iniciado = await escutar(config.porta);
    ultimoErro = null;
    void garantirRegraFirewall(config.porta);
    console.log(`PDV LAN API em 0.0.0.0:${iniciado.porta}`);
    return {
      habilitada: true,
      ouvindo: true,
      porta: iniciado.porta,
      ips: listarIpsLan(),
      erro: null
    };
  } catch (err) {
    marcarErro(err);
    console.error("Falha ao iniciar API LAN:", ultimoErro);
    agendarRetry();
    return {
      habilitada: true,
      ouvindo: false,
      porta: 0,
      ips: listarIpsLan(),
      erro: ultimoErro,
      motivo: ultimoErro ?? void 0
    };
  }
}
function escutar(porta) {
  return new Promise((resolve, reject) => {
    const httpServer = node_http.createServer((req, res) => {
      void tratarRequisicao(req, res);
    });
    let finalizado = false;
    httpServer.on("error", (err) => {
      if (finalizado) {
        if (server === httpServer) {
          server = null;
          portaAtual = 0;
          marcarErro(err);
          httpServer.close();
          agendarRetry();
        }
        return;
      }
      finalizado = true;
      httpServer.close();
      reject(err);
    });
    httpServer.listen(porta, "0.0.0.0", () => {
      if (finalizado) return;
      finalizado = true;
      server = httpServer;
      portaAtual = porta;
      resolve({ porta });
    });
  });
}
async function fecharServidor() {
  if (!server) {
    portaAtual = 0;
    return;
  }
  const atual = server;
  server = null;
  portaAtual = 0;
  await new Promise((resolve) => {
    atual.close(() => resolve());
  });
}
async function stopLanServer() {
  limparRetry();
  await fecharServidor();
}
async function encerrarLanServer() {
  encerrando = true;
  await stopLanServer();
}
async function restartLanServer() {
  encerrando = false;
  limparRetry();
  await fecharServidor();
  return startLanServer();
}
async function tratarRequisicao(req, res) {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = (req.method ?? "GET").toUpperCase();
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const chave = `${method} ${path}`;
    if (method === "OPTIONS") {
      res.writeHead(204, CABECALHOS_CORS);
      res.end();
      return;
    }
    if (!ROTAS_PUBLICAS.has(chave) && !await autorizar(req)) {
      enviarJson(res, 401, { error: "Não autorizado" });
      return;
    }
    const body = method === "GET" || method === "HEAD" ? Object.fromEntries(url.searchParams.entries()) : await lerJson(req);
    const resultado = await despachar(method, path, body);
    if (resultado === void 0) {
      enviarJson(res, 404, { error: "Rota não encontrada" });
      return;
    }
    enviarJson(res, resultado.status, resultado.body);
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro interno";
    const status2 = statusDeErro(err);
    enviarJson(res, status2, { error: mensagem });
  }
}
async function autorizar(req) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return false;
  }
  if (await tokenTerminalValido(token)) {
    return true;
  }
  const sessao = await obterSessao();
  return Boolean(sessao.token && sessao.token === token);
}
async function despachar(method, path, body) {
  if (path === "/pos/mesas" || path.startsWith("/pos/mesas/") || path.startsWith("/pos/contas/") || path === "/pos/delivery" || path.startsWith("/pos/delivery/")) {
    const sessao = await obterSessao();
    if (!sessaoTemGourmet(sessao.modulogourmet)) {
      return {
        status: 403,
        body: {
          error: "O plano desta empresa não inclui o módulo Gourmet. Mesas e comandas ficam indisponíveis."
        }
      };
    }
  }
  if (method === "GET" && path === "/pos/health") {
    return { status: 200, body: await localApi.health() };
  }
  if (method === "GET" && path === "/pos/pdv/identidade") {
    const numeropdv = parseNumeroPdv(await getConfig("numeropdv", "1")) || 1;
    return {
      status: 200,
      body: {
        app: "pdv-mais-gestao",
        modo: normalizarModoPdv(await getConfig("pdv_modo", "principal")),
        numeropdv,
        lanPorta: portaAtual || Number(await getConfig("lan_porta", "5050")) || 5050
      }
    };
  }
  if (method === "GET" && path === "/pos/pdv/terminais") {
    const modo = normalizarModoPdv(await getConfig("pdv_modo", "principal"));
    if (modo === "secundario") {
      return {
        status: 400,
        body: {
          error: "Este endereço é um PDV secundário. Informe o IP do principal."
        }
      };
    }
    const numeropdvPrincipal = parseNumeroPdv(await getConfig("numeropdv", "1")) || 1;
    const terminais = await localApi.listarTerminaisPdv();
    const ocupados = await numerosOcupadosPorSecundarios();
    return {
      status: 200,
      body: {
        numeropdvPrincipal,
        terminais,
        ocupados
      }
    };
  }
  if (method === "POST" && path === "/pos/pdv/handshake") {
    const numeroPrincipal = parseNumeroPdv(await getConfig("numeropdv", "1")) || 1;
    const result = await handshakeTerminal({
      numeropdv: String(body.numeropdv ?? ""),
      identificador: String(body.identificador ?? ""),
      numeroPrincipal
    });
    return {
      status: 200,
      body: {
        ok: true,
        token: result.token,
        numeropdv: result.numeropdv,
        numeropdvPrincipal: numeroPrincipal
      }
    };
  }
  if (method === "GET" && path === "/pos/pdv/config-negocio") {
    return {
      status: 200,
      body: { config: extrairConfigNegocio(await getAllConfig()) }
    };
  }
  if (method === "GET" && path === "/pos/pdv/catalogo") {
    return { status: 200, body: await localApi.catalogoCarga() };
  }
  if (method === "POST" && path === "/pos/login") {
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    const result = await localApi.login(email, password);
    const sessao = await obterSessao();
    return {
      status: 200,
      body: {
        token: sessao.token,
        userid: sessao.userid,
        username: result.username,
        empresas: result.empresas
      }
    };
  }
  if (method === "GET" && path === "/pos/status") {
    return { status: 200, body: await localApi.getStatus() };
  }
  if (method === "GET" && path === "/pos/balanca/peso") {
    return { status: 200, body: await localApi["balanca.lerPeso"]() };
  }
  if (method === "GET" && path === "/pos/empresas") {
    return { status: 200, body: { data: await localApi.listarEmpresasLan() } };
  }
  if (method === "POST" && path === "/pos/empresa") {
    const idempresa = String(body.idempresa ?? "");
    const nomeempresa = String(body.nomeempresa ?? "");
    return {
      status: 200,
      body: await localApi.selecionarEmpresa(idempresa, nomeempresa)
    };
  }
  if (method === "GET" && path === "/pos/sync") {
    return { status: 200, body: await localApi.catalogoCarga() };
  }
  if (method === "GET" && path === "/pos/mesas") {
    return { status: 200, body: { data: await localApi.listarMesas() } };
  }
  if (method === "POST" && path === "/pos/mesas/limpar-vazias") {
    const removidas = await localApi.limparContasVazias();
    return { status: 200, body: { removidas } };
  }
  const mesaMatch = path.match(/^\/pos\/mesas\/(\d+)$/);
  if (method === "GET" && mesaMatch) {
    return {
      status: 200,
      body: await localApi.obterMesa(Number(mesaMatch[1]))
    };
  }
  const mesaContaMatch = path.match(/^\/pos\/mesas\/(\d+)\/conta$/);
  if (method === "GET" && mesaContaMatch) {
    return {
      status: 200,
      body: await localApi.obterContaPorNumero(Number(mesaContaMatch[1]))
    };
  }
  const mesaAbrirMatch = path.match(/^\/pos\/mesas\/(\d+)\/abrir$/);
  if (method === "POST" && mesaAbrirMatch) {
    const nome = body.nomecliente ? String(body.nomecliente) : void 0;
    return {
      status: 200,
      body: await localApi.abrirContaMesa(Number(mesaAbrirMatch[1]), nome)
    };
  }
  const mesaItensMatch = path.match(/^\/pos\/mesas\/(\d+)\/itens$/);
  if (method === "POST" && mesaItensMatch) {
    return {
      status: 200,
      body: await localApi.adicionarItemNaMesa(
        Number(mesaItensMatch[1]),
        itemDeBody(body),
        body.nomecliente ? String(body.nomecliente) : void 0
      )
    };
  }
  const contaMatch = path.match(/^\/pos\/contas\/([^/]+)$/);
  if (method === "GET" && contaMatch) {
    return { status: 200, body: await localApi.obterContaMesa(contaMatch[1]) };
  }
  const contaNomeMatch = path.match(/^\/pos\/contas\/([^/]+)\/nome$/);
  if (method === "PUT" && contaNomeMatch) {
    return {
      status: 200,
      body: await localApi.atualizarNomeClienteConta(
        contaNomeMatch[1],
        String(body.nomecliente ?? "")
      )
    };
  }
  const contaPedidoMatch = path.match(/^\/pos\/contas\/([^/]+)\/pedido$/);
  if (method === "POST" && contaPedidoMatch) {
    const itensRaw = Array.isArray(body.itens) ? body.itens : [];
    const itens = itensRaw.map((item) => {
      const i = item;
      return {
        idproduto: String(i.idproduto ?? ""),
        quantidade: Number(i.quantidade ?? 1),
        observacao: i.observacao != null ? String(i.observacao) : null,
        idprodutomeio: i.idprodutomeio != null ? String(i.idprodutomeio) : null
      };
    });
    return {
      status: 200,
      body: await localApi.enviarPedidoConta(
        contaPedidoMatch[1],
        String(body.clientOrderId ?? ""),
        itens
      )
    };
  }
  const contaItensMatch = path.match(/^\/pos\/contas\/([^/]+)\/itens$/);
  if (method === "POST" && contaItensMatch) {
    return {
      status: 200,
      body: await localApi.adicionarItemConta(
        contaItensMatch[1],
        itemDeBody(body)
      )
    };
  }
  const contaItemCancelarMatch = path.match(
    /^\/pos\/contas\/([^/]+)\/itens\/([^/]+)\/cancelar$/
  );
  if (method === "POST" && contaItemCancelarMatch) {
    return {
      status: 200,
      body: await localApi.cancelarItemConta(
        contaItemCancelarMatch[1],
        contaItemCancelarMatch[2],
        body.senha != null ? String(body.senha) : void 0
      )
    };
  }
  const contaFecharMatch = path.match(/^\/pos\/contas\/([^/]+)\/fechar$/);
  if (method === "POST" && contaFecharMatch) {
    const lancamentos = lancamentosDeBody(body);
    const cliente = body.cliente && typeof body.cliente === "object" ? body.cliente : null;
    return {
      status: 200,
      body: await localApi.fecharContaMesa(
        contaFecharMatch[1],
        lancamentos.length ? lancamentos : meioDeBody(body),
        body.troco != null ? Number(body.troco) : void 0,
        cliente?.id ? {
          id: String(cliente.id),
          nome: String(cliente.nome ?? ""),
          cnpjcpf: cliente.cnpjcpf != null ? String(cliente.cnpjcpf) : null
        } : null
      )
    };
  }
  const contaCancelarMatch = path.match(/^\/pos\/contas\/([^/]+)\/cancelar$/);
  if (method === "POST" && contaCancelarMatch) {
    return {
      status: 200,
      body: await localApi.cancelarContaMesa(contaCancelarMatch[1])
    };
  }
  const contaAjustesMatch = path.match(/^\/pos\/contas\/([^/]+)\/ajustes$/);
  if (method === "POST" && contaAjustesMatch) {
    return {
      status: 200,
      body: await localApi.aplicarAjustesConta(contaAjustesMatch[1], {
        numeropessoas: body.numeropessoas != null ? Number(body.numeropessoas) : void 0,
        taxaAtiva: body.taxaAtiva != null ? Boolean(body.taxaAtiva) : void 0,
        desconto: body.desconto != null ? Number(body.desconto) : void 0,
        senha: body.senha != null ? String(body.senha) : void 0
      })
    };
  }
  const contaPreMatch = path.match(/^\/pos\/contas\/([^/]+)\/preconta$/);
  if (method === "POST" && contaPreMatch) {
    return {
      status: 200,
      body: await localApi.imprimirPreConta(contaPreMatch[1])
    };
  }
  const contaPagMatch = path.match(/^\/pos\/contas\/([^/]+)\/pagamento$/);
  if (method === "POST" && contaPagMatch) {
    return {
      status: 200,
      body: await localApi.registrarPagamentoConta(
        contaPagMatch[1],
        lancamentosDeBody(body),
        body.troco != null ? Number(body.troco) : void 0
      )
    };
  }
  const contaFatiaMatch = path.match(/^\/pos\/contas\/([^/]+)\/fatia$/);
  if (method === "POST" && contaFatiaMatch) {
    const ids = Array.isArray(body.idsItens) ? body.idsItens.map((id) => String(id)) : [];
    return {
      status: 200,
      body: await localApi.fecharFatiaItens(
        contaFatiaMatch[1],
        ids,
        lancamentosDeBody(body),
        body.troco != null ? Number(body.troco) : void 0
      )
    };
  }
  const contaTransMatch = path.match(/^\/pos\/contas\/([^/]+)\/transferir$/);
  if (method === "POST" && contaTransMatch) {
    const ids = Array.isArray(body.idsItens) ? body.idsItens.map((id) => String(id)) : [];
    if (ids.length) {
      return {
        status: 200,
        body: await localApi.transferirItens(
          contaTransMatch[1],
          ids,
          Number(body.numeroDestino)
        )
      };
    }
    return {
      status: 200,
      body: await localApi.transferirConta(
        contaTransMatch[1],
        Number(body.numeroDestino)
      )
    };
  }
  const contaJuntarMatch = path.match(/^\/pos\/contas\/([^/]+)\/juntar$/);
  if (method === "POST" && contaJuntarMatch) {
    return {
      status: 200,
      body: await localApi.juntarContas(
        contaJuntarMatch[1],
        Number(body.numeroDestino)
      )
    };
  }
  const contaTaxaMatch = path.match(/^\/pos\/contas\/([^/]+)\/taxa-entrega$/);
  if (method === "POST" && contaTaxaMatch) {
    return {
      status: 200,
      body: await localApi.aplicarTaxaEntrega(
        contaTaxaMatch[1],
        Number(body.valorentrega ?? 0)
      )
    };
  }
  if (method === "POST" && path === "/pos/vendas/rapida") {
    const itensRaw = Array.isArray(body.itens) ? body.itens : [];
    const itens = itensRaw.map((item) => {
      const i = item;
      return {
        idproduto: String(i.idproduto ?? ""),
        descricao: String(i.descricao ?? ""),
        quantidade: Number(i.quantidade ?? 0),
        precounitario: Number(i.precounitario ?? 0),
        precototal: Number(i.precototal ?? 0)
      };
    });
    const lancamentos = lancamentosDeBody(body);
    return {
      status: 200,
      body: await localApi.criarVendaRapida({
        itens,
        ...lancamentos.length ? { lancamentos } : { meio: meioDeBody(body) },
        troco: body.troco != null ? Number(body.troco) : void 0,
        valordesconto: body.desconto != null ? Number(body.desconto) : void 0
      })
    };
  }
  if (method === "GET" && path === "/pos/vendas") {
    return { status: 200, body: await localApi.listarVendas() };
  }
  if (method === "GET" && path === "/pos/pedidos") {
    const pendentes = String(body.pendentes ?? "1") !== "0";
    return {
      status: 200,
      body: { data: await localApi.listarPedidosFila(pendentes) }
    };
  }
  if (method === "POST" && path === "/pos/pedidos/limpar-fila") {
    return { status: 200, body: await localApi.limparFilaPedidos() };
  }
  if (method === "POST" && path === "/pos/pedidos/reimprimir") {
    const clientOrderId = String(body.clientOrderId ?? body.id ?? "");
    return {
      status: 200,
      body: await localApi.reimprimirPedidoProducao(clientOrderId)
    };
  }
  if (method === "GET" && path === "/pos/delivery") {
    const statusFiltro = body.status != null ? String(body.status) : void 0;
    return {
      status: 200,
      body: { data: await localApi.listarPedidosEntrega(statusFiltro) }
    };
  }
  if (method === "POST" && path === "/pos/delivery") {
    const modalidadeRaw = String(body.modalidade ?? "delivery");
    const modalidade = modalidadeRaw === "retirada" ? "retirada" : "delivery";
    return {
      status: 200,
      body: await localApi.abrirPedidoEntrega({
        modalidade,
        nomecliente: body.nomecliente != null ? String(body.nomecliente) : null,
        telefone: body.telefone != null ? String(body.telefone) : null,
        endereco: body.endereco != null ? String(body.endereco) : null,
        bairro: body.bairro != null ? String(body.bairro) : null,
        complemento: body.complemento != null ? String(body.complemento) : null,
        referencia: body.referencia != null ? String(body.referencia) : null,
        valorentrega: body.valorentrega != null ? Number(body.valorentrega) : null,
        idcliente: body.idcliente != null ? String(body.idcliente) : null,
        obs: body.obs != null ? String(body.obs) : null
      })
    };
  }
  if (method === "POST" && path === "/pos/delivery/ingest") {
    const contamesa = body.contamesa ?? body;
    const itensRaw = Array.isArray(body.itens) ? body.itens : [];
    const protocol = String(
      body.protocol ?? contamesa.orderidintegracao ?? body.orderidintegracao ?? ""
    );
    const modalidadeRaw = String(
      body.modalidade ?? (Number(contamesa.retiradanobalcao) === 1 ? "retirada" : "delivery")
    );
    const itens = itensRaw.map((item) => {
      const i = item;
      return {
        idproduto: i.idproduto != null ? String(i.idproduto) : null,
        ean: i.ean != null ? String(i.ean) : null,
        codigo: i.codigo != null ? String(i.codigo) : null,
        codigoproduto: i.codigoproduto != null ? String(i.codigoproduto) : null,
        nomeproduto: i.nomeproduto != null ? String(i.nomeproduto) : null,
        quantidade: Number(i.quantidade ?? 1),
        precounitario: i.precounitario != null ? Number(i.precounitario) : null,
        observacao: i.observacao != null ? String(i.observacao) : null
      };
    });
    const result = await localApi.ingestPedidoDelivery({
      protocol,
      modalidade: modalidadeRaw === "retirada" ? "retirada" : "delivery",
      nomecliente: String(
        contamesa.nomecliente ?? contamesa.nome ?? body.nomecliente ?? ""
      ),
      telefone: contamesa.telefone != null ? String(contamesa.telefone) : body.telefone != null ? String(body.telefone) : null,
      endereco: contamesa.endereco != null ? String(contamesa.endereco) : null,
      bairro: contamesa.enderecobairro != null ? String(contamesa.enderecobairro) : contamesa.bairro != null ? String(contamesa.bairro) : null,
      complemento: contamesa.enderecocomplemento != null ? String(contamesa.enderecocomplemento) : contamesa.complemento != null ? String(contamesa.complemento) : null,
      referencia: contamesa.enderecoreferencia != null ? String(contamesa.enderecoreferencia) : null,
      documento: contamesa.documento != null ? String(contamesa.documento) : null,
      valorentrega: contamesa.valorentrega != null ? Number(contamesa.valorentrega) : body.valorentrega != null ? Number(body.valorentrega) : null,
      obs: contamesa.obs != null ? String(contamesa.obs) : null,
      itens
    });
    return {
      status: 200,
      body: {
        action: result.action,
        idconta: result.conta.id,
        conta: result.conta,
        maisGestaoContaId: result.conta.id,
        maisGestaoAction: result.action,
        protocol
      }
    };
  }
  const deliveryIdMatch = path.match(/^\/pos\/delivery\/([^/]+)$/);
  if (method === "GET" && deliveryIdMatch) {
    return {
      status: 200,
      body: await localApi.obterContaMesa(deliveryIdMatch[1])
    };
  }
  if (method === "PATCH" && deliveryIdMatch) {
    return {
      status: 200,
      body: await localApi.atualizarDadosEntrega(deliveryIdMatch[1], {
        nomecliente: body.nomecliente != null ? String(body.nomecliente) : void 0,
        telefone: body.telefone != null ? String(body.telefone) : void 0,
        endereco: body.endereco != null ? String(body.endereco) : void 0,
        bairro: body.bairro != null ? String(body.bairro) : void 0,
        complemento: body.complemento != null ? String(body.complemento) : void 0,
        referencia: body.referencia != null ? String(body.referencia) : void 0,
        obs: body.obs != null ? String(body.obs) : void 0
      })
    };
  }
  const deliveryStatusMatch = path.match(
    /^\/pos\/delivery\/([^/]+)\/status$/
  );
  if ((method === "PATCH" || method === "POST") && deliveryStatusMatch) {
    const status2 = body.status != null ? String(body.status) : null;
    return {
      status: 200,
      body: await localApi.atualizarStatusEntrega(
        deliveryStatusMatch[1],
        status2
      )
    };
  }
  const pedidoEntregueMatch = path.match(/^\/pos\/pedidos\/([^/]+)\/entregue$/);
  if (method === "POST" && pedidoEntregueMatch) {
    return {
      status: 200,
      body: await localApi.marcarPedidoEntregue(pedidoEntregueMatch[1])
    };
  }
  const vendaMatch = path.match(/^\/pos\/vendas\/([^/]+)$/);
  if (method === "GET" && vendaMatch) {
    return { status: 200, body: await localApi.obterVenda(vendaMatch[1]) };
  }
  const retransmitirMatch = path.match(
    /^\/pos\/vendas\/([^/]+)\/retransmitir$/
  );
  if (method === "POST" && retransmitirMatch) {
    return {
      status: 200,
      body: await localApi.retransmitirNfce(retransmitirMatch[1])
    };
  }
  const inutilizarMatch = path.match(/^\/pos\/vendas\/([^/]+)\/inutilizar$/);
  if (method === "POST" && inutilizarMatch) {
    return {
      status: 200,
      body: await localApi.inutilizarNfce(
        inutilizarMatch[1],
        String(body.justificativa ?? "")
      )
    };
  }
  return void 0;
}
function itemDeBody(body) {
  return {
    idproduto: String(body.idproduto ?? ""),
    descricao: String(body.descricao ?? ""),
    quantidade: Number(body.quantidade ?? 0),
    precounitario: Number(body.precounitario ?? 0),
    observacao: body.observacao != null ? String(body.observacao) : null
  };
}
function meioDeBody(body) {
  const meio = String(body.meio ?? "DINHEIRO").toUpperCase();
  if (meio === "PIX" || meio === "CARTAO") {
    return meio;
  }
  return "DINHEIRO";
}
function statusDeErro(err) {
  const mensagem = err instanceof Error ? err.message : "";
  if (/abra o caixa/i.test(mensagem) || /nenhum caixa aberto/i.test(mensagem) || err instanceof Error && err.name === "NumeroPdvDuplicadoError" || /já existe um PDV|é o do PDV principal/i.test(mensagem)) {
    return 409;
  }
  if (/não autoriz|sessão/i.test(mensagem)) {
    return 401;
  }
  if (/não encontrad/i.test(mensagem)) {
    return 404;
  }
  return 400;
}
function enviarJson(res, status2, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status2, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...CABECALHOS_CORS
  });
  res.end(payload);
}
async function lerJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  return parsed;
}
const server$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  encerrarLanServer,
  restartLanServer,
  startLanServer,
  statusLanAtual,
  stopLanServer
}, Symbol.toStringTag, { value: "Module" }));
if (process.env.ELECTRON_DISABLE_SANDBOX === "1" || process.platform === "linux") {
  electron.app.commandLine.appendSwitch("no-sandbox");
}
let mainWindow = null;
let syncTimer = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "PDV Mais Gestão",
    autoHideMenuBar: true,
    webPreferences: {
      preload: node_path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    void electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(node_path.join(__dirname, "../renderer/index.html"));
  }
}
function registerIpc() {
  electron.ipcMain.handle(
    "pdv:invoke",
    async (_event, method, ...args) => {
      const api = localApi;
      const fn = api[method];
      if (typeof fn !== "function") {
        throw new Error(`Método local-api desconhecido: ${method}`);
      }
      return fn.apply(localApi, args);
    }
  );
}
electron.app.whenReady().then(async () => {
  registerIpc();
  createWindow();
  syncTimer = iniciarSyncPeriodico(2e4);
  void startLanServer();
  try {
    await initDb();
    void processarOutbox();
    await restartLanServer();
    await iniciarTecnibra().catch((err) => {
      console.error(
        err instanceof Error ? err.message : "Falha ao iniciar Tecnibra"
      );
    });
    await iniciarBackupAgendado().catch((err) => {
      console.error(
        err instanceof Error ? err.message : "Falha ao iniciar backup agendado"
      );
    });
  } catch (err) {
    console.error(
      err instanceof Error ? err.message : "Falha ao conectar no PostgreSQL local"
    );
  }
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  pararTecnibra();
  pararBackupAgendado();
  void encerrarLanServer();
  void closeDb();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
