import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { dav } from "./dav.js";
import { empresa } from "./empresas.js";
import { financeiro } from "./financeiro.js";
import { notafiscal } from "./nota-fiscal.js";
import { ordemservico } from "./ordem-servico.js";

export const ordemservicofaturamento = pgTable(
	"ordemservicofaturamento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		iddavos: text(),
		idfaturamento: text(),
		idnotafiscal: text(),
		idordemservico: text().notNull(),
		datacriacao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("ordemservicofaturamento_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("ordemservicofaturamento_idordemservico_idx").using(
			"btree",
			table.idordemservico.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "ordemservicofaturamento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idordemservico],
			foreignColumns: [ordemservico.id],
			name: "ordemservicofaturamento_idordemservico_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idnotafiscal],
			foreignColumns: [notafiscal.id],
			name: "ordemservicofaturamento_idnotafiscal_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.iddavos],
			foreignColumns: [dav.id],
			name: "ordemservicofaturamento_iddavos_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idfaturamento],
			foreignColumns: [financeiro.id],
			name: "ordemservicofaturamento_idfaturamento_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
