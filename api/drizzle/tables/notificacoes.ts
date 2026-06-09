import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";
import { usuarios } from "./usuarios";

export const notificacoes = pgTable(
	"notificacoes",
	{
		id: text().primaryKey().notNull(),
		idusuario: text("idusuario")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
		idempresa: text("idempresa")
			.notNull()
			.references(() => empresa.id, { onDelete: "cascade" }),
		tipo: varchar("tipo", { length: 50 }).notNull(),
		idrecurso: text("idrecurso"),
		titulo: text("titulo").notNull(),
		detalhes: jsonb("detalhes").$type<Record<string, unknown>>(),
		lida: boolean("lida").default(false).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("notificacoes_idusuario_idx").on(table.idusuario),
		index("notificacoes_idusuario_lida_idx").on(table.idusuario, table.lida),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "notificacoes_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "notificacoes_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
