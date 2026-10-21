import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const configfinanceiroempresa = pgTable(
	"config_financeiro_empresa",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		competenciadataref: varchar({ length: 20 })
			.default("emissao")
			.notNull(),
		percentualtoleranciaorcamentocc: numeric({ precision: 5, scale: 2 }).default(
			"0",
		),
		bloqueardespesaacimaorcamento: boolean().default(false),
		currenttimemillis: integer(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("config_financeiro_empresa_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "config_financeiro_empresa_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
