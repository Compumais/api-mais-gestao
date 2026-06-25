import {
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", {
		withTimezone: true,
		mode: "string",
	}),
	startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export * from "./tables/area.js";
export * from "./tables/assinaturas.js";
export * from "./tables/audit-logs.js";
export * from "./tables/banco.js";
export * from "./tables/centro-custo.js";
export * from "./tables/cest.js";
export * from "./tables/cfop.js";
export * from "./tables/cfop-depara.js";
export * from "./tables/cfop-padrao.js";
export * from "./tables/clientes-asaas.js";
export * from "./tables/codigo-reduzido-conta-contabil.js";
export * from "./tables/condicao-pagamento.js";
export * from "./tables/configuracoes.js";
export * from "./tables/configuracoes-usuario.js";
export * from "./tables/conta-contabil.js";
export * from "./tables/conta-corrente.js";
export * from "./tables/conta-corrente-lancamento.js";
export * from "./tables/conta-mesa.js";
export * from "./tables/conta-mesa-item.js";
export * from "./tables/contas.js";
export * from "./tables/custo-produto.js";
export * from "./tables/dav.js";
export * from "./tables/dav-item.js";
export * from "./tables/departamento.js";
export * from "./tables/certificado-digital.js";
export * from "./tables/empresa-fiscal.js";
export * from "./tables/empresas.js";
export * from "./tables/enquatramento-ipi.js";
export * from "./tables/entidade.js";
export * from "./tables/entidade-conta-contabil.js";
export * from "./tables/fechamento-caixa.js";
export * from "./tables/financeiro.js";
export * from "./tables/financeiro-lancamento.js";
export * from "./tables/hierarquia.js";
export * from "./tables/integracao-contabil-configuracao.js";
export * from "./tables/local-estoque.js";
export * from "./tables/local-retirada.js";
export * from "./tables/motivo-baixa-financeiro.js";
export * from "./tables/motivo-rebaixa.js";
export * from "./tables/movimento-estoque.js";
export * from "./tables/ncm.js";
export * from "./tables/nfe-configuracao.js";
export * from "./tables/nfe-serie.js";
export * from "./tables/nota-fiscal.js";
export * from "./tables/nota-fiscal-item.js";
export * from "./tables/nota-fiscal-xml.js";
export * from "./tables/notificacoes.js";
export * from "./tables/objeto.js";
export * from "./tables/operacao-fiscal.js";
export * from "./tables/parametrizacao-tributos.js";
export * from "./tables/ordem-servico.js";
export * from "./tables/plano-contas.js";
export * from "./tables/plano-contas-conta-contabil.js";
export * from "./tables/prioridades.js";
export * from "./tables/produto-fornecedor.js";
export * from "./tables/produtos.js";
export * from "./tables/receita-sem-contribuicao.js";
export * from "./tables/saldo-estoque.js";
export * from "./tables/taxauf.js";
export * from "./tables/sessoes.js";
export * from "./tables/tarefa-execucao.js";
export * from "./tables/informativos.js";
export * from "./tables/tipo-documento-financeiro.js";
export * from "./tables/tipo-problema.js";
export * from "./tables/unidade-medida.js";
export * from "./tables/usuario-empresa.js";
export * from "./tables/usuarios.js";
export * from "./tables/venda-pdv-item.js";
export * from "./tables/vendas-pdv-gourmet.js";
export * from "./tables/verificacoes.js";
