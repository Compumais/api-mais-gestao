import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const enquatramentoipi = pgTable("enquatramentoipi", {
	id: text().primaryKey().notNull(),
	idempresa: text().notNull(),
	codigo: varchar({ length: 20 }).notNull(),
	descricao: varchar({ length: 100 }).notNull(),
	grupocst: varchar({ length: 20 }).notNull(),
	datacadastro: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
});