ALTER TABLE "vendapdvgourmet"
	ADD COLUMN IF NOT EXISTS "idvendalocal" text;

CREATE UNIQUE INDEX IF NOT EXISTS "vendapdvgourmet_empresa_pdv_idlocal_key"
	ON "vendapdvgourmet" ("idempresa", "numeropdv", "idvendalocal")
	WHERE "idvendalocal" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "notafiscal_empresa_modelo_status_idx"
	ON "notafiscal" ("idempresa", "modelo", "status");

CREATE OR REPLACE FUNCTION validar_chavenfe_ativa_unica()
RETURNS trigger AS $$
BEGIN
	IF NEW."chavenfe" IS NOT NULL
		AND length(NEW."chavenfe") = 44
		AND (NEW."status" IS NULL OR NEW."status" NOT IN (2, 99))
	THEN
		PERFORM pg_advisory_xact_lock(
			hashtextextended(
				'chavenfe:' || NEW."idempresa" || ':' || NEW."chavenfe",
				0
			)
		);
		IF EXISTS (
			SELECT 1
			FROM "notafiscal" existente
			WHERE existente."idempresa" = NEW."idempresa"
				AND existente."chavenfe" = NEW."chavenfe"
				AND existente."id" <> NEW."id"
				AND (
					existente."status" IS NULL
					OR existente."status" NOT IN (2, 99)
				)
		) THEN
			RAISE EXCEPTION 'Chave fiscal ativa já cadastrada para a empresa'
				USING ERRCODE = '23505';
		END IF;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "notafiscal_chavenfe_ativa_unica" ON "notafiscal";
CREATE TRIGGER "notafiscal_chavenfe_ativa_unica"
	BEFORE INSERT OR UPDATE OF "idempresa", "chavenfe", "status"
	ON "notafiscal"
	FOR EACH ROW EXECUTE FUNCTION validar_chavenfe_ativa_unica();

CREATE OR REPLACE FUNCTION validar_venda_nfce_unica()
RETURNS trigger AS $$
BEGIN
	IF NEW."idnotafiscalnfce" IS NOT NULL THEN
		PERFORM pg_advisory_xact_lock(
			hashtextextended('venda-nfce:' || NEW."idnotafiscalnfce", 0)
		);
		IF EXISTS (
			SELECT 1
			FROM "vendapdvgourmet" existente
			WHERE existente."idnotafiscalnfce" = NEW."idnotafiscalnfce"
				AND existente."id" <> NEW."id"
		) THEN
			RAISE EXCEPTION 'NFC-e já vinculada a outra venda'
				USING ERRCODE = '23505';
		END IF;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "vendapdvgourmet_nfce_unica" ON "vendapdvgourmet";
CREATE TRIGGER "vendapdvgourmet_nfce_unica"
	BEFORE INSERT OR UPDATE OF "idnotafiscalnfce"
	ON "vendapdvgourmet"
	FOR EACH ROW EXECUTE FUNCTION validar_venda_nfce_unica();
