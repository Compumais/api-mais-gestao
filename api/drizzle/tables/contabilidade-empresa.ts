import {
	boolean,
	foreignKey,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const contabilidadeempresa = pgTable(
	"contabilidadeempresa",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 200 }).notNull(),
		cnpj: varchar({ length: 18 }),
		emailprincipal: varchar({ length: 200 }).notNull(),
		emailsadicionais: jsonb().$type<string[] | null>(),
		ativo: boolean().default(true).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("contabilidadeempresa_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "contabilidadeempresa_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
