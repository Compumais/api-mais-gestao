import { sql } from "drizzle-orm";
import {
	foreignKey,
	jsonb,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { cfop } from "./cfop.js";
import { empresa } from "./empresas.js";

export type CampoExtraOrdemServico = {
	campo: `extra${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16}`;
	nome: string;
	ativo: boolean;
	obrigatorio: boolean;
};

export const configuracaoordemservico = pgTable(
	"configuracaoordemservico",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		agrupafinanceiroaofaturar: smallint().default(0),
		descricao: varchar({ length: 100 }),
		descricaocampochave: varchar({ length: 50 }),
		idcfopexternaproduto: text(),
		idcfopexternaservico: text(),
		idcfopexternaservicost: text(),
		idcfopinternaproduto: text(),
		idcfopinternaservico: text(),
		idcfopinternaservicost: text(),
		idmodelnfe: text(),
		idmodelonfse: text(),
		mascaracampochave: varchar({ length: 30 }),
		mostrarcamposfinalizaritem: smallint().default(0),
		pedirprimeiroobjeto: smallint().default(0),
		tecnicoobrigatorio: smallint().default(0),
		usaarea: smallint().default(1),
		usaobjeto: smallint().default(1),
		usatipoproblema: smallint().default(1),
		usadadosveiculo: smallint().default(1),
		camposextras: jsonb("camposextras")
			.$type<CampoExtraOrdemServico[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		datacriacao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("configuracaoordemservico_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "configuracaoordemservico_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopexternaproduto],
			foreignColumns: [cfop.id],
			name: "configuracaoordemservico_idcfopexternaproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopexternaservico],
			foreignColumns: [cfop.id],
			name: "configuracaoordemservico_idcfopexternaservico_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopexternaservicost],
			foreignColumns: [cfop.id],
			name: "configuracaoordemservico_idcfopexternaservicost_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopinternaproduto],
			foreignColumns: [cfop.id],
			name: "configuracaoordemservico_idcfopinternaproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopinternaservico],
			foreignColumns: [cfop.id],
			name: "configuracaoordemservico_idcfopinternaservico_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopinternaservicost],
			foreignColumns: [cfop.id],
			name: "configuracaoordemservico_idcfopinternaservicost_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
