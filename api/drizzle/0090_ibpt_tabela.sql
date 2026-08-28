CREATE TABLE IF NOT EXISTS "ibpt_aliquota" (
	"id" text PRIMARY KEY NOT NULL,
	"uf" varchar(2) NOT NULL,
	"ncm" varchar(8) NOT NULL,
	"ex" varchar(10) DEFAULT '0' NOT NULL,
	"aliquotaNacional" numeric(8, 4) NOT NULL,
	"aliquotaImportado" numeric(8, 4) NOT NULL,
	"aliquotaEstadual" numeric(8, 4) NOT NULL,
	"aliquotaMunicipal" numeric(8, 4) NOT NULL,
	"chave" varchar(10) NOT NULL,
	"fonte" varchar(80) DEFAULT 'IBPT/empresometro.com.br' NOT NULL,
	"versao" varchar(20),
	"vigenciaInicio" varchar(10),
	"vigenciaFim" varchar(10),
	"importadoEm" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ibpt_aliquota_uf_ncm_ex_key"
	ON "ibpt_aliquota" ("uf", "ncm", "ex");

CREATE TABLE IF NOT EXISTS "ibpt_importacao" (
	"id" text PRIMARY KEY NOT NULL,
	"uf" varchar(2) NOT NULL,
	"chave" varchar(10) NOT NULL,
	"versao" varchar(20),
	"fonte" varchar(80) DEFAULT 'IBPT/empresometro.com.br' NOT NULL,
	"quantidadeRegistros" numeric(12, 0) NOT NULL,
	"idusuario" text,
	"importadoEm" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
