import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const certificadodigital = pgTable(
	"certificadodigital",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		apelido: varchar({ length: 100 }).notNull(),
		cnpjcertificado: varchar({ length: 14 }).notNull(),
		arquivopfxcriptografado: text().notNull(),
		senhacriptografada: text().notNull(),
		validadeinicio: timestamp({ precision: 3, mode: "string" }),
		validadefim: timestamp({ precision: 3, mode: "string" }),
		serial: varchar({ length: 100 }),
		thumbprint: varchar({ length: 100 }),
		ativo: boolean().default(false).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("certificadodigital_idempresa_idx").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "certificadodigital_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
