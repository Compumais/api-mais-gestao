import {
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { cotacaocompraitem } from "./cotacao-compra-item.js";
import { pedidocompra } from "./pedido-compra.js";
import { produtos } from "./produtos.js";

export const pedidocompraitem = pgTable(
	"pedidocompraitem",
	{
		id: text().primaryKey().notNull(),
		idpedidocompra: text().notNull(),
		idproduto: text(),
		descricao: varchar({ length: 120 }),
		quantidade: numeric({ precision: 18, scale: 6 }).notNull(),
		precounitario: numeric({ precision: 12, scale: 2 }).notNull(),
		total: numeric({ precision: 12, scale: 2 }).notNull(),
		idcotacaoitem: text(),
	},
	(table) => [
		index("pedidocompraitem_pedido_idx").using(
			"btree",
			table.idpedidocompra.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idpedidocompra],
			foreignColumns: [pedidocompra.id],
			name: "pedidocompraitem_idpedidocompra_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "pedidocompraitem_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idcotacaoitem],
			foreignColumns: [cotacaocompraitem.id],
			name: "pedidocompraitem_idcotacaoitem_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
