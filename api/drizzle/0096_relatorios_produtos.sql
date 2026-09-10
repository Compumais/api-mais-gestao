CREATE TABLE IF NOT EXISTS "marca" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL REFERENCES "empresas"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"nome" varchar(120) NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "marca_idempresa_idx" ON "marca" ("idempresa");
CREATE UNIQUE INDEX IF NOT EXISTS "marca_empresa_nome_uidx" ON "marca" ("idempresa", "nome");
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "idmarca" text;
CREATE INDEX IF NOT EXISTS "produtos_idmarca_idx" ON "produtos" ("idmarca");
DO $$ BEGIN
	ALTER TABLE "produtos" ADD CONSTRAINT "produtos_idmarca_fkey"
		FOREIGN KEY ("idmarca") REFERENCES "marca"("id") ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "produto_ean" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL REFERENCES "empresas"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idproduto" text NOT NULL REFERENCES "produtos"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idunidademedida" text REFERENCES "unidademedida"("id") ON UPDATE CASCADE ON DELETE SET NULL,
	"ean" varchar(14) NOT NULL,
	"fator" numeric(18,6),
	"tipo" varchar(20) DEFAULT 'alternativo' NOT NULL,
	"principal" smallint DEFAULT 0 NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE "produto_ean" ADD COLUMN IF NOT EXISTS "idunidademedida" text;
ALTER TABLE "produto_ean" ADD COLUMN IF NOT EXISTS "fator" numeric(18,6);
DO $$ BEGIN
	ALTER TABLE "produto_ean" ADD CONSTRAINT "produto_ean_idunidademedida_fkey"
		FOREIGN KEY ("idunidademedida") REFERENCES "unidademedida"("id") ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "produto_ean_empresa_idx" ON "produto_ean" ("idempresa");
CREATE INDEX IF NOT EXISTS "produto_ean_produto_idx" ON "produto_ean" ("idproduto");
CREATE UNIQUE INDEX IF NOT EXISTS "produto_ean_empresa_ean_uidx" ON "produto_ean" ("idempresa", "ean");

CREATE TABLE IF NOT EXISTS "tabela_preco" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL REFERENCES "empresas"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"nome" varchar(120) NOT NULL,
	"ativo" smallint DEFAULT 1 NOT NULL,
	"iniciovigencia" timestamp(3),
	"fimvigencia" timestamp(3),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "tabela_preco_empresa_idx" ON "tabela_preco" ("idempresa");

CREATE TABLE IF NOT EXISTS "tabela_preco_item" (
	"id" text PRIMARY KEY NOT NULL,
	"idtabelapreco" text NOT NULL REFERENCES "tabela_preco"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idproduto" text NOT NULL REFERENCES "produtos"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"preco" numeric(15,4) NOT NULL,
	"preco_minimo" numeric(15,4),
	"preco_promocional" numeric(15,4),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE "tabela_preco_item" ADD COLUMN IF NOT EXISTS "preco_minimo" numeric(15,4);
ALTER TABLE "tabela_preco_item" ADD COLUMN IF NOT EXISTS "preco_promocional" numeric(15,4);
CREATE INDEX IF NOT EXISTS "tabela_preco_item_produto_idx" ON "tabela_preco_item" ("idproduto");
CREATE UNIQUE INDEX IF NOT EXISTS "tabela_preco_item_tabela_produto_uidx" ON "tabela_preco_item" ("idtabelapreco", "idproduto");

CREATE TABLE IF NOT EXISTS "produto_historico" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL REFERENCES "empresas"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idproduto" text NOT NULL REFERENCES "produtos"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idusuario" text REFERENCES "usuarios"("id") ON UPDATE CASCADE ON DELETE SET NULL,
	"ip" varchar(64),
	"acao" varchar(40) NOT NULL,
	"antes" jsonb,
	"depois" jsonb,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE "produto_historico" ADD COLUMN IF NOT EXISTS "ip" varchar(64);
CREATE INDEX IF NOT EXISTS "produto_historico_empresa_data_idx" ON "produto_historico" ("idempresa", "criadoem");
CREATE INDEX IF NOT EXISTS "produto_historico_produto_idx" ON "produto_historico" ("idproduto");

CREATE TABLE IF NOT EXISTS "produto_kit_item" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL REFERENCES "empresas"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idprodutokit" text NOT NULL REFERENCES "produtos"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idprodutocomponente" text NOT NULL REFERENCES "produtos"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
	"quantidade" numeric(18,6) NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "produto_kit_item_empresa_idx" ON "produto_kit_item" ("idempresa");
CREATE INDEX IF NOT EXISTS "produto_kit_item_componente_idx" ON "produto_kit_item" ("idprodutocomponente");
CREATE UNIQUE INDEX IF NOT EXISTS "produto_kit_item_kit_componente_uidx" ON "produto_kit_item" ("idprodutokit", "idprodutocomponente");

CREATE TABLE IF NOT EXISTS "produto_unidade_conversao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL REFERENCES "empresas"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idproduto" text NOT NULL REFERENCES "produtos"("id") ON UPDATE CASCADE ON DELETE CASCADE,
	"idunidademedida" text NOT NULL REFERENCES "unidademedida"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
	"fator" numeric(18,6) NOT NULL,
	"operacao" varchar(10) DEFAULT 'multiplica' NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "produto_unidade_conversao_empresa_idx" ON "produto_unidade_conversao" ("idempresa");
CREATE UNIQUE INDEX IF NOT EXISTS "produto_unidade_conversao_produto_unidade_uidx" ON "produto_unidade_conversao" ("idproduto", "idunidademedida");

-- Índices não exclusivos: seguros mesmo quando o legado possui duplicidades.
CREATE INDEX IF NOT EXISTS "produtos_empresa_codigo_relatorio_idx" ON "produtos" ("idempresa", "codigo");
CREATE INDEX IF NOT EXISTS "produtos_empresa_ean_relatorio_idx" ON "produtos" ("idempresa", "ean");
CREATE INDEX IF NOT EXISTS "movimentoestoque_empresa_data_relatorio_idx" ON "movimentoestoque" ("idempresa", "datahora");
CREATE INDEX IF NOT EXISTS "vendapdvitem_empresa_produto_relatorio_idx" ON "vendapdvitem" ("idempresa", "idproduto");
