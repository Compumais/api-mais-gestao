import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	jsonb,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { produtos } from "./produtos.js";
import { unidademedida } from "./unidade-medida.js";
import { usuarios } from "./usuarios.js";

const criadoEm = () =>
	timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull();

export const produtoEan = pgTable(
	"produto_ean",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idproduto: text().notNull(),
		idunidademedida: text(),
		ean: varchar({ length: 14 }).notNull(),
		fator: numeric({ precision: 18, scale: 6, mode: "string" }),
		tipo: varchar({ length: 20 }).default("alternativo").notNull(),
		principal: smallint().default(0).notNull(),
		criadoem: criadoEm(),
	},
	(table) => [
		index("produto_ean_empresa_idx").on(table.idempresa),
		index("produto_ean_produto_idx").on(table.idproduto),
		uniqueIndex("produto_ean_empresa_ean_uidx").on(table.idempresa, table.ean),
		foreignKey({ columns: [table.idempresa], foreignColumns: [empresa.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({ columns: [table.idproduto], foreignColumns: [produtos.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idunidademedida],
			foreignColumns: [unidademedida.id],
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const tabelaPreco = pgTable(
	"tabela_preco",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 120 }).notNull(),
		ativo: smallint().default(1).notNull(),
		iniciovigencia: timestamp({ precision: 3, mode: "string" }),
		fimvigencia: timestamp({ precision: 3, mode: "string" }),
		criadoem: criadoEm(),
	},
	(table) => [
		index("tabela_preco_empresa_idx").on(table.idempresa),
		foreignKey({ columns: [table.idempresa], foreignColumns: [empresa.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const tabelaPrecoItem = pgTable(
	"tabela_preco_item",
	{
		id: text().primaryKey().notNull(),
		idtabelapreco: text().notNull(),
		idproduto: text().notNull(),
		preco: numeric({ precision: 15, scale: 4, mode: "string" }).notNull(),
		precominimo: numeric("preco_minimo", {
			precision: 15,
			scale: 4,
			mode: "string",
		}),
		precopromocional: numeric("preco_promocional", {
			precision: 15,
			scale: 4,
			mode: "string",
		}),
		criadoem: criadoEm(),
	},
	(table) => [
		index("tabela_preco_item_produto_idx").on(table.idproduto),
		uniqueIndex("tabela_preco_item_tabela_produto_uidx").on(
			table.idtabelapreco,
			table.idproduto,
		),
		foreignKey({
			columns: [table.idtabelapreco],
			foreignColumns: [tabelaPreco.id],
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({ columns: [table.idproduto], foreignColumns: [produtos.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const produtoHistorico = pgTable(
	"produto_historico",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idproduto: text().notNull(),
		idusuario: text(),
		ip: varchar({ length: 64 }),
		acao: varchar({ length: 40 }).notNull(),
		antes: jsonb(),
		depois: jsonb(),
		criadoem: criadoEm(),
	},
	(table) => [
		index("produto_historico_empresa_data_idx").on(
			table.idempresa,
			table.criadoem,
		),
		index("produto_historico_produto_idx").on(table.idproduto),
		foreignKey({ columns: [table.idempresa], foreignColumns: [empresa.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({ columns: [table.idproduto], foreignColumns: [produtos.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({ columns: [table.idusuario], foreignColumns: [usuarios.id] })
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const produtoKitItem = pgTable(
	"produto_kit_item",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idprodutokit: text().notNull(),
		idprodutocomponente: text().notNull(),
		quantidade: numeric({ precision: 18, scale: 6, mode: "string" }).notNull(),
		criadoem: criadoEm(),
	},
	(table) => [
		index("produto_kit_item_empresa_idx").on(table.idempresa),
		index("produto_kit_item_componente_idx").on(table.idprodutocomponente),
		uniqueIndex("produto_kit_item_kit_componente_uidx").on(
			table.idprodutokit,
			table.idprodutocomponente,
		),
		foreignKey({ columns: [table.idempresa], foreignColumns: [empresa.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({ columns: [table.idprodutokit], foreignColumns: [produtos.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idprodutocomponente],
			foreignColumns: [produtos.id],
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);

export const produtoUnidadeConversao = pgTable(
	"produto_unidade_conversao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idproduto: text().notNull(),
		idunidademedida: text().notNull(),
		fator: numeric({ precision: 18, scale: 6, mode: "string" }).notNull(),
		operacao: varchar({ length: 10 }).default("multiplica").notNull(),
		criadoem: criadoEm(),
	},
	(table) => [
		index("produto_unidade_conversao_empresa_idx").on(table.idempresa),
		uniqueIndex("produto_unidade_conversao_produto_unidade_uidx").on(
			table.idproduto,
			table.idunidademedida,
		),
		foreignKey({ columns: [table.idempresa], foreignColumns: [empresa.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({ columns: [table.idproduto], foreignColumns: [produtos.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idunidademedida],
			foreignColumns: [unidademedida.id],
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
