import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { empresa } from "./empresas.js";
import { notafiscal } from "./nota-fiscal.js";
import { usuarios } from "./usuarios.js";

export const regrafiscal = pgTable(
	"regrafiscal",
	{
		id: text().primaryKey().notNull(),
		ruleid: varchar("rule_id", { length: 80 }).notNull(),
		descricao: text().notNull(),
		prioridade: integer().notNull().default(100),
		vigenciainicio: timestamp("vigencia_inicio", {
			precision: 3,
			mode: "string",
		}).notNull(),
		vigenciafim: timestamp("vigencia_fim", {
			precision: 3,
			mode: "string",
		}),
		condicoes: jsonb().$type<Record<string, unknown>>().notNull(),
		resultado: jsonb().$type<Record<string, unknown>>().notNull(),
		fontes: jsonb().$type<unknown[]>().notNull(),
		status: varchar({ length: 30 }).notNull(),
		versao: integer().notNull().default(1),
		idempresa: text(),
		validadoem: timestamp("validado_em", { precision: 3, mode: "string" }),
		validadopor: text("validado_por"),
		criadoem: timestamp("criado_em", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp("atualizado_em", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("regrafiscal_rule_id_key").on(table.ruleid),
		index("regrafiscal_status_idx").on(table.status),
		index("regrafiscal_vigencia_idx").on(table.vigenciainicio),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "regrafiscal_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.validadopor],
			foreignColumns: [usuarios.id],
			name: "regrafiscal_validado_por_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const regrafiscalhistorico = pgTable(
	"regrafiscalhistorico",
	{
		id: text().primaryKey().notNull(),
		idregrafiscal: text("id_regra_fiscal").notNull(),
		versao: integer().notNull(),
		snapshot: jsonb().notNull(),
		criadoem: timestamp("criado_em", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idusuario: text("id_usuario"),
	},
	(table) => [
		index("regrafiscalhistorico_regra_idx").on(table.idregrafiscal),
		foreignKey({
			columns: [table.idregrafiscal],
			foreignColumns: [regrafiscal.id],
			name: "regrafiscalhistorico_id_regra_fiscal_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "regrafiscalhistorico_id_usuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const auditoriafiscalnfe = pgTable(
	"auditoriafiscalnfe",
	{
		id: text().primaryKey().notNull(),
		idnotafiscal: text("id_nota_fiscal"),
		idempresa: text().notNull(),
		classificacaofinal: varchar("classificacao_final", { length: 60 }).notNull(),
		nivelconfianca: varchar("nivel_confianca", { length: 30 }).notNull(),
		permitirtransmissao: boolean("permitir_transmissao").notNull(),
		relatorio: jsonb().notNull(),
		criadoem: timestamp("criado_em", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("auditoriafiscalnfe_nota_idx").on(table.idnotafiscal),
		index("auditoriafiscalnfe_empresa_idx").on(table.idempresa),
		foreignKey({
			columns: [table.idnotafiscal],
			foreignColumns: [notafiscal.id],
			name: "auditoriafiscalnfe_id_nota_fiscal_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "auditoriafiscalnfe_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
