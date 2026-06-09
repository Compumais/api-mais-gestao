import { sql } from "drizzle-orm";
import { foreignKey, index, pgTable, smallint, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const prioridades = pgTable(
	"prioridades",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		peso: smallint(),
		inativo: smallint(), // 0=Ativo, 1=Inativo
		descricao: varchar({ length: 50 }),
		codigo: varchar({ length: 6 }),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		index("prioridades_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "prioridades_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);