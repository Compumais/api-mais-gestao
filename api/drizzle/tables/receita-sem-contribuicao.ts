import { sql } from "drizzle-orm";
import { date, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const receitasemcontribuicao = pgTable("receitasemcontribuicao", {
	id: text().primaryKey().notNull(),
	idempresa: text().notNull(),
	aliquotacofins: numeric({ precision: 5, scale: 2 }),
	aliquotaapis: numeric(),
	codigo: varchar({ length: 16 }),
	cst: varchar({ length: 2 }),
	datacadastro: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	descricao: varchar({ length: 100 }),
	datafinal: date(),
	datainicial: date(),
	descricaounidade: varchar({ length: 127 }),
	exipi: varchar({ length: 256 }),
	ncm: varchar({ length: 256 }),
	ncmex: varchar({ length: 256 }),
});