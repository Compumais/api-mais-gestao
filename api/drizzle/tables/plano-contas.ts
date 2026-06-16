import {
	bigint,
	foreignKey,
	index,
	integer,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const planocontas = pgTable(
	"planocontas",
	{
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 30 }),
		nome: varchar({ length: 40 }),
		tipomovimento: varchar({ length: 1 }),
		inativo: smallint(),
		classe: varchar({ length: 2 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
		centrocustoobrigatorio: smallint(),
		tipoconta: integer(), // 1 - Receita, 2 - Despesa, 3 - Investimento, 4 - Transferência
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcontacontabilintegracao: text(),
		exportaparacontabilidade: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idgrupodre: text(),
		idplanocontas: text(),
	},
	(table) => [
		index("planocontas_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [table.id],
			name: "planocontas_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "planocontas_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
