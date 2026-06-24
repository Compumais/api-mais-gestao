import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const tarefaExecucao = pgTable(
	"tarefa_execucao",
	{
		id: text().primaryKey().notNull(),
		tipo: varchar({ length: 50 }).notNull(),
		idempresa: text(),
		status: varchar({ length: 20 }).notNull(),
		iniciadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		finalizadoem: timestamp({ precision: 3, mode: "string" }),
		detalhes: jsonb("detalhes").$type<Record<string, unknown>>(),
		erro: text(),
	},
	(table) => [
		index("tarefa_execucao_tipo_idx").on(table.tipo),
		index("tarefa_execucao_idempresa_idx").on(table.idempresa),
		index("tarefa_execucao_iniciadoem_idx").on(table.iniciadoem),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "tarefa_execucao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
