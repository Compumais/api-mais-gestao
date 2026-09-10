import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const marca = pgTable(
	"marca",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 120 }).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("marca_idempresa_idx").on(table.idempresa),
		uniqueIndex("marca_empresa_nome_uidx").on(table.idempresa, table.nome),
		foreignKey({ columns: [table.idempresa], foreignColumns: [empresa.id] })
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
