import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export type BiParametroDefinicao = {
	nome: string;
	tipo?: "date" | "text" | "number";
	padrao?: string;
};

export const biConsultas = pgTable(
	"bi_consultas",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 120 }).notNull(),
		descricao: text(),
		sql: text().notNull(),
		parametros: jsonb("parametros")
			.$type<BiParametroDefinicao[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		origem: varchar({ length: 20 }).default("personalizada").notNull(),
		criadopor: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("bi_consultas_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "bi_consultas_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.criadopor],
			foreignColumns: [usuarios.id],
			name: "bi_consultas_criadopor_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
