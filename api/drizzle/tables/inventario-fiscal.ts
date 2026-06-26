import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { produtos } from "./produtos.js";

export const inventariofiscal = pgTable(
	"inventariofiscal",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		databaixa: date().notNull(),
		idproduto: text(),
		codigoproduto: varchar({ length: 20 }).notNull(),
		quantidade: numeric({ precision: 18, scale: 6, mode: "string" }).notNull(),
		valorunitario: numeric({ precision: 15, scale: 6, mode: "string" }).notNull(),
		valortotal: numeric({ precision: 15, scale: 2, mode: "string" }).notNull(),
		codigoposse: varchar({ length: 1 }).default("1").notNull(),
		cnpjpossuidor: varchar({ length: 18 }),
		inscricaoestadualpossuidor: varchar({ length: 20 }),
		ufpossuidor: varchar({ length: 2 }),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("inventariofiscal_idempresa_databaixa_idx").on(
			table.idempresa,
			table.databaixa,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "inventariofiscal_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "inventariofiscal_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
