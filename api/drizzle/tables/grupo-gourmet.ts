import {
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const grupogourmet = pgTable(
	"grupogourmet",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 30 }),
		nome: varchar({ length: 60 }).notNull(),
		inativo: integer().default(0).notNull(),
	},
	(table) => [
		index("grupogourmet_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "grupogourmet_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
