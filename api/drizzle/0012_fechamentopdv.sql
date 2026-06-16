CREATE TABLE IF NOT EXISTS "fechamentopdv" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" varchar(10),
	"datacriacao" timestamp DEFAULT CURRENT_TIMESTAMP,
	"datamodificacao" timestamp DEFAULT CURRENT_TIMESTAMP,
	"datahora" timestamp(3),
	"falta" numeric(15, 2),
	"idoperacao" bigint,
	"idusuario" text,
	"idusuariofechamento" text,
	"idusuariosuprimento" text,
	"local" smallint,
	"novofechamento" smallint,
	"observacao" text,
	"pdv" smallint,
	"saldoapurado" numeric(15, 2),
	"saldoconferido" numeric(15, 2),
	"saldoinformado" numeric(15, 2),
	"sobra" numeric(15, 2),
	"status" smallint,
	"suprimentoinicial" numeric(15, 2)
);
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "codigo" varchar(10);
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "datacriacao" timestamp DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "datamodificacao" timestamp DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "datahora" timestamp(3);
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "falta" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "idoperacao" bigint;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "idusuario" text;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "idusuariofechamento" text;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "idusuariosuprimento" text;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "local" smallint;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "novofechamento" smallint;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "observacao" text;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "pdv" smallint;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "saldoapurado" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "saldoconferido" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "saldoinformado" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "sobra" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "status" smallint;
--> statement-breakpoint
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "suprimentoinicial" numeric(15, 2);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fechamentopdv_idempresa_idx" ON "fechamentopdv" USING btree ("idempresa");
