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
import { vendapdvgourmet } from "./vendas-pdv-gourmet.js";

export const vendapdvpagamento = pgTable(
	"vendapdvpagamento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idvenda: text().notNull(),
		meio: varchar({ length: 20 }).notNull(),
		valor: numeric({ precision: 12, scale: 3, mode: "string" }).notNull(),
		nsu: text(),
		autorizacao: text(),
		bandeira: text(),
		status: varchar({ length: 20 }).default("ok").notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" }).default(
			sql`CURRENT_TIMESTAMP`,
		),
	},
	(table) => [
		index("vendapdvpagamento_idvenda_idx").using(
			"btree",
			table.idvenda.asc().nullsLast().op("text_ops"),
		),
		index("vendapdvpagamento_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "vendapdvpagamento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idvenda],
			foreignColumns: [vendapdvgourmet.id],
			name: "vendapdvpagamento_idvenda_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
