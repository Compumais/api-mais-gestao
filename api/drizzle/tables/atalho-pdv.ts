import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { produtos } from "./produtos.js";
import { usuarios } from "./usuarios.js";

export const atalhopdv = pgTable(
	"atalhopdv",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idusuario: text().notNull(),
		idproduto: text().notNull(),
		ordem: integer().default(0).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("atalhopdv_idempresa_idusuario_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
			table.idusuario.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("atalhopdv_empresa_usuario_produto_key").on(
			table.idempresa,
			table.idusuario,
			table.idproduto,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "atalhopdv_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "atalhopdv_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "atalhopdv_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
