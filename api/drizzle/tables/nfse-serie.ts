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

export const nfseserie = pgTable(
	"nfseserie",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		serie: varchar({ length: 5 }).default("1").notNull(),
		numeroproximo: integer().default(1).notNull(),
		padrao: boolean().default(false).notNull(),
		ativo: boolean().default(true).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("nfseserie_empresa_serie_key").on(table.idempresa, table.serie),
		index("nfseserie_idempresa_idx").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "nfseserie_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
