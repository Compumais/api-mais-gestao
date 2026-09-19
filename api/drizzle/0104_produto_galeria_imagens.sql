CREATE TABLE IF NOT EXISTS "produtoimagem" (
	"id" text PRIMARY KEY NOT NULL,
	"idproduto" text NOT NULL,
	"idempresa" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"principal" boolean DEFAULT false NOT NULL,
	"nomearquivo" varchar(255),
	"tipomime" varchar(50),
	"tamanho" integer,
	"referencia" varchar(255) NOT NULL,
	"chavearmazenamento" varchar(255),
	"origem" varchar(20) DEFAULT 'gerenciada' NOT NULL,
	"criadoem" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizadoem" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produtoimagem_idproduto_fkey"
		FOREIGN KEY ("idproduto") REFERENCES "public"."produtos"("id")
		ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "produtoimagem_idempresa_fkey"
		FOREIGN KEY ("idempresa") REFERENCES "public"."empresa"("id")
		ON DELETE cascade ON UPDATE cascade
);

CREATE INDEX IF NOT EXISTS "produtoimagem_produto_ordem_idx"
	ON "produtoimagem" USING btree ("idproduto", "ordem");
CREATE INDEX IF NOT EXISTS "produtoimagem_empresa_idx"
	ON "produtoimagem" USING btree ("idempresa");
CREATE UNIQUE INDEX IF NOT EXISTS "produtoimagem_principal_unica_idx"
	ON "produtoimagem" USING btree ("idproduto") WHERE "principal" = true;

-- Materializa imagens legadas como primeiro item da galeria sem alterar os
-- campos consumidos pelo PDV/POS. A referência original continua sendo a fonte.
INSERT INTO "produtoimagem" (
	"id", "idproduto", "idempresa", "ordem", "principal", "referencia", "origem"
)
SELECT
	substr(md5(p."id" || ':imagem-legada'), 1, 8) || '-' ||
	substr(md5(p."id" || ':imagem-legada'), 9, 4) || '-' ||
	'4' || substr(md5(p."id" || ':imagem-legada'), 14, 3) || '-' ||
	'a' || substr(md5(p."id" || ':imagem-legada'), 18, 3) || '-' ||
	substr(md5(p."id" || ':imagem-legada'), 21, 12),
	p."id",
	p."idempresa",
	0,
	true,
	COALESCE(NULLIF(p."caminhoimagem", ''), 'legado:imagem'),
	'legada'
FROM "produtos" p
WHERE (
	NULLIF(p."caminhoimagem", '') IS NOT NULL
	OR NULLIF(p."imagem", '') IS NOT NULL
)
AND NOT EXISTS (
	SELECT 1 FROM "produtoimagem" pi WHERE pi."idproduto" = p."id"
);
