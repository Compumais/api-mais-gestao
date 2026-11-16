import {
	foreignKey,
	integer,
	numeric,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { grupocontrato } from "./grupo-contrato.js";

export const tipocontrato = pgTable(
	"tipocontrato",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idgrupocontrato: text(),
		codigo: integer().notNull(),
		descricao: varchar({ length: 120 }).notNull(),
		valor: numeric({ precision: 12, scale: 2 }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "fk_tipocontrato_empresa",
		}),
		foreignKey({
			columns: [table.idgrupocontrato],
			foreignColumns: [grupocontrato.id],
			name: "fk_tipocontrato_grupocontrato",
		}),
	],
);
