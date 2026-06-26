import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const empresanfesync = pgTable(
	"empresanfesync",
	{
		idempresa: text().primaryKey().notNull(),
		ultimonsu: varchar({ length: 15 }).default("0").notNull(),
		maxnsu: varchar({ length: 15 }),
		ultimosync: timestamp({ precision: 3, mode: "string" }),
		proximotentativa: timestamp({ precision: 3, mode: "string" }),
		sincronizando: boolean().default(false).notNull(),
		importacaoautomatica: boolean().default(false).notNull(),
		tentativasbackoff: integer().default(0).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "empresanfesync_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
