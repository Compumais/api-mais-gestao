import { sql } from "drizzle-orm";
import {
	bigint,
	char,
	date,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const cotacaocompra = pgTable(
	"cotacaocompra",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: integer().notNull(),
		titulo: varchar({ length: 120 }).notNull(),
		observacao: text(),
		status: char({ length: 1 }).notNull(), // R rascunho, A aberta, E encerrada, C cancelada
		tokenpublico: text(),
		validade: date(),
		currenttimemillis: bigint({ mode: "number" }),
	},
	(table) => [
		index("cotacaocompra_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("cotacaocompra_tokenpublico_uidx")
			.on(table.tokenpublico)
			.where(sql`${table.tokenpublico} IS NOT NULL`),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "cotacaocompra_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
