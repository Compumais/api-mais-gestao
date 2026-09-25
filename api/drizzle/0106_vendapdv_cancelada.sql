ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "cancelada" boolean DEFAULT false NOT NULL;
ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "canceladaem" timestamp(3);
ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "motivocancelamento" varchar(255);

CREATE INDEX IF NOT EXISTS "vendapdvgourmet_empresa_cancelada_idx"
	ON "vendapdvgourmet" ("idempresa", "cancelada");
