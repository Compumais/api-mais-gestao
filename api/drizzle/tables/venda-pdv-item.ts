import {
	foreignKey,
	numeric,
	pgTable,
	smallint,
	text,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";
import { produtos } from "./produtos";
import { vendapdvgourmet } from "./vendas-pdv-gourmet";

export const vendapdvitem = pgTable(
	"vendapdvitem",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idvenda: text().notNull(),
		idproduto: text().notNull(),
		quantidade: numeric({ precision: 12, scale: 3 }).notNull(),
		precounitario: numeric({ precision: 12, scale: 3 }).notNull(),
		precototal: numeric({ precision: 12, scale: 3 }).notNull(),
		precopromocao: numeric({ precision: 12, scale: 3 }).notNull(),
		precoalterado: numeric({ precision: 12, scale: 3 }).notNull(),
		taxaservico: smallint().default(0), // 1=Sim, 0=Não
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "vendapdvitem_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idvenda],
			foreignColumns: [vendapdvgourmet.id],
			name: "vendapdvitem_idvenda_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "vendapdvitem_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
