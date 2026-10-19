import { sql } from "drizzle-orm";
import {
	foreignKey,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const configuracaopdv = pgTable(
	"configuracao_pdv",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		modeloatendimento: varchar({ length: 10 }).default("mesa").notNull(),
		etiquetabalancahabilitada: smallint().default(0).notNull(),
		etiquetabalancaprefixo: varchar({ length: 1 }).default("2").notNull(),
		etiquetabalancadigitoscodigo: smallint().default(4).notNull(),
		etiquetabalancaconteudo: varchar({ length: 10 }).default("preco").notNull(),
		etiquetabalancacentavos: smallint().default(1).notNull(),
		etiquetabalancaindicadoruso: smallint().default(0).notNull(),
		vendasemestoque: smallint().default(0).notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("configuracao_pdv_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "configuracao_pdv_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
