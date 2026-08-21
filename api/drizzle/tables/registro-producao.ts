import {
	bigint,
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { empresa } from "./empresas.js";
import { fichaproducao } from "./ficha-producao.js";
import { produtos } from "./produtos.js";
import { usuarios } from "./usuarios.js";

const numeric186 = numeric({ precision: 18, scale: 6, mode: "string" });
const numeric2110 = numeric({ precision: 21, scale: 10, mode: "string" });

export const registroproducao = pgTable(
	"registroproducao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idfichaproducao: text().notNull(),
		idprodutoacabado: text().notNull(),
		/** 0 = massa, 1 = venda */
		origem: smallint().notNull(),
		quantidadeproduzida: numeric186.notNull(),
		custototal: numeric2110,
		custounitario: numeric2110,
		/** Id da venda PDV ou NF quando origem = venda */
		idoriginal: text(),
		/** Tipo de estoque afetado (0 operacional, 1 fiscal, 2 ambos) */
		tipoestoque: smallint().notNull(),
		idusuario: text(),
		/** 1 = ativo, 0 = estornado */
		status: smallint().default(1).notNull(),
		datahora: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		currenttimemillis: bigint({ mode: "number" }),
	},
	(table) => [
		index("registroproducao_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("registroproducao_ficha_idx").using(
			"btree",
			table.idfichaproducao.asc().nullsLast().op("text_ops"),
		),
		index("registroproducao_produto_idx").using(
			"btree",
			table.idprodutoacabado.asc().nullsLast().op("text_ops"),
		),
		index("registroproducao_idoriginal_idx").using(
			"btree",
			table.idoriginal.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "registroproducao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idfichaproducao],
			foreignColumns: [fichaproducao.id],
			name: "registroproducao_idfichaproducao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idprodutoacabado],
			foreignColumns: [produtos.id],
			name: "registroproducao_idprodutoacabado_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "registroproducao_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
