import {
	foreignKey,
	integer,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const grupocontrato = pgTable(
	"grupocontrato",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: integer().notNull(),
		descricao: varchar({ length: 120 }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "fk_grupocontrato_empresa",
		}),
	],
);
