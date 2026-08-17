export const SCHEMA_TABLES_SQL = `
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

CREATE TABLE IF NOT EXISTS caixa_turno (
	id TEXT PRIMARY KEY NOT NULL,
	idempresa TEXT NOT NULL,
	numeropdv INTEGER NOT NULL DEFAULT 1,
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
	idremoto TEXT,
	sync_status TEXT NOT NULL DEFAULT 'pendente'
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
	criadoem TEXT NOT NULL,
	idremoto TEXT,
	sync_status TEXT NOT NULL DEFAULT 'pendente',
	nfce_status TEXT NOT NULL DEFAULT 'nenhuma',
	idnfce_local TEXT
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

CREATE TABLE IF NOT EXISTS pagamento (
	id TEXT PRIMARY KEY NOT NULL,
	idvenda TEXT NOT NULL,
	meio TEXT NOT NULL,
	valor DOUBLE PRECISION NOT NULL,
	nsu TEXT,
	autorizacao TEXT,
	bandeira TEXT,
	status TEXT NOT NULL DEFAULT 'ok',
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

/**
 * Índices são aplicados separadamente das tabelas porque alguns referenciam
 * colunas adicionadas por migração leve (ver aplicarMigracoesLeves em
 * database.ts) — se um banco local antigo já tiver a tabela sem a coluna
 * nova, a criação do índice precisa rodar só depois da migração.
 */
export const SCHEMA_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status, criadoem);
CREATE INDEX IF NOT EXISTS idx_venda_criadoem ON venda(criadoem DESC);
CREATE INDEX IF NOT EXISTS idx_produto_descricao ON produto_cache(descricao);
CREATE INDEX IF NOT EXISTS idx_produto_grupo ON produto_cache(idgrupo);
CREATE INDEX IF NOT EXISTS idx_produto_grupo_gourmet ON produto_cache(idgrupogourmet);
CREATE INDEX IF NOT EXISTS idx_produto_ean ON produto_cache(ean);
CREATE INDEX IF NOT EXISTS idx_conta_status ON conta_mesa(status);
CREATE INDEX IF NOT EXISTS idx_pedido_fila_status ON pedido_fila(status, criadoem);
CREATE INDEX IF NOT EXISTS idx_pedido_fila_client ON pedido_fila(client_order_id);
CREATE INDEX IF NOT EXISTS idx_pagamento_idvenda ON pagamento(idvenda);
`;
