import {
	bigint,
	foreignKey,
	index,
	pgTable,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { cotacaocompra } from "./cotacao-compra.js";

export const cotacaocompraproposta = pgTable(
	"cotacaocompraproposta",
	{
		id: text().primaryKey().notNull(),
		idcotacao: text().notNull(),
		nome: varchar({ length: 120 }).notNull(),
		telefone: varchar({ length: 20 }).notNull(),
		currenttimemillis: bigint({ mode: "number" }),
	},
	(table) => [
		index("cotacaocompraproposta_cotacao_idx").using(
			"btree",
			table.idcotacao.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("cotacaocompraproposta_cotacao_telefone_uidx").on(
			table.idcotacao,
			table.telefone,
		),
		foreignKey({
			columns: [table.idcotacao],
			foreignColumns: [cotacaocompra.id],
			name: "cotacaocompraproposta_idcotacao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
