import { foreignKey, index, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const cfoppadrao = pgTable("cfoppadrao", {
	id: text().primaryKey().notNull(),
	idempresa: text().notNull(),
	finalidade: varchar({ length: 1024 }).notNull(),
	inativo: integer().default(0), // 0=Ativo, 1=Inativo
	nome: varchar({ length: 1024 }).notNull(),
	codigo: varchar({ length: 20 }).notNull(),
}, (table) => [
	index("cfoppadrao_idempresa_idx").using(
		"btree",
		table.idempresa.asc().nullsLast().op("text_ops"),
	),
	foreignKey({
		columns: [table.idempresa],
		foreignColumns: [empresa.id],
		name: "cfoppadrao_idempresa_fkey",
	})
		.onUpdate("cascade")
		.onDelete("cascade"),
]);
