import { sql } from "drizzle-orm";
import {
	boolean,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const modulosSaas = pgTable(
	"modulos_saas",
	{
		id: text("id").primaryKey().notNull(),
		codigo: text("codigo").notNull(),
		nome: text("nome").notNull(),
		descricao: text("descricao"),
		valormensal: numeric("valormensal", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		ativo: boolean("ativo").notNull().default(true),
		criadoem: timestamp("criadoem", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp("atualizadoem", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [uniqueIndex("modulos_saas_codigo_key").on(table.codigo)],
);
