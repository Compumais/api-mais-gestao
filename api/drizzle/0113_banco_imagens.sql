CREATE TABLE IF NOT EXISTS "bancoimagemgrupo" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" varchar(120) NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"nomearquivo" varchar(255),
	"tipomime" varchar(50),
	"tamanho" integer,
	"referencia" varchar(255),
	"chavearmazenamento" varchar(255),
	"criadoem" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizadoem" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "bancoimagemproduto" (
	"id" text PRIMARY KEY NOT NULL,
	"idgrupo" text NOT NULL,
	"nome" varchar(160) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"nomearquivo" varchar(255),
	"tipomime" varchar(50),
	"tamanho" integer,
	"referencia" varchar(255),
	"chavearmazenamento" varchar(255),
	"criadoem" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizadoem" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bancoimagemproduto_idgrupo_fkey"
		FOREIGN KEY ("idgrupo") REFERENCES "public"."bancoimagemgrupo"("id")
		ON DELETE cascade ON UPDATE cascade
);

CREATE INDEX IF NOT EXISTS "bancoimagemproduto_idgrupo_idx"
	ON "bancoimagemproduto" USING btree ("idgrupo");

CREATE TABLE IF NOT EXISTS "bancoimagemcodigo" (
	"id" text PRIMARY KEY NOT NULL,
	"idproduto" text NOT NULL,
	"codigo" varchar(14) NOT NULL,
	CONSTRAINT "bancoimagemcodigo_idproduto_fkey"
		FOREIGN KEY ("idproduto") REFERENCES "public"."bancoimagemproduto"("id")
		ON DELETE cascade ON UPDATE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "bancoimagemcodigo_codigo_unico_idx"
	ON "bancoimagemcodigo" USING btree ("codigo");
CREATE INDEX IF NOT EXISTS "bancoimagemcodigo_idproduto_idx"
	ON "bancoimagemcodigo" USING btree ("idproduto");

ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "idbancoimagem" text;

DO $$ BEGIN
	ALTER TABLE "produtos"
	ADD CONSTRAINT "produtos_idbancoimagem_fkey"
	FOREIGN KEY ("idbancoimagem") REFERENCES "public"."bancoimagemproduto"("id")
	ON DELETE set null ON UPDATE cascade;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "produtos_idbancoimagem_idx"
	ON "produtos" USING btree ("idbancoimagem");
