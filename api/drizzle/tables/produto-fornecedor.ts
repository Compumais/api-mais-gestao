import {
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";
import { produtos } from "./produtos.js";

export const produtofornecedor = pgTable(
	"produtofornecedor",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		identidade: text(),
		cnpjfornecedor: varchar({ length: 14 }),
		idproduto: text().notNull(),
		codigofornecedor: varchar({ length: 60 }).notNull(),
		descricaofornecedor: varchar({ length: 120 }),
		criadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("produtofornecedor_idproduto_idx").using(
			"btree",
			table.idproduto.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "produtofornecedor_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "produtofornecedor_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "produtofornecedor_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
