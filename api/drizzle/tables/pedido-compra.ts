import {
	bigint,
	char,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { cotacaocompra } from "./cotacao-compra.js";
import { cotacaocompraproposta } from "./cotacao-compra-proposta.js";
import { empresa } from "./empresas.js";

export const pedidocompra = pgTable(
	"pedidocompra",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: integer().notNull(),
		idcotacao: text(),
		idproposta: text(),
		fornecedornome: varchar({ length: 120 }).notNull(),
		fornecedortelefone: varchar({ length: 20 }).notNull(),
		valortotal: numeric({ precision: 12, scale: 2 }).notNull(),
		status: char({ length: 1 }).notNull(), // A aberto, C cancelado
		observacao: text(),
		currenttimemillis: bigint({ mode: "number" }),
	},
	(table) => [
		index("pedidocompra_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "pedidocompra_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcotacao],
			foreignColumns: [cotacaocompra.id],
			name: "pedidocompra_idcotacao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idproposta],
			foreignColumns: [cotacaocompraproposta.id],
			name: "pedidocompra_idproposta_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
