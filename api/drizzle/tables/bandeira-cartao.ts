import {
	bigint,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const bandeiracartao = pgTable(
	"bandeiracartao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 30 }),
		descricao: varchar({ length: 60 }).notNull(),
		inativo: integer().default(0).notNull(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
	},
	(table) => [
		index("bandeiracartao_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "bandeiracartao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
