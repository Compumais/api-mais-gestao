import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { ordemservicoitem } from "./ordem-servico-item.js";

export const ordemservicoitemlote = pgTable(
	"ordemservicoitemlote",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigolote: varchar({ length: 30 }),
		datalote: timestamp({ precision: 3, mode: "string" }),
		emissao: timestamp({ precision: 3, mode: "string" }),
		idlote: text(),
		idordemservicoitem: text().notNull(),
		quantidade: numeric({ precision: 15, scale: 6 }),
		vencimento: timestamp({ precision: 3, mode: "string" }),
		datacriacao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("ordemservicoitemlote_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("ordemservicoitemlote_idordemservicoitem_idx").using(
			"btree",
			table.idordemservicoitem.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "ordemservicoitemlote_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idordemservicoitem],
			foreignColumns: [ordemservicoitem.id],
			name: "ordemservicoitemlote_idordemservicoitem_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
