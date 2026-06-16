ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valorcartaocredito" numeric(12, 3);
ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valorcartaodebito" numeric(12, 3);

ALTER TABLE "contamesa" ADD COLUMN IF NOT EXISTS "valorcartaocredito" numeric(12, 3);
ALTER TABLE "contamesa" ADD COLUMN IF NOT EXISTS "valorcartaodebito" numeric(12, 3);

ALTER TABLE "financeiro" ADD COLUMN IF NOT EXISTS "idplanocontas" text;
ALTER TABLE "financeiro" ADD CONSTRAINT "financeiro_idplanocontas_fkey" FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id") ON DELETE set null ON UPDATE cascade;

ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "prazocartaocredito" integer DEFAULT 30 NOT NULL;
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "prazocartaodebito" integer DEFAULT 1 NOT NULL;
