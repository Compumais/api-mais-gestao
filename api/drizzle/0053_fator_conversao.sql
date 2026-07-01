CREATE TABLE "fatorconversao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"nome" varchar(100) NOT NULL,
	"fator" numeric(15, 6) NOT NULL,
	"currenttimemillis" bigint
);
--> statement-breakpoint
ALTER TABLE "fatorconversao" ADD CONSTRAINT "fatorconversao_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "fatorconversao_idempresa_idx" ON "fatorconversao" USING btree ("idempresa" text_ops);
--> statement-breakpoint
CREATE INDEX "fatorconversao_nome_idx" ON "fatorconversao" USING btree ("nome" text_ops);
