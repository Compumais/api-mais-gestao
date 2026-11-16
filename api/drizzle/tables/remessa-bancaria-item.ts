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
import { financeiro } from "./financeiro.js";
import { remessabancaria } from "./remessa-bancaria.js";

export const remessabancariaitem = pgTable(
	"remessa_bancaria_item",
	{
		id: text().primaryKey().notNull(),
		idremessa: text().notNull(),
		idfinanceiro: text().notNull(),
		idcobranca: text(),
		nossonumero: varchar({ length: 25 }),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("remessa_bancaria_item_idfinanceiro_uidx").on(table.idfinanceiro),
		index("remessa_bancaria_item_idremessa_idx").on(table.idremessa),
		foreignKey({
			columns: [table.idremessa],
			foreignColumns: [remessabancaria.id],
			name: "remessa_bancaria_item_idremessa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idfinanceiro],
			foreignColumns: [financeiro.id],
			name: "remessa_bancaria_item_idfinanceiro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
