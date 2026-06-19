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
