-- Tabelas de BI Personalizado & Editor SQL
CREATE TABLE IF NOT EXISTS "bi_consultas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempresa" text NOT NULL,
	"nome" varchar(120) NOT NULL,
	"descricao" text,
	"sql" text NOT NULL,
	"parametros" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"origem" varchar(20) DEFAULT 'personalizada' NOT NULL,
	"criadopor" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "bi_consultas_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "bi_consultas_criadopor_fkey" FOREIGN KEY ("criadopor") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bi_consultas_idempresa_idx" ON "bi_consultas" USING btree ("idempresa" text_ops);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bi_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempresa" text NOT NULL,
	"idconsulta" uuid NOT NULL,
	"titulo" varchar(120) NOT NULL,
	"subtitulo" varchar(200),
	"tipografico" varchar(20) DEFAULT 'tabela' NOT NULL,
	"mapeamento" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cachettlsegundos" integer DEFAULT 300 NOT NULL,
	"codigocatalogo" varchar(80),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "bi_widgets_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "bi_widgets_idconsulta_fkey" FOREIGN KEY ("idconsulta") REFERENCES "public"."bi_consultas"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bi_widgets_idempresa_idx" ON "bi_widgets" USING btree ("idempresa" text_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bi_widgets_idconsulta_idx" ON "bi_widgets" USING btree ("idconsulta");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bi_dashboard_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempresa" text NOT NULL,
	"nome" varchar(100) DEFAULT 'Meu Painel' NOT NULL,
	"itens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"atualizadopor" text,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "bi_dashboard_layouts_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "bi_dashboard_layouts_atualizadopor_fkey" FOREIGN KEY ("atualizadopor") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bi_dashboard_layouts_idempresa_key" ON "bi_dashboard_layouts" USING btree ("idempresa");
--> statement-breakpoint
-- Schema isolado para consultas BI com security_barrier e filtro multi-tenant automático
CREATE SCHEMA IF NOT EXISTS "relatorios";
--> statement-breakpoint
CREATE OR REPLACE VIEW "relatorios"."vw_financeiro" WITH (security_barrier = true) AS
SELECT
	f.id,
	f.tipo,
	f.status,
	f.documento,
	f.parcela,
	f.emissao,
	f.vencimento,
	f.pagamento,
	f.baixa,
	f.valor,
	f.saldo,
	f.valorpagorecebido AS valor_pago_recebido,
	f.juros,
	f.multa,
	f.historico,
	e.nome AS entidade_nome,
	e.cnpjcpf AS entidade_documento,
	pc.nome AS plano_contas_nome,
	pc.codigo AS plano_contas_codigo
FROM public.financeiro f
LEFT JOIN public.entidade e ON e.id = f.identidade AND e.idempresa = f.idempresa
LEFT JOIN public.planocontas pc ON pc.id = f.idplanocontas AND pc.idempresa = f.idempresa
WHERE f.idempresa = current_setting('app.empresa_id', true);
--> statement-breakpoint
CREATE OR REPLACE VIEW "relatorios"."vw_financeiro_lancamentos" WITH (security_barrier = true) AS
SELECT
	fl.id,
	fl.idfinanceiro AS id_financeiro,
	f.tipo,
	f.documento,
	fl.valor,
	fl.valorbaixa AS valor_baixa,
	fl.valoranterior AS valor_anterior,
	fl.desconto,
	fl.juros,
	fl.multa,
	fl.acrescimo,
	fl.pagamento,
	fl.baixa,
	fl.historico,
	fl.observacao,
	(COALESCE(fl.cancelado, 0) = 1) AS cancelado,
	fl.datahoracancelado AS cancelado_em,
	e.nome AS entidade_nome
FROM public.financeirolancamento fl
INNER JOIN public.financeiro f ON f.id = fl.idfinanceiro
LEFT JOIN public.entidade e ON e.id = f.identidade AND e.idempresa = f.idempresa
WHERE f.idempresa = current_setting('app.empresa_id', true);
--> statement-breakpoint
CREATE OR REPLACE VIEW "relatorios"."vw_vendas_pdv" WITH (security_barrier = true) AS
SELECT
	v.id,
	v.numeropdv AS numero_pdv,
	v.vendalocal AS origem_venda,
	v.datacriacao AS data_venda,
	v.valortotal AS valor_total,
	v.valordinheiro AS valor_dinheiro,
	v.valorpix AS valor_pix,
	v.valorcartaocredito AS valor_cartao_credito,
	v.valorcartaodebito AS valor_cartao_debito,
	v.valorcartao AS valor_cartao,
	v.valortroco AS valor_troco,
	v.cancelada,
	v.canceladaem AS cancelada_em,
	v.motivocancelamento AS motivo_cancelamento,
	e.nome AS cliente_nome
FROM public.vendapdvgourmet v
LEFT JOIN public.entidade e ON e.id = v.identidade AND e.idempresa = v.idempresa
WHERE v.idempresa = current_setting('app.empresa_id', true);
--> statement-breakpoint
CREATE OR REPLACE VIEW "relatorios"."vw_notas_fiscais" WITH (security_barrier = true) AS
SELECT
	nf.id,
	nf.numero,
	nf.serie,
	nf.modelo,
	nf.status,
	nf.tipoemissao AS tipo_emissao,
	nf.emissao,
	nf.datahoraemissao AS data_hora_emissao,
	nf.valortotalnota AS valor_total,
	nf.avista AS valor_a_vista,
	nf.aprazo AS valor_a_prazo,
	nf.chavenfe AS chave_nfe,
	nf.cancelamento
FROM public.notafiscal nf
WHERE nf.idempresa = current_setting('app.empresa_id', true);
--> statement-breakpoint
CREATE OR REPLACE VIEW "relatorios"."vw_produtos" WITH (security_barrier = true) AS
SELECT
	p.id,
	p.codigo,
	p.descricao,
	p.ncm,
	p.unidademedida AS unidade_medida,
	p.preco,
	p.custoaquisicao AS custo_aquisicao,
	p.precoultimacompra AS preco_ultima_compra,
	(COALESCE(p.inativo, 0) = 0) AS ativo
FROM public.produtos p
WHERE p.idempresa = current_setting('app.empresa_id', true);
--> statement-breakpoint
CREATE OR REPLACE VIEW "relatorios"."vw_estoque_saldos" WITH (security_barrier = true) AS
SELECT
	s.id,
	s.codigoproduto AS codigo_produto,
	s.nomeproduto AS nome_produto,
	s.ncm,
	s.unidademedida AS unidade_medida,
	s.quantidade,
	s.quantidadefiscal AS quantidade_fiscal,
	s.ultimaalteracao AS ultima_alteracao
FROM public.saldoestoque s
WHERE s.idempresa = current_setting('app.empresa_id', true);
--> statement-breakpoint
CREATE OR REPLACE VIEW "relatorios"."vw_entidades" WITH (security_barrier = true) AS
SELECT
	e.id,
	e.nome,
	e.razaosocial AS razao_social,
	e.cnpjcpf AS cnpj_cpf,
	e.email,
	e.telefone,
	e.bairro,
	e.cep,
	(COALESCE(e.cliente, 0) = 1) AS eh_cliente,
	(COALESCE(e.fornecedor, 0) = 1) AS eh_fornecedor,
	(COALESCE(e.transportador, 0) = 1) AS eh_transportador,
	e.criadoem AS criado_em
FROM public.entidade e
WHERE e.idempresa = current_setting('app.empresa_id', true);
--> statement-breakpoint
-- Produção: provisione uma role dedicada READ ONLY e configure DATABASE_BI_READONLY_URL:
--   CREATE ROLE mais_gestao_bi_ro LOGIN PASSWORD '<senha_forte>';
--   REVOKE ALL ON SCHEMA public FROM mais_gestao_bi_ro;
--   GRANT USAGE ON SCHEMA relatorios TO mais_gestao_bi_ro;
--   GRANT SELECT ON ALL TABLES IN SCHEMA relatorios TO mais_gestao_bi_ro;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA relatorios GRANT SELECT ON TABLES TO mais_gestao_bi_ro;
