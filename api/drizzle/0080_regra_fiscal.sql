CREATE TABLE IF NOT EXISTS "regrafiscal" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" varchar(80) NOT NULL,
	"descricao" text NOT NULL,
	"prioridade" integer NOT NULL DEFAULT 100,
	"vigencia_inicio" timestamp(3) NOT NULL,
	"vigencia_fim" timestamp(3),
	"condicoes" jsonb NOT NULL,
	"resultado" jsonb NOT NULL,
	"fontes" jsonb NOT NULL,
	"status" varchar(30) NOT NULL,
	"versao" integer NOT NULL DEFAULT 1,
	"idempresa" text,
	"validado_em" timestamp(3),
	"validado_por" text,
	"criado_em" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"atualizado_em" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "regrafiscal_rule_id_key" ON "regrafiscal" ("rule_id");
CREATE INDEX IF NOT EXISTS "regrafiscal_status_idx" ON "regrafiscal" ("status");
CREATE INDEX IF NOT EXISTS "regrafiscal_vigencia_idx" ON "regrafiscal" ("vigencia_inicio");

ALTER TABLE "regrafiscal"
ADD CONSTRAINT "regrafiscal_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "regrafiscal"
ADD CONSTRAINT "regrafiscal_validado_por_fkey"
FOREIGN KEY ("validado_por") REFERENCES "public"."usuarios"("id")
ON DELETE set null ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "regrafiscalhistorico" (
	"id" text PRIMARY KEY NOT NULL,
	"id_regra_fiscal" text NOT NULL,
	"versao" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"criado_em" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"id_usuario" text
);

CREATE INDEX IF NOT EXISTS "regrafiscalhistorico_regra_idx"
ON "regrafiscalhistorico" ("id_regra_fiscal");

ALTER TABLE "regrafiscalhistorico"
ADD CONSTRAINT "regrafiscalhistorico_id_regra_fiscal_fkey"
FOREIGN KEY ("id_regra_fiscal") REFERENCES "public"."regrafiscal"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "regrafiscalhistorico"
ADD CONSTRAINT "regrafiscalhistorico_id_usuario_fkey"
FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id")
ON DELETE set null ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "auditoriafiscalnfe" (
	"id" text PRIMARY KEY NOT NULL,
	"id_nota_fiscal" text,
	"idempresa" text NOT NULL,
	"classificacao_final" varchar(60) NOT NULL,
	"nivel_confianca" varchar(30) NOT NULL,
	"permitir_transmissao" boolean NOT NULL,
	"relatorio" jsonb NOT NULL,
	"criado_em" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "auditoriafiscalnfe_nota_idx"
ON "auditoriafiscalnfe" ("id_nota_fiscal");
CREATE INDEX IF NOT EXISTS "auditoriafiscalnfe_empresa_idx"
ON "auditoriafiscalnfe" ("idempresa");

ALTER TABLE "auditoriafiscalnfe"
ADD CONSTRAINT "auditoriafiscalnfe_id_nota_fiscal_fkey"
FOREIGN KEY ("id_nota_fiscal") REFERENCES "public"."notafiscal"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "auditoriafiscalnfe"
ADD CONSTRAINT "auditoriafiscalnfe_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

INSERT INTO "regrafiscal" (
	"id", "rule_id", "descricao", "prioridade", "vigencia_inicio", "vigencia_fim",
	"condicoes", "resultado", "fontes", "status", "versao"
) VALUES
(
	'00000000-0000-4000-8000-000000000001',
	'NAC-CFOP-IDDEST-001',
	'Primeiro dígito do CFOP deve coincidir com idDest (5 interna, 6 interestadual, 7 exterior)',
	10,
	'2006-01-01 00:00:00',
	NULL,
	'{"escopo":"estrutural","tipo":"cfop_vs_id_dest"}'::jsonb,
	'{}'::jsonb,
	'[{"tipo":"Ajuste SINIEF","orgao":"CONFAZ","url":"https://www.confaz.fazenda.gov.br/","vigencia_inicio":"2006-01-01"}]'::jsonb,
	'validado',
	1
),
(
	'00000000-0000-4000-8000-000000000002',
	'NAC-CRT-CSOSN-001',
	'CRT 1/2/4 utiliza CSOSN; CRT 3 utiliza CST',
	10,
	'2006-01-01 00:00:00',
	NULL,
	'{"escopo":"estrutural","tipo":"crt_csosn"}'::jsonb,
	'{}'::jsonb,
	'[{"tipo":"Manual de Orientacao do Contribuinte","orgao":"Portal Nacional da NF-e","url":"https://www.nfe.fazenda.gov.br/","vigencia_inicio":"2006-01-01"}]'::jsonb,
	'validado',
	1
),
(
	'00000000-0000-4000-8000-000000000003',
	'NAC-ICMSSN102-001',
	'Grupo ICMSSN102 nao carrega vICMS nem vST',
	20,
	'2016-01-01 00:00:00',
	NULL,
	'{"escopo":"estrutural","tipo":"icmssn102"}'::jsonb,
	'{}'::jsonb,
	'[{"tipo":"Schema NF-e 4.00","orgao":"Portal Nacional da NF-e","url":"https://www.nfe.fazenda.gov.br/","vigencia_inicio":"2016-01-01"}]'::jsonb,
	'validado',
	1
),
(
	'00000000-0000-4000-8000-000000000004',
	'NAC-NCM-FORMATO-001',
	'NCM do item deve ter 8 digitos',
	30,
	'2006-01-01 00:00:00',
	NULL,
	'{"escopo":"estrutural","tipo":"ncm_formato"}'::jsonb,
	'{}'::jsonb,
	'[{"tipo":"MOC / leiaute NF-e","orgao":"Portal Nacional da NF-e","url":"https://www.nfe.fazenda.gov.br/","vigencia_inicio":"2006-01-01"}]'::jsonb,
	'validado',
	1
),
(
	'00000000-0000-4000-8000-000000000005',
	'NAC-CEST-ST-001',
	'CEST com 7 digitos e obrigatorio quando CST/CSOSN indica ST ou ha valor de ST',
	20,
	'2016-01-01 00:00:00',
	NULL,
	'{"escopo":"estrutural","tipo":"cest_st"}'::jsonb,
	'{}'::jsonb,
	'[{"tipo":"Ato COTEPE / NT CEST","orgao":"CONFAZ","url":"https://www.confaz.fazenda.gov.br/","vigencia_inicio":"2016-01-01"}]'::jsonb,
	'validado',
	1
)
ON CONFLICT ("rule_id") DO NOTHING;
