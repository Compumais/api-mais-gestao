import {
	bigint,
	char,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	smallint,
	text,
} from "drizzle-orm/pg-core";
import { centrocusto } from "./centro-custo.js";
import { empresa } from "./empresas.js";
import { planocontas } from "./plano-contas.js";

export const budgetcentrocusto = pgTable(
	"budget_centro_custo",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcentrocusto: text().notNull(),
		idplanocontas: text(),
		ano: integer().notNull(),
		periodicidade: char({ length: 1 }).notNull(),
		mes: smallint(),
		valor: numeric({ precision: 12, scale: 2 }).notNull(),
		currenttimemillis: bigint({ mode: "number" }),
	},
	(table) => [
		index("budget_centro_custo_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("budget_centro_custo_idcentrocusto_idx").using(
			"btree",
			table.idcentrocusto.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "budget_centro_custo_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcentrocusto],
			foreignColumns: [centrocusto.id],
			name: "budget_centro_custo_idcentrocusto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "budget_centro_custo_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
