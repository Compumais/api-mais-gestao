ALTER TABLE "notafiscalitem"
	ADD COLUMN IF NOT EXISTS "basepis" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "basecofins" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "baseicmsst" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "valoricmsst" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "aliquotaicmsst" numeric(7, 4),
	ADD COLUMN IF NOT EXISTS "basefcp" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "valorfcp" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "valorfcpst" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "cest" varchar(7);

ALTER TABLE "empresafiscal"
	ADD COLUMN IF NOT EXISTS "indperfil" char(1) DEFAULT 'A',
	ADD COLUMN IF NOT EXISTS "indativ" smallint DEFAULT 1;

CREATE TABLE IF NOT EXISTS "apuracao_efd_ajuste" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"competencia" date NOT NULL,
	"codigoajuste" varchar(10) NOT NULL,
	"descricao" text,
	"valor" numeric(15, 2) NOT NULL,
	"natureza" varchar(10) NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "apuracao_efd_ajuste_empresa_comp_idx"
	ON "apuracao_efd_ajuste" ("idempresa", "competencia", "tipo");

ALTER TABLE "apuracao_efd_ajuste"
ADD CONSTRAINT "apuracao_efd_ajuste_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

INSERT INTO "features_saas" ("id", "codigo", "nome", "descricao") VALUES
	('feat-sped-efd', 'sped_efd', 'SPED EFD', 'Geração de EFD ICMS/IPI e EFD-Contribuições')
ON CONFLICT DO NOTHING;

INSERT INTO "plano_saas_features" ("idplano", "idfeature") VALUES
	('plano-basic', 'feat-sped-efd'),
	('plano-premium', 'feat-sped-efd'),
	('plano-enterprise', 'feat-sped-efd')
ON CONFLICT DO NOTHING;
