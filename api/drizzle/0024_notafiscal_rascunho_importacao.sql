ALTER TABLE notafiscalitem ADD COLUMN IF NOT EXISTS dadosimportacao jsonb;

CREATE INDEX IF NOT EXISTS notafiscal_status_rascunho_idx
	ON notafiscal (status)
	WHERE status = 99;
