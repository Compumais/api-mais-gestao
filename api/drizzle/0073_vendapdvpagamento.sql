CREATE TABLE IF NOT EXISTS "vendapdvpagamento" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idvenda" text NOT NULL,
	"meio" varchar(20) NOT NULL,
	"valor" numeric(12, 3) NOT NULL,
	"nsu" text,
	"autorizacao" text,
	"bandeira" text,
	"status" varchar(20) DEFAULT 'ok' NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
 ALTER TABLE "vendapdvpagamento" ADD CONSTRAINT "vendapdvpagamento_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "vendapdvpagamento" ADD CONSTRAINT "vendapdvpagamento_idvenda_fkey" FOREIGN KEY ("idvenda") REFERENCES "public"."vendapdvgourmet"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "vendapdvpagamento_idvenda_idx" ON "vendapdvpagamento" USING btree ("idvenda");
CREATE INDEX IF NOT EXISTS "vendapdvpagamento_idempresa_idx" ON "vendapdvpagamento" USING btree ("idempresa");
