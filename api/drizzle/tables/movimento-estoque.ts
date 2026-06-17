import {
	bigint,
	date,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	serial,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { localestoque } from "./local-estoque.js";
import { produtos } from "./produtos.js";

const numeric156 = numeric({ precision: 15, scale: 6, mode: "string" });
const numeric122 = numeric({ precision: 12, scale: 2, mode: "string" });

export const movimentoestoque = pgTable(
	"movimentoestoque",
	{
		id: serial().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(),
		cancelado: smallint(), // Identifica se o movimento esta cancelado
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		custoaquisicao: numeric156, // Custo de aquisição
		customedio: numeric156, // Custo médio do produto
		custototal: numeric122, // Custo total da movimentação
		data: date(), // Data do movimento
		datahora: timestamp({ precision: 3, mode: "string" }), // Data hora da movimentação
		// idfilial: bigint({ mode: "number" }), // ID da filial
		iditemoriginal: text(), // ID do item original
		idlocalestoque: text(), // ID do local de estoque
		idlote: text(), // ID do lote
		idoriginal: text(), // ID da operação original
		idproduto: text(), // ID do produto
		observacao: varchar({ length: 50 }), // Observação da movimentação
		pontoequilibrio: numeric156, // Ponto de equilíbrio
		precocusto: numeric156, // Custo do produto
		precoultimacompra: numeric122, // Valor do preço na última compra
		quantidadeentrada: numeric156, // Quantidade entrada
		quantidadesaida: numeric156, // Quantidade saída
		tipodocumento: smallint(), // Tipo de documento: 0=Pdv 1=NotaFiscal 2=Acerto
		valortotal: numeric122, // Valor total da movimentação
		variacao: integer(), // Código da variação
	},
	(table) => [
		index("movimentoestoque_idproduto_idx").using(
			"btree",
			table.idproduto.asc().nullsLast().op("text_ops"),
		),
		index("movimentoestoque_idlocalestoque_idx").using(
			"btree",
			table.idlocalestoque.asc().nullsLast().op("text_ops"),
		),
		index("movimentoestoque_idoriginal_idx").using(
			"btree",
			table.idoriginal.asc().nullsLast().op("text_ops"),
		),
		index("movimentoestoque_iditemoriginal_idx").using(
			"btree",
			table.iditemoriginal.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "movimentoestoque_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "movimentoestoque_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idlocalestoque],
			foreignColumns: [localestoque.id],
			name: "movimentoestoque_idlocalestoque_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
