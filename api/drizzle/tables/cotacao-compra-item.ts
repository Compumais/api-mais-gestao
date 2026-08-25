import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { cotacaocompra } from "./cotacao-compra.js";
import { produtos } from "./produtos.js";

export const cotacaocompraitem = pgTable(
	"cotacaocompraitem",
	{
		id: text().primaryKey().notNull(),
		idcotacao: text().notNull(),
		idproduto: text(),
		descricao: varchar({ length: 120 }),
		quantidade: numeric({ precision: 18, scale: 6 }).notNull(),
		unidademedida: varchar({ length: 6 }),
		observacao: text(),
		ordem: smallint().default(0).notNull(),
	},
	(table) => [
		index("cotacaocompraitem_cotacao_idx").using(
			"btree",
			table.idcotacao.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("cotacaocompraitem_cotacao_produto_uidx")
			.on(table.idcotacao, table.idproduto)
			.where(sql`${table.idproduto} IS NOT NULL`),
		foreignKey({
			columns: [table.idcotacao],
			foreignColumns: [cotacaocompra.id],
			name: "cotacaocompraitem_idcotacao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "cotacaocompraitem_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
