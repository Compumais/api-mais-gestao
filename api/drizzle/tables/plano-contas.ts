import {
	bigint,
	foreignKey,
	integer,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

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
		idcontacontabilintegracao: bigint({ mode: "number" }),
		exportaparacontabilidade: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idgrupodre: bigint({ mode: "number" }),
		idplanocontas: text(),
	},
	(table) => [
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
