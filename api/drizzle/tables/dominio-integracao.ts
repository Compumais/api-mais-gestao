import {
	boolean,
	foreignKey,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const dominiointegracao = pgTable(
	"dominiointegracao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		habilitado: boolean().default(false).notNull(),
		chavecontador: text(),
		integrationkey: text(),
		boxefile: boolean().default(false).notNull(),
		nomeescritorio: varchar({ length: 200 }),
		nomecliente: varchar({ length: 200 }),
		cnpjcliente: varchar({ length: 18 }),
		ultimoerro: text(),
		ativadoem: timestamp({ precision: 3, mode: "string" }),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("dominiointegracao_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "dominiointegracao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
