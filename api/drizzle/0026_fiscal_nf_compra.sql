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
