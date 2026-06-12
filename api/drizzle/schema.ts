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

export * from "./tables/area";
export * from "./tables/assinaturas";
export * from "./tables/audit-logs";
export * from "./tables/banco";
export * from "./tables/centro-custo";
export * from "./tables/cest";
export * from "./tables/cfop";
export * from "./tables/cfop-padrao";
export * from "./tables/clientes-asaas";
export * from "./tables/codigo-reduzido-conta-contabil";
export * from "./tables/condicao-pagamento";
export * from "./tables/configuracoes";
export * from "./tables/configuracoes-usuario";
export * from "./tables/conta-contabil";
export * from "./tables/conta-corrente";
export * from "./tables/conta-corrente-lancamento";
export * from "./tables/contas";
export * from "./tables/custo-produto";
export * from "./tables/dav";
export * from "./tables/departamento";
export * from "./tables/empresas";
export * from "./tables/enquatramento-ipi";
export * from "./tables/entidade";
export * from "./tables/entidade-conta-contabil";
export * from "./tables/financeiro";
export * from "./tables/financeiro-lancamento";
export * from "./tables/hierarquia";
export * from "./tables/integracao-contabil-configuracao";
export * from "./tables/local-retirada";
export * from "./tables/motivo-baixa-financeiro";
export * from "./tables/motivo-rebaixa";
export * from "./tables/ncm";
export * from "./tables/nota-fiscal";
export * from "./tables/nota-fiscal-item";
export * from "./tables/notificacoes";
export * from "./tables/objeto";
export * from "./tables/operacao-fiscal";
export * from "./tables/ordem-servico";
export * from "./tables/plano-contas";
export * from "./tables/plano-contas-conta-contabil";
export * from "./tables/prioridades";
export * from "./tables/produtos";
export * from "./tables/receita-sem-contribuicao";
export * from "./tables/sessoes";
export * from "./tables/tipo-documento-financeiro";
export * from "./tables/tipo-problema";
export * from "./tables/unidade-medida";
export * from "./tables/usuario-empresa";
export * from "./tables/usuarios";
export * from "./tables/verificacoes";
