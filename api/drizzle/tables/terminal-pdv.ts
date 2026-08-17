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
import { nfeserie } from "./nfe-serie.js";

export const terminalpdv = pgTable(
	"terminalpdv",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		numeropdv: integer().notNull(),
		descricao: varchar({ length: 120 }),
		idnfeserie: text().notNull(),
		ativo: boolean().default(true).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("terminalpdv_empresa_numeropdv_key").on(
			table.idempresa,
			table.numeropdv,
		),
		uniqueIndex("terminalpdv_idnfeserie_key").on(table.idnfeserie),
		index("terminalpdv_idempresa_idx").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "terminalpdv_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idnfeserie],
			foreignColumns: [nfeserie.id],
			name: "terminalpdv_idnfeserie_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
