import { bigint, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const motivobaixafinanceiro = pgTable("motivobaixafinanceiro", {
	id: text().primaryKey().notNull(),
	idempresa: text().notNull(),
	descricao: varchar({ length: 50 }).notNull(),
	inativo: integer().default(0),
	currenttimemillis: bigint({ mode: "number" }).notNull(),
});
