import {
	date,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { equipamento } from "./equipamento.js";
import { locacao } from "./locacao.js";

export const locacaoitem = pgTable(
	"locacao_item",
	{
		id: text().primaryKey().notNull(),
		idlocacao: text().notNull(),
		idequipamento: text().notNull(),
		periodo: varchar({ length: 20 }).notNull(),
		quantidade: integer().notNull(),
		valorunitario: numeric({ precision: 12, scale: 2 }).notNull(),
		valordiaria: numeric({ precision: 12, scale: 2 }).notNull(),
		dataprevista: date().notNull(),
		valorperiodo: numeric({ precision: 12, scale: 2 }).notNull(),
		valormora: numeric({ precision: 12, scale: 2 }).notNull().default("0.00"),
		valortotal: numeric({ precision: 12, scale: 2 }).notNull(),
		diasatraso: integer().notNull().default(0),
	},
	(table) => [
		index("locacao_item_idlocacao_idx").on(table.idlocacao),
		index("locacao_item_idequipamento_idx").on(table.idequipamento),
		foreignKey({
			columns: [table.idlocacao],
			foreignColumns: [locacao.id],
			name: "locacao_item_idlocacao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idequipamento],
			foreignColumns: [equipamento.id],
			name: "locacao_item_idequipamento_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
