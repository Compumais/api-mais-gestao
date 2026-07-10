import {
	boolean,
	foreignKey,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const configuracaoemailsmtp = pgTable(
	"configuracaoemailsmtp",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		host: varchar({ length: 200 }).notNull(),
		porta: integer().default(587).notNull(),
		seguro: boolean().default(true).notNull(),
		usuario: varchar({ length: 200 }).notNull(),
		senha: text().notNull(),
		emailremetente: varchar({ length: 200 }).notNull(),
		nomremetente: varchar({ length: 120 }),
		ativo: boolean().default(true).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("configuracaoemailsmtp_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "configuracaoemailsmtp_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
