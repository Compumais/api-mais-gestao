import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { lote } from "./lote.js";
import { notafiscalitem } from "./nota-fiscal-item.js";

const numeric186 = () => numeric({ precision: 18, scale: 6, mode: "string" });

export const notafiscalitemlote = pgTable(
	"notafiscalitemlote",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idnotafiscalitem: text().notNull(),
		idlote: text(),
		numero: varchar({ length: 20 }).notNull(),
		quantidade: numeric186().notNull(),
		datafabricacao: date(),
		datavalidade: date(),
		codigoagregacao: varchar({ length: 20 }),
	},
	(table) => [
		index("notafiscalitemlote_item_idx").on(table.idnotafiscalitem),
		index("notafiscalitemlote_lote_idx").on(table.idlote),
		index("notafiscalitemlote_idempresa_idx").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "notafiscalitemlote_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idnotafiscalitem],
			foreignColumns: [notafiscalitem.id],
			name: "notafiscalitemlote_idnotafiscalitem_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idlote],
			foreignColumns: [lote.id],
			name: "notafiscalitemlote_idlote_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
