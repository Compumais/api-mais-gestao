-- Sincroniza schema de migrations registradas no baseline mas não executadas em produção.
-- Idempotente: seguro rodar múltiplas vezes.

-- 0023_notafiscalitem_campos_nf
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS quantidade numeric(15, 6);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS precounitario numeric(15, 6);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS total numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS desconto numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS baseicms numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS percentualicms numeric(5, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS icms numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS aliquotapis numeric(12, 4);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS pis numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS cofins numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS ipi numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS custoaquisicao numeric(15, 6);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS frete numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS seguro numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS outrasdespesas numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS pisretido numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS cofinsretido numeric(12, 2);
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS inss numeric(12, 2);

-- 0024_notafiscal_rascunho_importacao
ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS dadosimportacao jsonb;
CREATE INDEX IF NOT EXISTS notafiscal_status_rascunho_idx
	ON notafiscal (status)
	WHERE status = 99;

-- 0025_produtos_ean_varchar
ALTER TABLE produtos ALTER COLUMN ean TYPE varchar(14) USING ean::text;
ALTER TABLE produtos ALTER COLUMN eantributavel TYPE varchar(14) USING eantributavel::text;

-- 0026_fiscal_nf_compra
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS regimetributario varchar(2);
ALTER TABLE notafiscal ADD COLUMN IF NOT EXISTS dadosimportacao jsonb;

CREATE TABLE IF NOT EXISTS cfopdepara (
	id text PRIMARY KEY NOT NULL,
	idempresa text NOT NULL,
	idcfopentrada text,
	idcfopsaida text,
	codigoentrada varchar(10),
	codigosaida varchar(10),
	uf char(2),
	inativo smallint DEFAULT 0,
	CONSTRAINT cfopdepara_idempresa_fkey FOREIGN KEY (idempresa)
		REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT cfopdepara_idcfopentrada_fkey FOREIGN KEY (idcfopentrada)
		REFERENCES cfop(id) ON UPDATE CASCADE ON DELETE SET NULL,
	CONSTRAINT cfopdepara_idcfopsaida_fkey FOREIGN KEY (idcfopsaida)
		REFERENCES cfop(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS cfopdepara_idempresa_idx ON cfopdepara (idempresa);
CREATE INDEX IF NOT EXISTS cfopdepara_entrada_idx ON cfopdepara (idempresa, idcfopentrada);

CREATE TABLE IF NOT EXISTS produtofornecedor (
	id text PRIMARY KEY NOT NULL,
	idempresa text NOT NULL,
	identidade text,
	cnpjfornecedor varchar(14),
	idproduto text NOT NULL,
	codigofornecedor varchar(60) NOT NULL,
	descricaofornecedor varchar(120),
	criadoem timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT produtofornecedor_idempresa_fkey FOREIGN KEY (idempresa)
		REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT produtofornecedor_identidade_fkey FOREIGN KEY (identidade)
		REFERENCES entidade(id) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT produtofornecedor_idproduto_fkey FOREIGN KEY (idproduto)
		REFERENCES produtos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS produtofornecedor_vinculo_idx
	ON produtofornecedor (idempresa, COALESCE(identidade, ''), codigofornecedor);

CREATE INDEX IF NOT EXISTS produtofornecedor_idproduto_idx ON produtofornecedor (idproduto);

-- 0027_sped_nf_compra
CREATE TABLE IF NOT EXISTS notafiscalxml (
	id text PRIMARY KEY NOT NULL,
	idnotafiscal text NOT NULL UNIQUE,
	idempresa text NOT NULL,
	chavenfe varchar(44),
	protocolonfe varchar(18),
	hashsha256 varchar(64),
	tamanhobytes integer,
	criadoem timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT notafiscalxml_idnotafiscal_fkey FOREIGN KEY (idnotafiscal)
		REFERENCES notafiscal(id) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT notafiscalxml_idempresa_fkey FOREIGN KEY (idempresa)
		REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notafiscalxml_idempresa_idx ON notafiscalxml (idempresa);
CREATE INDEX IF NOT EXISTS notafiscalxml_chavenfe_idx ON notafiscalxml (chavenfe);

ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS datavalidade date;
