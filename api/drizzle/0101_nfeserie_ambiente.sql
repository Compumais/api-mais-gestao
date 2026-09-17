ALTER TABLE "nfeserie"
	ADD COLUMN IF NOT EXISTS "ambiente" smallint DEFAULT 1 NOT NULL;

ALTER TABLE "nfeserie"
	DROP CONSTRAINT IF EXISTS "nfeserie_ambiente_check";

ALTER TABLE "nfeserie"
	ADD CONSTRAINT "nfeserie_ambiente_check"
	CHECK ("ambiente" IN (1, 2));

DROP INDEX IF EXISTS "nfeserie_empresa_modelo_serie_key";

CREATE UNIQUE INDEX IF NOT EXISTS "nfeserie_empresa_modelo_serie_ambiente_key"
	ON "nfeserie" ("idempresa", "modelo", "serie", "ambiente");

INSERT INTO "nfeserie" (
	"id",
	"idempresa",
	"modelo",
	"serie",
	"ambiente",
	"numeroproximo",
	"padrao",
	"ativo",
	"criadoem",
	"atualizadoem"
)
SELECT
	substr(md5(s."id" || ':ambiente:2'), 1, 8) || '-' ||
	substr(md5(s."id" || ':ambiente:2'), 9, 4) || '-' ||
	'4' || substr(md5(s."id" || ':ambiente:2'), 14, 3) || '-' ||
	'8' || substr(md5(s."id" || ':ambiente:2'), 18, 3) || '-' ||
	substr(md5(s."id" || ':ambiente:2'), 21, 12),
	s."idempresa",
	s."modelo",
	s."serie",
	2,
	s."numeroproximo",
	s."padrao",
	s."ativo",
	s."criadoem",
	CURRENT_TIMESTAMP
FROM "nfeserie" s
WHERE s."ambiente" = 1
ON CONFLICT ("idempresa", "modelo", "serie", "ambiente") DO NOTHING;

UPDATE "notafiscal" nf
SET "idserie" =
	substr(md5(s."id" || ':ambiente:2'), 1, 8) || '-' ||
	substr(md5(s."id" || ':ambiente:2'), 9, 4) || '-' ||
	'4' || substr(md5(s."id" || ':ambiente:2'), 14, 3) || '-' ||
	'8' || substr(md5(s."id" || ':ambiente:2'), 18, 3) || '-' ||
	substr(md5(s."id" || ':ambiente:2'), 21, 12)
FROM "nfeserie" s
WHERE nf."idserie" = s."id"
	AND nf."tipoambientenfe" = 2
	AND s."ambiente" = 1;

CREATE INDEX IF NOT EXISTS "nfeserie_empresa_modelo_ambiente_idx"
	ON "nfeserie" ("idempresa", "modelo", "ambiente");

WITH series_padrao_duplicadas AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "idempresa", "modelo", "ambiente"
			ORDER BY "atualizadoem" DESC, "id"
		) AS ordem
	FROM "nfeserie"
	WHERE "padrao" = true
)
UPDATE "nfeserie" s
SET
	"padrao" = false,
	"atualizadoem" = CURRENT_TIMESTAMP
FROM series_padrao_duplicadas d
WHERE s."id" = d."id"
	AND d.ordem > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "nfeserie_empresa_modelo_ambiente_padrao_key"
	ON "nfeserie" ("idempresa", "modelo", "ambiente")
	WHERE "padrao" = true;
