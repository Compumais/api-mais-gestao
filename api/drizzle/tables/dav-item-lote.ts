import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { davitem } from "./dav-item.js";
import { empresa } from "./empresas.js";
import { lote } from "./lote.js";

const numeric186 = () => numeric({ precision: 18, scale: 6, mode: "string" });

export const davitemlote = pgTable(
	"davitemlote",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		iddavitem: text().notNull(),
		idlote: text(),
		numero: varchar({ length: 20 }).notNull(),
		quantidade: numeric186().notNull(),
		datafabricacao: date(),
		datavalidade: date(),
		codigoagregacao: varchar({ length: 20 }),
	},
	(table) => [
		index("davitemlote_item_idx").on(table.iddavitem),
		index("davitemlote_lote_idx").on(table.idlote),
		index("davitemlote_idempresa_idx").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "davitemlote_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.iddavitem],
			foreignColumns: [davitem.id],
			name: "davitemlote_iddavitem_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idlote],
			foreignColumns: [lote.id],
			name: "davitemlote_idlote_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
