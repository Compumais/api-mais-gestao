import {
	bigint,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const fatorconversao = pgTable(
	"fatorconversao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 100 }).notNull(),
		fator: numeric({ precision: 15, scale: 6 }).notNull(),
		currenttimemillis: bigint({ mode: "number" }),
	},
	(table) => [
		index("fatorconversao_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("fatorconversao_nome_idx").using(
			"btree",
			table.nome.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "fatorconversao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
