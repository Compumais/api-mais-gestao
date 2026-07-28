import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { modulosSaas } from "./modulos-saas.js";
import { usuarios } from "./usuarios.js";

export const usuarioModulos = pgTable(
	"usuario_modulos",
	{
		id: text("id").primaryKey().notNull(),
		idusuario: text("idusuario").notNull(),
		idmodulo: text("idmodulo").notNull(),
		status: text("status").notNull().default("ACTIVE"),
		origem: text("origem").notNull().default("ASAAS"),
		idassinaturaasaas: text("idassinaturaasaas"),
		valor: numeric("valor", { precision: 12, scale: 2 }),
		proximovencimento: date("proximovencimento"),
		criadoem: timestamp("criadoem", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp("atualizadoem", { precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("usuario_modulos_usuario_modulo_key").on(
			table.idusuario,
			table.idmodulo,
		),
		index("usuario_modulos_idusuario_idx").on(table.idusuario),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "usuario_modulos_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idmodulo],
			foreignColumns: [modulosSaas.id],
			name: "usuario_modulos_idmodulo_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
