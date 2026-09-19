import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { produtos } from "./produtos.js";

export const produtoimagem = pgTable(
	"produtoimagem",
	{
		id: text().primaryKey().notNull(),
		idproduto: text().notNull(),
		idempresa: text().notNull(),
		ordem: integer().default(0).notNull(),
		principal: boolean().default(false).notNull(),
		nomearquivo: varchar({ length: 255 }),
		tipomime: varchar({ length: 50 }),
		tamanho: integer(),
		referencia: varchar({ length: 255 }).notNull(),
		chavearmazenamento: varchar({ length: 255 }),
		origem: varchar({ length: 20 }).default("gerenciada").notNull(),
		criadoem: timestamp({ withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		atualizadoem: timestamp({ withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("produtoimagem_produto_ordem_idx").on(table.idproduto, table.ordem),
		index("produtoimagem_empresa_idx").on(table.idempresa),
		uniqueIndex("produtoimagem_principal_unica_idx")
			.on(table.idproduto)
			.where(sql`${table.principal} = true`),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "produtoimagem_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "produtoimagem_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
