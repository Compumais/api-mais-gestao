import { bigint, foreignKey, index, pgTable, text } from "drizzle-orm/pg-core";
import { contacontabil } from "./conta-contabil.js";
import { empresa } from "./empresas.js";
import { planocontas } from "./plano-contas.js";

export const planocontascontacontabil = pgTable(
	"planocontascontacontabil",
	{
		id: text().primaryKey().notNull(),
		idcontacontabil: text(),
		idempresa: text(),
		idplanocontas: text(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
	},
	(table) => [
		index("planocontascontacontabil_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "planocontascontacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontacontabil],
			foreignColumns: [contacontabil.id],
			name: "planocontascontacontabil_idcontacontabil_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "planocontascontacontabil_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
