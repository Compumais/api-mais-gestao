import {
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const cest = pgTable(
	"cest",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		inativo: integer().default(0), // 0=Ativo, 1=Inativo
		descricao: text().notNull(),
		descricaoncm: text().notNull(),
		codigo: varchar({ length: 10 }).notNull(),
	},
	(table) => [
		index("cest_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "cest_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
