import { sql } from "drizzle-orm";
import {
	boolean,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const featuresSaas = pgTable(
	"features_saas",
	{
		id: text("id").primaryKey().notNull(),
		codigo: text("codigo").notNull(),
		nome: text("nome").notNull(),
		descricao: text("descricao"),
		ativo: boolean("ativo").notNull().default(true),
		criadoem: timestamp("criadoem", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp("atualizadoem", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [uniqueIndex("features_saas_codigo_key").on(table.codigo)],
);
