import {
	foreignKey,
	index,
	pgTable,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { bancoimagemproduto } from "./banco-imagem-produto.js";

export const bancoimagemcodigo = pgTable(
	"bancoimagemcodigo",
	{
		id: text().primaryKey().notNull(),
		idproduto: text().notNull(),
		codigo: varchar({ length: 14 }).notNull(),
	},
	(table) => [
		uniqueIndex("bancoimagemcodigo_codigo_unico_idx").on(table.codigo),
		index("bancoimagemcodigo_idproduto_idx").on(table.idproduto),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [bancoimagemproduto.id],
			name: "bancoimagemcodigo_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
