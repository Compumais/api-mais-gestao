import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const servicosnfse = pgTable(
	"servicosnfse",
	{
		id: text().primaryKey().notNull(),
		idempresa: text(),
		codigo: varchar({ length: 10 }).notNull(),
		descricao: text().notNull(),
		restrito: varchar({ length: 3 }),
		codigotributacao: varchar({ length: 20 }),
		codigoextra: varchar({ length: 20 }),
		inativo: smallint().default(0).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("servicosnfse_idempresa_idx").on(table.idempresa),
		index("servicosnfse_codigo_idx").on(table.codigo),
		uniqueIndex("servicosnfse_empresa_codigo_key").on(
			table.idempresa,
			table.codigo,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "servicosnfse_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export type ServicoNfse = typeof servicosnfse.$inferSelect;
export type NovoServicoNfse = typeof servicosnfse.$inferInsert;
