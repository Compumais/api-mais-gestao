import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { biConsultas } from "./bi-consulta.js";
import { empresa } from "./empresas.js";

export type BiTipoGrafico =
	| "kpi"
	| "barra"
	| "linha"
	| "area"
	| "pizza"
	| "tabela";

export type BiFormatoValor = "moeda" | "numero" | "percentual";

export type BiSerieConfig = {
	coluna: string;
	label?: string;
	cor?: string;
};

export type BiMapeamentoGrafico = {
	eixoX?: string;
	series?: BiSerieConfig[];
	colunaValor?: string;
	formato?: BiFormatoValor;
};

export const biWidgets = pgTable(
	"bi_widgets",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		idempresa: text().notNull(),
		idconsulta: uuid().notNull(),
		titulo: varchar({ length: 120 }).notNull(),
		subtitulo: varchar({ length: 200 }),
		tipografico: varchar({ length: 20 })
			.$type<BiTipoGrafico>()
			.default("tabela")
			.notNull(),
		mapeamento: jsonb("mapeamento")
			.$type<BiMapeamentoGrafico>()
			.default(sql`'{}'::jsonb`)
			.notNull(),
		cachettlsegundos: integer().default(300).notNull(),
		codigocatalogo: varchar({ length: 80 }),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("bi_widgets_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("bi_widgets_idconsulta_idx").using("btree", table.idconsulta.asc()),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "bi_widgets_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idconsulta],
			foreignColumns: [biConsultas.id],
			name: "bi_widgets_idconsulta_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
