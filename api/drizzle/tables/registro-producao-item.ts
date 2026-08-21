import {
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
} from "drizzle-orm/pg-core";
import { produtos } from "./produtos.js";
import { registroproducao } from "./registro-producao.js";

const numeric186 = numeric({ precision: 18, scale: 6, mode: "string" });
const numeric2110 = numeric({ precision: 21, scale: 10, mode: "string" });

export const registroproducaoitem = pgTable(
	"registroproducaoitem",
	{
		id: text().primaryKey().notNull(),
		idregistroproducao: text().notNull(),
		idproduto: text().notNull(),
		/** 0 = consumo, 1 = produção */
		tipo: smallint().notNull(),
		quantidade: numeric186.notNull(),
		custounitario: numeric2110,
		custototal: numeric2110,
	},
	(table) => [
		index("registroproducaoitem_registro_idx").using(
			"btree",
			table.idregistroproducao.asc().nullsLast().op("text_ops"),
		),
		index("registroproducaoitem_produto_idx").using(
			"btree",
			table.idproduto.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idregistroproducao],
			foreignColumns: [registroproducao.id],
			name: "registroproducaoitem_idregistroproducao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "registroproducaoitem_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
