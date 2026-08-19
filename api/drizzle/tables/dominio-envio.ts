import {
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { notafiscal } from "./nota-fiscal.js";

export const dominioenvio = pgTable(
	"dominioenvio",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idnotafiscal: text().notNull(),
		tipo: varchar({ length: 20 }).notNull(),
		status: varchar({ length: 40 }).notNull(),
		idloteapi: varchar({ length: 80 }),
		tentativas: integer().default(0).notNull(),
		proximatentativa: timestamp({ precision: 3, mode: "string" }),
		mensagemretorno: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("dominioenvio_idnotafiscal_tipo_key").on(
			table.idnotafiscal,
			table.tipo,
		),
		index("dominioenvio_idempresa_idx").on(table.idempresa),
		index("dominioenvio_status_proxima_idx").on(
			table.status,
			table.proximatentativa,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "dominioenvio_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idnotafiscal],
			foreignColumns: [notafiscal.id],
			name: "dominioenvio_idnotafiscal_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
