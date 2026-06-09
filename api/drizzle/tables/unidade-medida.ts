import { bigint, foreignKey, index, pgTable, smallint, text, varchar } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const unidademedida = pgTable(
	"unidademedida",
	{
		id: text().primaryKey().notNull(), // ID da unidade de medida
		idempresa: text().notNull(), // ID da empresa
		casasdecimais: smallint(), // Casas decimais
		codigo: varchar({ length: 6 }), // Código
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		nome: varchar({ length: 50 }), // Descrição
		tipovalor: smallint(), // Tipo de valor
	},
	(table) => [
		index("unidademedida_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("unidademedida_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "unidademedida_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);