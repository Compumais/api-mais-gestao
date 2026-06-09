import { sql } from "drizzle-orm";
import { foreignKey, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";
import { usuarios } from "./usuarios";

export const usuarioEmpresa = pgTable(
	"usuario_empresas",
	{
		id: text().primaryKey().notNull(),
		idusuario: text().notNull(),
		idempresa: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "usuario_empresas_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "usuario_empresas_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
