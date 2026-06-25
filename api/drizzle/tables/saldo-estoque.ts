import {
	bigint,
	date,
	index,
	integer,
	numeric,
	pgTable,
	serial,
	text,
	varchar,
} from "drizzle-orm/pg-core";

const numeric186 = () => numeric({ precision: 18, scale: 6, mode: "string" });

export const saldoestoque = pgTable(
	"saldoestoque",
	{
		id: serial().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(),
		cest: varchar({ length: 10 }), // Código do CEST
		cnpjfilial: varchar({ length: 18 }), // CNPJ da filial
		codigoproduto: varchar({ length: 20 }), // Código do produto
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		hash: bigint({ mode: "number" }), // Hash para controle de alteração
		idfilial: bigint({ mode: "number" }), // ID da filial
		idproduto: bigint({ mode: "number" }), // ID do produto
		ncm: varchar({ length: 10 }), // Nomenclatura Comum do Mercosul
		nomeproduto: varchar({ length: 120 }), // Nome do produto
		quantidade: numeric186(), // Quantidade em estoque
		quantidadefiscal: numeric186().default("0").notNull(),
		ultimaalteracao: date(), // Data do último movimento
		unidademedida: varchar({ length: 6 }), // Unidade de medida
		variacao: integer(), // Código da variação
	},
	(table) => [
		index("saldoestoque_idproduto_idx").using(
			"btree",
			table.idproduto.asc().nullsLast().op("int8_ops"),
		),
		index("saldoestoque_idfilial_idx").using(
			"btree",
			table.idfilial.asc().nullsLast().op("int8_ops"),
		),
	],
);
