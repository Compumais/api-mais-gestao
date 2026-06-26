-- Alinha colunas de taxa ICMS com códigos ECF (SSS/FFF) da planilha de parametrização.
ALTER TABLE "parametrizacaotributos"
ALTER COLUMN "taxaicmsentrada" TYPE varchar(10)
USING "taxaicmsentrada"::text;
--> statement-breakpoint
ALTER TABLE "parametrizacaotributos"
ALTER COLUMN "taxaicmsnfe" TYPE varchar(10)
USING "taxaicmsnfe"::text;
--> statement-breakpoint
ALTER TABLE "parametrizacaotributos"
ALTER COLUMN "taxaicmsnfce" TYPE varchar(10)
USING "taxaicmsnfce"::text;
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "cstipientrada" varchar(3);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "cstipisaida" varchar(3);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'5101',
	cnfe.id,
	'0',
	'101',
	'SSS',
	cnfce.id,
	'0',
	'102',
	'SSS',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5102'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5102'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '5101'
);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'5102',
	cnfe.id,
	'0',
	'101',
	'SSS',
	cnfce.id,
	'0',
	'102',
	'SSS',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5102'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5102'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '5102'
);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'5400',
	cnfe.id,
	'60',
	'500',
	'FFF',
	cnfce.id,
	'60',
	'500',
	'FFF',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5405'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5405'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '5400'
);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'5401',
	cnfe.id,
	'60',
	'500',
	'FFF',
	cnfce.id,
	'60',
	'500',
	'FFF',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5405'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5405'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '5401'
);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'5403',
	cnfe.id,
	'60',
	'500',
	'FFF',
	cnfce.id,
	'60',
	'500',
	'FFF',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5405'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5405'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '5403'
);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'6101',
	cnfe.id,
	'0',
	'101',
	'SSS',
	cnfce.id,
	'0',
	'102',
	'SSS',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5102'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5102'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '6101'
);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'6102',
	cnfe.id,
	'0',
	'101',
	'SSS',
	cnfce.id,
	'0',
	'102',
	'SSS',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5102'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5102'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '6102'
);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'6401',
	cnfe.id,
	'60',
	'500',
	'FFF',
	cnfce.id,
	'60',
	'500',
	'FFF',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5405'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5405'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '6401'
);
--> statement-breakpoint
INSERT INTO "parametrizacaotributos" (
	"id", "idempresa", "codigocfopentrada", "idcfopsaidanfe", "cstnfe", "csosnnfe", "taxaicmsnfe",
	"idcfopsaidanfce", "cstnfce", "csosnnfce", "taxaicmsnfce", "inativo"
)
SELECT
	gen_random_uuid()::text,
	e.id,
	'6403',
	cnfe.id,
	'60',
	'500',
	'FFF',
	cnfce.id,
	'60',
	'500',
	'FFF',
	0
FROM "empresas" e
LEFT JOIN "cfop" cnfe ON cnfe."idempresa" = e.id AND regexp_replace(cnfe."codigo", '[^0-9]', '', 'g') = '5405'
LEFT JOIN "cfop" cnfce ON cnfce."idempresa" = e.id AND regexp_replace(cnfce."codigo", '[^0-9]', '', 'g') = '5405'
WHERE NOT EXISTS (
	SELECT 1 FROM "parametrizacaotributos" p
	WHERE p."idempresa" = e.id AND p."codigocfopentrada" = '6403'
);
