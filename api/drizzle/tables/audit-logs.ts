import { sql } from "drizzle-orm";
import {
	foreignKey,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios";

export const auditLogs = pgTable(
	"audit_logs",
	{
		id: text().primaryKey().notNull(),
		acao: text().notNull(),
		recurso: text().notNull(),
		idrecurso: text(),
		idusuario: text(),
		idempresa: text(),
		metadados: jsonb(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "audit_logs_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
