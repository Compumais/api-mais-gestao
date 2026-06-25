import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const nfeserie = pgTable(
	"nfeserie",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		modelo: varchar({ length: 2 }).default("55").notNull(),
		serie: varchar({ length: 3 }).notNull(),
		numeroproximo: integer().default(1).notNull(),
		padrao: boolean().default(false).notNull(),
		ativo: boolean().default(true).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("nfeserie_empresa_modelo_serie_key").on(
			table.idempresa,
			table.modelo,
			table.serie,
		),
		index("nfeserie_idempresa_idx").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "nfeserie_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
