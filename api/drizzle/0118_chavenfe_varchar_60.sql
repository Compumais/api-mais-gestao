-- Chave de acesso da NFS-e Nacional tem 50 dígitos (NF-e/NFC-e: 44).
-- O trigger depende da coluna chavenfe, então é recriado em torno do ALTER.
DROP TRIGGER IF EXISTS notafiscal_chavenfe_ativa_unica ON notafiscal;
--> statement-breakpoint
ALTER TABLE notafiscal ALTER COLUMN chavenfe TYPE varchar(60);
--> statement-breakpoint
ALTER TABLE notafiscalxml ALTER COLUMN chavenfe TYPE varchar(60);
--> statement-breakpoint
CREATE TRIGGER notafiscal_chavenfe_ativa_unica
	BEFORE INSERT OR UPDATE OF idempresa, chavenfe, status ON notafiscal
	FOR EACH ROW EXECUTE FUNCTION validar_chavenfe_ativa_unica();
