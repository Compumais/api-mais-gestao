import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

/** Ajustes manuais da apuração EFD (E111 / M210-M220 / M610-M620). */
export const apuracaoefdajuste = pgTable(
	"apuracao_efd_ajuste",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		/** icms | pis | cofins */
		tipo: varchar({ length: 10 }).notNull(),
		/** Primeiro dia do mês de competência. */
		competencia: date().notNull(),
		codigoajuste: varchar({ length: 10 }).notNull(),
		descricao: text(),
		valor: numeric({ precision: 15, scale: 2, mode: "string" }).notNull(),
		/** debito | credito */
		natureza: varchar({ length: 10 }).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("apuracao_efd_ajuste_empresa_comp_idx").on(
			table.idempresa,
			table.competencia,
			table.tipo,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "apuracao_efd_ajuste_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
