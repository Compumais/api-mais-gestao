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
import { empresa } from "./empresas.js";
import { planocontas } from "./plano-contas.js";

export const budget = pgTable(
	"budget",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idplanocontas: text().notNull(),
		ano: integer().notNull(),
		periodicidade: char({ length: 1 }).notNull(), // M - mensal, A - anual
		mes: smallint(), // 1 a 12 quando mensal, null quando anual
		valor: numeric({ precision: 12, scale: 2 }).notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
	},
	(table) => [
		index("budget_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("budget_idplanocontas_idx").using(
			"btree",
			table.idplanocontas.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "budget_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "budget_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
