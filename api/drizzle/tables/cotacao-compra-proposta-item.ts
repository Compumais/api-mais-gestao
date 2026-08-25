import {
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { cotacaocompraitem } from "./cotacao-compra-item.js";
import { cotacaocompraproposta } from "./cotacao-compra-proposta.js";

export const cotacaocomprapropostaitem = pgTable(
	"cotacaocomprapropostaitem",
	{
		id: text().primaryKey().notNull(),
		idproposta: text().notNull(),
		idcotacaoitem: text().notNull(),
		precounitario: numeric({ precision: 12, scale: 2 }).notNull(),
	},
	(table) => [
		index("cotacaocomprapropostaitem_proposta_idx").using(
			"btree",
			table.idproposta.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("cotacaocomprapropostaitem_proposta_item_uidx").on(
			table.idproposta,
			table.idcotacaoitem,
		),
		foreignKey({
			columns: [table.idproposta],
			foreignColumns: [cotacaocompraproposta.id],
			name: "cotacaocomprapropostaitem_idproposta_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcotacaoitem],
			foreignColumns: [cotacaocompraitem.id],
			name: "cotacaocomprapropostaitem_idcotacaoitem_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
