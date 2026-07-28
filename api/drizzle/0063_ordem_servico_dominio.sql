CREATE TABLE IF NOT EXISTS "tipoordemservicoevento" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"status" smallint NOT NULL,
	"cor" varchar(7) NOT NULL,
	"descricao" varchar(100) NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" smallint DEFAULT 1 NOT NULL,
	"padrao" smallint DEFAULT 0 NOT NULL,
	"datacriacao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dataalteracao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "configuracaoordemservico" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"agrupafinanceiroaofaturar" smallint DEFAULT 0,
	"descricao" varchar(100),
	"descricaocampochave" varchar(50),
	"idcfopexternaproduto" text,
	"idcfopexternaservico" text,
	"idcfopexternaservicost" text,
	"idcfopinternaproduto" text,
	"idcfopinternaservico" text,
	"idcfopinternaservicost" text,
	"idmodelnfe" text,
	"idmodelonfse" text,
	"mascaracampochave" varchar(30),
	"mostrarcamposfinalizaritem" smallint DEFAULT 0,
	"pedirprimeiroobjeto" smallint DEFAULT 0,
	"tecnicoobrigatorio" smallint DEFAULT 0,
	"camposextras" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"datacriacao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dataalteracao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ordemservicoitem" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"acrescimo" numeric(12, 2),
	"acrescimoalteracao" numeric(12, 2),
	"aliquota" numeric(12, 2),
	"altura" numeric(10, 2),
	"brinde" smallint DEFAULT 0,
	"cancelado" smallint DEFAULT 0,
	"cfop" varchar(20),
	"codigodav" text,
	"codigorproduto" varchar(20),
	"comprimento" numeric(10, 2),
	"contador" integer,
	"datahora" timestamp(3),
	"datahorafinalservico" timestamp(3),
	"datahorainicialservico" timestamp(3),
	"datainclusao" timestamp(3),
	"decimaispreco" smallint,
	"decimaisquantidade" smallint,
	"desconto" numeric(12, 2),
	"descontoalteracao" numeric(12, 2),
	"descontoclienteprodutoaplicado" smallint,
	"descontopromocao" numeric(12, 2),
	"descontosubtotal" numeric(12, 2),
	"fatorconversao" numeric(15, 6),
	"hash" text,
	"hashpafnfce" text,
	"idcfop" text,
	"idembalagem" text,
	"identidadedesconto" text,
	"iditemkitpai" text,
	"idlocalestoque" text,
	"idlote" text,
	"idmotivodesconto" text,
	"idordemservico" text NOT NULL,
	"idproduto" text,
	"idprodutokit" text,
	"idpromocao" text,
	"idsupervisorvenda" text,
	"idtecnico" text,
	"idunidademedida" text,
	"idusuariodesconto" text,
	"informacaoadicional" varchar(500),
	"largura" numeric(10, 2),
	"nomeproduto" varchar(120),
	"numeroitempedidocompra" varchar(6),
	"numeropedidocompra" varchar(15),
	"numeroserie" varchar(40),
	"observacao" text,
	"pautopreco" smallint,
	"percentualdesconto" numeric(12, 2),
	"preco" numeric(15, 6),
	"precoinformado" numeric(15, 6),
	"precominimovenda" numeric(12, 2),
	"precooriginal" numeric(15, 6),
	"quantidade" numeric(15, 6),
	"quantidadehora" varchar(5),
	"quantidadepeca" text,
	"situacaotributaria" varchar(7),
	"tipokit" smallint,
	"tipovalordesconto" smallint,
	"total" numeric(12, 3),
	"unidademedida" varchar(6),
	"variacoes" varchar(256),
	"datacriacao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dataalteracao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ordemservicoitemlote" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigolote" varchar(30),
	"datalote" timestamp(3),
	"emissao" timestamp(3),
	"idlote" text,
	"idordemservicoitem" text NOT NULL,
	"quantidade" numeric(15, 6),
	"vencimento" timestamp(3),
	"datacriacao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dataalteracao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ordemservicoevento" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"descricao" text NOT NULL,
	"data" timestamp(3),
	"idordemservico" text NOT NULL,
	"idtecnicode" text,
	"idtecnicopara" text,
	"idtipoevento" text NOT NULL,
	"nomecontato" varchar(50),
	"datacriacao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dataalteracao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ordemservicofaturamento" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"iddavos" text,
	"idfaturamento" text,
	"idnotafiscal" text,
	"idordemservico" text NOT NULL,
	"datacriacao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dataalteracao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ordemservico_empresa_codigo_key" ON "ordemservico" USING btree ("idempresa","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tipoordemservicoevento_empresa_codigo_key" ON "tipoordemservicoevento" USING btree ("idempresa","codigo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipoordemservicoevento_idempresa_idx" ON "tipoordemservicoevento" USING btree ("idempresa" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "configuracaoordemservico_idempresa_key" ON "configuracaoordemservico" USING btree ("idempresa");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordemservicoitem_idempresa_idx" ON "ordemservicoitem" USING btree ("idempresa" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordemservicoitem_idordemservico_idx" ON "ordemservicoitem" USING btree ("idordemservico" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordemservicoitemlote_idempresa_idx" ON "ordemservicoitemlote" USING btree ("idempresa" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordemservicoitemlote_idordemservicoitem_idx" ON "ordemservicoitemlote" USING btree ("idordemservicoitem" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordemservicoevento_idempresa_idx" ON "ordemservicoevento" USING btree ("idempresa" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordemservicoevento_idordemservico_idx" ON "ordemservicoevento" USING btree ("idordemservico" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordemservicofaturamento_idempresa_idx" ON "ordemservicofaturamento" USING btree ("idempresa" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordemservicofaturamento_idordemservico_idx" ON "ordemservicofaturamento" USING btree ("idordemservico" text_ops);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tipoordemservicoevento" ADD CONSTRAINT "tipoordemservicoevento_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuracaoordemservico" ADD CONSTRAINT "configuracaoordemservico_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuracaoordemservico" ADD CONSTRAINT "configuracaoordemservico_idcfopexternaproduto_fkey" FOREIGN KEY ("idcfopexternaproduto") REFERENCES "public"."cfop"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuracaoordemservico" ADD CONSTRAINT "configuracaoordemservico_idcfopexternaservico_fkey" FOREIGN KEY ("idcfopexternaservico") REFERENCES "public"."cfop"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuracaoordemservico" ADD CONSTRAINT "configuracaoordemservico_idcfopexternaservicost_fkey" FOREIGN KEY ("idcfopexternaservicost") REFERENCES "public"."cfop"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuracaoordemservico" ADD CONSTRAINT "configuracaoordemservico_idcfopinternaproduto_fkey" FOREIGN KEY ("idcfopinternaproduto") REFERENCES "public"."cfop"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuracaoordemservico" ADD CONSTRAINT "configuracaoordemservico_idcfopinternaservico_fkey" FOREIGN KEY ("idcfopinternaservico") REFERENCES "public"."cfop"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuracaoordemservico" ADD CONSTRAINT "configuracaoordemservico_idcfopinternaservicost_fkey" FOREIGN KEY ("idcfopinternaservicost") REFERENCES "public"."cfop"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitem" ADD CONSTRAINT "ordemservicoitem_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitem" ADD CONSTRAINT "ordemservicoitem_idcfop_fkey" FOREIGN KEY ("idcfop") REFERENCES "public"."cfop"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitem" ADD CONSTRAINT "ordemservicoitem_idordemservico_fkey" FOREIGN KEY ("idordemservico") REFERENCES "public"."ordemservico"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitem" ADD CONSTRAINT "ordemservicoitem_idtecnico_fkey" FOREIGN KEY ("idtecnico") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitem" ADD CONSTRAINT "ordemservicoitem_idusuariodesconto_fkey" FOREIGN KEY ("idusuariodesconto") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitem" ADD CONSTRAINT "ordemservicoitem_idsupervisorvenda_fkey" FOREIGN KEY ("idsupervisorvenda") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitem" ADD CONSTRAINT "ordemservicoitem_idproduto_fkey" FOREIGN KEY ("idproduto") REFERENCES "public"."produtos"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitemlote" ADD CONSTRAINT "ordemservicoitemlote_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoitemlote" ADD CONSTRAINT "ordemservicoitemlote_idordemservicoitem_fkey" FOREIGN KEY ("idordemservicoitem") REFERENCES "public"."ordemservicoitem"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoevento" ADD CONSTRAINT "ordemservicoevento_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoevento" ADD CONSTRAINT "ordemservicoevento_idordemservico_fkey" FOREIGN KEY ("idordemservico") REFERENCES "public"."ordemservico"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoevento" ADD CONSTRAINT "ordemservicoevento_idtecnicode_fkey" FOREIGN KEY ("idtecnicode") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoevento" ADD CONSTRAINT "ordemservicoevento_idtecnicopara_fkey" FOREIGN KEY ("idtecnicopara") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicoevento" ADD CONSTRAINT "ordemservicoevento_idtipoevento_fkey" FOREIGN KEY ("idtipoevento") REFERENCES "public"."tipoordemservicoevento"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicofaturamento" ADD CONSTRAINT "ordemservicofaturamento_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicofaturamento" ADD CONSTRAINT "ordemservicofaturamento_idordemservico_fkey" FOREIGN KEY ("idordemservico") REFERENCES "public"."ordemservico"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicofaturamento" ADD CONSTRAINT "ordemservicofaturamento_idnotafiscal_fkey" FOREIGN KEY ("idnotafiscal") REFERENCES "public"."notafiscal"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicofaturamento" ADD CONSTRAINT "ordemservicofaturamento_iddavos_fkey" FOREIGN KEY ("iddavos") REFERENCES "public"."dav"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservicofaturamento" ADD CONSTRAINT "ordemservicofaturamento_idfaturamento_fkey" FOREIGN KEY ("idfaturamento") REFERENCES "public"."financeiro"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservico" ADD CONSTRAINT "fk_ordemservico_objeto" FOREIGN KEY ("idobjeto") REFERENCES "public"."objeto"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservico" ADD CONSTRAINT "fk_ordemservico_area" FOREIGN KEY ("idarea") REFERENCES "public"."area"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservico" ADD CONSTRAINT "fk_ordemservico_prioridade" FOREIGN KEY ("idprioridade") REFERENCES "public"."prioridades"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservico" ADD CONSTRAINT "fk_ordemservico_tipoproblema" FOREIGN KEY ("idtipoproblema") REFERENCES "public"."tipoproblema"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordemservico" ADD CONSTRAINT "fk_ordemservico_condicaopagamento" FOREIGN KEY ("idcondicaopagamento") REFERENCES "public"."condicaopagamento"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
INSERT INTO "tipoordemservicoevento" ("id", "idempresa", "codigo", "status", "cor", "descricao", "ordem", "ativo", "padrao")
SELECT
	gen_random_uuid()::text,
	e."id",
	s.codigo,
	s.status,
	s.cor,
	s.descricao,
	s.ordem,
	1,
	1
FROM "empresas" e
CROSS JOIN (
	VALUES
		('ABERTA', 1, '#FFFFFF', 'Aberta', 1),
		('EM_EXECUCAO', 2, '#22C55E', 'Em execução', 2),
		('FINALIZADA', 3, '#3B82F6', 'Finalizada', 3),
		('CANCELADA', 4, '#EF4444', 'Cancelada', 4),
		('FATURADA', 5, '#6B7280', 'Faturado', 5),
		('AGENDADA', 6, '#F97316', 'Agendada', 6),
		('PAUSADA', 7, '#A855F7', 'Pausada', 7),
		('MESCLADA', 8, '#EAB308', 'Mesclado', 8),
		('DUPLICADA', 9, '#92400E', 'Duplicado', 9),
		('SERVICO_NAO_EXECUTADO', 10, '#EC4899', 'Serviço não executado', 10),
		('ORCAMENTO', 11, '#06B6D4', 'Orçamento', 11),
		('FATURADA_PARCIALMENTE', 12, '#6366F1', 'Faturada parcialmente', 12),
		('RETIRADA', 13, '#14B8A6', 'Retirada', 13)
) AS s(codigo, status, cor, descricao, ordem)
WHERE NOT EXISTS (
	SELECT 1
	FROM "tipoordemservicoevento" t
	WHERE t."idempresa" = e."id" AND t."codigo" = s.codigo
);--> statement-breakpoint
INSERT INTO "configuracaoordemservico" ("id", "idempresa", "camposextras")
SELECT gen_random_uuid()::text, e."id", '[]'::jsonb
FROM "empresas" e
WHERE NOT EXISTS (
	SELECT 1 FROM "configuracaoordemservico" c WHERE c."idempresa" = e."id"
);
