import { sql } from "drizzle-orm";
import {
	foreignKey,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios.js";

export const empresa = pgTable(
	"empresas",
	{
		id: text().primaryKey().notNull(),
		nome: text().notNull(),
		cnpj: text().notNull(),
		telefone: text().notNull(),
		email: text().default("").notNull(),
		endereco: text().default("").notNull(),
		idproprietario: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
		prazocartaocredito: integer().default(30).notNull(),
		prazocartaodebito: integer().default(1).notNull(),
	},
	(table) => [
		uniqueIndex("empresas_cnpj_key").using(
			"btree",
			table.cnpj.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idproprietario],
			foreignColumns: [usuarios.id],
			name: "empresas_idproprietario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
