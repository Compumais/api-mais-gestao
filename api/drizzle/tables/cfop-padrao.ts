import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const cfoppadrao = pgTable("cfoppadrao", {
	id: text().primaryKey().notNull(),
	finalidade: varchar({ length: 1024 }).notNull(),
	inativo: integer().default(0), // 0=Ativo, 1=Inativo
	nome: varchar({ length: 1024 }).notNull(),
	codigo: varchar({ length: 20 }).notNull(),
});
