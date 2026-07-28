import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { cfop } from "./cfop.js";
import { empresa } from "./empresas.js";
import { ordemservico } from "./ordem-servico.js";
import { produtos } from "./produtos.js";
import { usuarios } from "./usuarios.js";

export const ordemservicoitem = pgTable(
	"ordemservicoitem",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		acrescimo: numeric({ precision: 12, scale: 2 }),
		acrescimoalteracao: numeric({ precision: 12, scale: 2 }),
		aliquota: numeric({ precision: 12, scale: 2 }),
		altura: numeric({ precision: 10, scale: 2 }),
		brinde: smallint().default(0),
		cancelado: smallint().default(0),
		cfop: varchar({ length: 20 }),
		codigodav: text(),
		codigorproduto: varchar({ length: 20 }),
		comprimento: numeric({ precision: 10, scale: 2 }),
		contador: integer(),
		datahora: timestamp({ precision: 3, mode: "string" }),
		datahorafinalservico: timestamp({ precision: 3, mode: "string" }),
		datahorainicialservico: timestamp({ precision: 3, mode: "string" }),
		datainclusao: timestamp({ precision: 3, mode: "string" }),
		decimaispreco: smallint(),
		decimaisquantidade: smallint(),
		desconto: numeric({ precision: 12, scale: 2 }),
		descontoalteracao: numeric({ precision: 12, scale: 2 }),
		descontoclienteprodutoaplicado: smallint(),
		descontopromocao: numeric({ precision: 12, scale: 2 }),
		descontosubtotal: numeric({ precision: 12, scale: 2 }),
		fatorconversao: numeric({ precision: 15, scale: 6 }),
		hash: text(),
		hashpafnfce: text(),
		idcfop: text(),
		idembalagem: text(),
		identidadedesconto: text(),
		iditemkitpai: text(),
		idlocalestoque: text(),
		idlote: text(),
		idmotivodesconto: text(),
		idordemservico: text().notNull(),
		idproduto: text(),
		idprodutokit: text(),
		idpromocao: text(),
		idsupervisorvenda: text(),
		idtecnico: text(),
		idunidademedida: text(),
		idusuariodesconto: text(),
		informacaoadicional: varchar({ length: 500 }),
		largura: numeric({ precision: 10, scale: 2 }),
		nomeproduto: varchar({ length: 120 }),
		numeroitempedidocompra: varchar({ length: 6 }),
		numeropedidocompra: varchar({ length: 15 }),
		numeroserie: varchar({ length: 40 }),
		observacao: text(),
		pautopreco: smallint(),
		percentualdesconto: numeric({ precision: 12, scale: 2 }),
		preco: numeric({ precision: 15, scale: 6 }),
		precoinformado: numeric({ precision: 15, scale: 6 }),
		precominimovenda: numeric({ precision: 12, scale: 2 }),
		precooriginal: numeric({ precision: 15, scale: 6 }),
		quantidade: numeric({ precision: 15, scale: 6 }),
		quantidadehora: varchar({ length: 5 }),
		quantidadepeca: text(),
		situacaotributaria: varchar({ length: 7 }),
		tipokit: smallint(),
		tipovalordesconto: smallint(),
		total: numeric({ precision: 12, scale: 3 }),
		unidademedida: varchar({ length: 6 }),
		variacoes: varchar({ length: 256 }),
		datacriacao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("ordemservicoitem_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("ordemservicoitem_idordemservico_idx").using(
			"btree",
			table.idordemservico.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "ordemservicoitem_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfop],
			foreignColumns: [cfop.id],
			name: "ordemservicoitem_idcfop_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idordemservico],
			foreignColumns: [ordemservico.id],
			name: "ordemservicoitem_idordemservico_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idtecnico],
			foreignColumns: [usuarios.id],
			name: "ordemservicoitem_idtecnico_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariodesconto],
			foreignColumns: [usuarios.id],
			name: "ordemservicoitem_idusuariodesconto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idsupervisorvenda],
			foreignColumns: [usuarios.id],
			name: "ordemservicoitem_idsupervisorvenda_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "ordemservicoitem_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
