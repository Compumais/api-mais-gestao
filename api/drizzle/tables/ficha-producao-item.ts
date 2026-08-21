import {
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { fichaproducao } from "./ficha-producao.js";
import { produtos } from "./produtos.js";

const numeric186 = numeric({ precision: 18, scale: 6, mode: "string" });

export const fichaproducaoitem = pgTable(
	"fichaproducaoitem",
	{
		id: text().primaryKey().notNull(),
		idfichaproducao: text().notNull(),
		idproduto: text().notNull(),
		quantidade: numeric186.notNull(),
		ordem: smallint().default(0).notNull(),
	},
	(table) => [
		index("fichaproducaoitem_ficha_idx").using(
			"btree",
			table.idfichaproducao.asc().nullsLast().op("text_ops"),
		),
		index("fichaproducaoitem_produto_idx").using(
			"btree",
			table.idproduto.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("fichaproducaoitem_ficha_produto_uidx").on(
			table.idfichaproducao,
			table.idproduto,
		),
		foreignKey({
			columns: [table.idfichaproducao],
			foreignColumns: [fichaproducao.id],
			name: "fichaproducaoitem_idfichaproducao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "fichaproducaoitem_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
