import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { contrato } from "./contrato.js";
import { contratofaturamentolote } from "./contrato-faturamento-lote.js";
import { empresa } from "./empresas.js";
import { financeiro } from "./financeiro.js";
import { notafiscal } from "./nota-fiscal.js";

export const contratocobranca = pgTable(
	"contrato_cobranca",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcontrato: text().notNull(),
		idlote: text(),
		competencia: varchar({ length: 7 }).notNull(),
		valor: numeric({ precision: 12, scale: 2 }).notNull(),
		vencimento: date().notNull(),
		fluxofaturamento: smallint().notNull(),
		discriminacao: text(),
		statusfaturamento: varchar({ length: 40 }).notNull().default("elegivel"),
		etapaatual: varchar({ length: 60 }),
		ultimoerro: text(),
		tentativas: integer().notNull().default(0),
		idnotafiscal: text(),
		idfinanceiro: text(),
		idremessaitem: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("contrato_cobranca_empresa_contrato_competencia_uidx").on(
			table.idempresa,
			table.idcontrato,
			table.competencia,
		),
		index("contrato_cobranca_idlote_idx").on(table.idlote),
		index("contrato_cobranca_status_idx").on(table.statusfaturamento),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "contrato_cobranca_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontrato],
			foreignColumns: [contrato.id],
			name: "contrato_cobranca_idcontrato_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idlote],
			foreignColumns: [contratofaturamentolote.id],
			name: "contrato_cobranca_idlote_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idnotafiscal],
			foreignColumns: [notafiscal.id],
			name: "contrato_cobranca_idnotafiscal_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idfinanceiro],
			foreignColumns: [financeiro.id],
			name: "contrato_cobranca_idfinanceiro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
