import {
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { notafiscal } from "./nota-fiscal.js";

export const notafiscalxml = pgTable(
	"notafiscalxml",
	{
		id: text().primaryKey().notNull(),
		idnotafiscal: text().notNull().unique(),
		idempresa: text().notNull(),
		chavenfe: varchar({ length: 44 }),
		protocolonfe: varchar({ length: 18 }),
		hashsha256: varchar({ length: 64 }),
		tamanhobytes: integer(),
		criadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("notafiscalxml_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("notafiscalxml_chavenfe_idx").using(
			"btree",
			table.chavenfe.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idnotafiscal],
			foreignColumns: [notafiscal.id],
			name: "notafiscalxml_idnotafiscal_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "notafiscalxml_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
