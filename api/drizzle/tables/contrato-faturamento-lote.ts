import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export const contratofaturamentolote = pgTable(
	"contrato_faturamento_lote",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		competencia: varchar({ length: 7 }).notNull(),
		status: varchar({ length: 30 }).notNull().default("rascunho"),
		idusuario: text().notNull(),
		observacao: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("contrato_faturamento_lote_idempresa_idx").on(table.idempresa),
		index("contrato_faturamento_lote_competencia_idx").on(table.competencia),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "contrato_faturamento_lote_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "contrato_faturamento_lote_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
