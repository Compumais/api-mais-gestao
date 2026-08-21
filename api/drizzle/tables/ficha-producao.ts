import {
	bigint,
	foreignKey,
	index,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { empresa } from "./empresas.js";
import { produtos } from "./produtos.js";

export const fichaproducao = pgTable(
	"fichaproducao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idprodutoacabado: text().notNull(),
		ativo: smallint().default(1).notNull(),
		permiteproducaomassa: smallint().default(0).notNull(),
		producaonavenda: smallint().default(0).notNull(),
		observacao: text(),
		currenttimemillis: bigint({ mode: "number" }),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("fichaproducao_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("fichaproducao_produto_idx").using(
			"btree",
			table.idprodutoacabado.asc().nullsLast().op("text_ops"),
		),
		uniqueIndex("fichaproducao_empresa_produto_ativo_uidx")
			.on(table.idempresa, table.idprodutoacabado)
			.where(sql`${table.ativo} = 1`),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "fichaproducao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idprodutoacabado],
			foreignColumns: [produtos.id],
			name: "fichaproducao_idprodutoacabado_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
