import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { contacorrente } from "./conta-corrente.js";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export const remessabancaria = pgTable(
	"remessa_bancaria",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcontacorrente: text().notNull(),
		sequencia: integer().notNull(),
		layout: varchar({ length: 40 }).notNull().default("cnab240"),
		status: varchar({ length: 20 }).notNull().default("aberta"),
		nomearquivo: varchar({ length: 120 }),
		conteudo: text(),
		idusuario: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		enviadaem: timestamp({ precision: 3, mode: "string" }),
	},
	(table) => [
		index("remessa_bancaria_idempresa_idx").on(table.idempresa),
		index("remessa_bancaria_conta_status_idx").on(
			table.idcontacorrente,
			table.status,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "remessa_bancaria_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontacorrente],
			foreignColumns: [contacorrente.id],
			name: "remessa_bancaria_idcontacorrente_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "remessa_bancaria_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
