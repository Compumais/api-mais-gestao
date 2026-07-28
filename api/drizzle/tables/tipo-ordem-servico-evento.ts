import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const tipoordemservicoevento = pgTable(
	"tipoordemservicoevento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 40 }).notNull(),
		status: smallint().notNull(),
		cor: varchar({ length: 7 }).notNull(),
		descricao: varchar({ length: 100 }).notNull(),
		ordem: integer().default(0).notNull(),
		ativo: smallint().default(1).notNull(),
		padrao: smallint().default(0).notNull(),
		datacriacao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("tipoordemservicoevento_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("tipoordemservicoevento_empresa_codigo_key").on(
			table.idempresa,
			table.codigo,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "tipoordemservicoevento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
