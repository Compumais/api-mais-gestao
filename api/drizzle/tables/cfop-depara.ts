import {
	foreignKey,
	index,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { cfop } from "./cfop.js";
import { empresa } from "./empresas.js";

export const cfopdepara = pgTable(
	"cfopdepara",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcfopentrada: text(),
		idcfopsaida: text(),
		codigoentrada: varchar({ length: 10 }),
		codigosaida: varchar({ length: 10 }),
		uf: varchar({ length: 2 }),
		inativo: smallint().default(0),
	},
	(table) => [
		index("cfopdepara_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("cfopdepara_entrada_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
			table.idcfopentrada.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "cfopdepara_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentrada],
			foreignColumns: [cfop.id],
			name: "cfopdepara_idcfopentrada_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopsaida],
			foreignColumns: [cfop.id],
			name: "cfopdepara_idcfopsaida_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
