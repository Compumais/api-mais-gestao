import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { contacorrente } from "./conta-corrente.js";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export const retornobancario = pgTable(
	"retorno_bancario",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcontacorrente: text().notNull(),
		nomearquivo: varchar({ length: 180 }).notNull(),
		checksum: varchar({ length: 64 }).notNull(),
		layout: varchar({ length: 40 }).notNull().default("cnab240"),
		status: varchar({ length: 30 }).notNull().default("importado"),
		idusuario: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		processadoem: timestamp({ precision: 3, mode: "string" }),
	},
	(table) => [
		index("retorno_bancario_idempresa_idx").on(table.idempresa),
		index("retorno_bancario_conta_idx").on(table.idcontacorrente),
		uniqueIndex("retorno_bancario_checksum_empresa_uidx").on(
			table.idempresa,
			table.checksum,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "retorno_bancario_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontacorrente],
			foreignColumns: [contacorrente.id],
			name: "retorno_bancario_idcontacorrente_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "retorno_bancario_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
