import { foreignKey, index, pgTable, smallint, text, varchar } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";
import { entidade } from "./entidade";

export const objeto = pgTable(
	"objeto",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 20 }),
		anofabricacao: smallint(),
		campochave: varchar({ length: 50 }),
		descricao: varchar({ length: 100 }),
		inativo: smallint(), // 0=Ativo, 1=Inativo
		marca: varchar({ length: 30 }),
		modelo: varchar({ length: 30 }),
		numerofabricacao: varchar({ length: 30 }),
		placa: varchar({ length: 10 }),
		renavam: varchar({ length: 11 }),
		identidade: text(),
		extra1: text(),
		extra2: text(),
		extra3: text(),
		extra4: text(),
		extra5: text(),
		extra6: text(),
		extra7: text(),
		extra8: text(),
		extra9: text(),
		extra10: text(),
	},
	(table) => [
		index("objeto_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "objeto_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "objeto_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);