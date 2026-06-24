import { sql } from "drizzle-orm";
import {
	boolean,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const informativos = pgTable("informativos", {
	id: text("id").primaryKey().notNull(),
	titulo: text("titulo").notNull(),
	conteudo: text("conteudo").notNull(),
	publicado: boolean("publicado").default(true).notNull(),
	publicadoem: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	criadoem: timestamp({ precision: 3, mode: "string" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
});
