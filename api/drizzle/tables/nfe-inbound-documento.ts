import { sql } from "drizzle-orm";
import {
	boolean,
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
import { empresa } from "./empresas.js";
import { notafiscal } from "./nota-fiscal.js";

export const nfeinbounddocumento = pgTable(
	"nfeinbounddocumento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nsu: varchar({ length: 15 }).notNull(),
		chavenfe: varchar({ length: 44 }).notNull(),
		tipodocumento: varchar({ length: 20 }).notNull(),
		cnpjemitente: varchar({ length: 14 }),
		razaoemitente: varchar({ length: 255 }),
		numero: integer(),
		serie: smallint(),
		dataemissao: timestamp({ precision: 3, mode: "string" }),
		valortotal: numeric({ precision: 15, scale: 2, mode: "string" }),
		xml: text(),
		statusmanifestacao: varchar({ length: 30 }).default("sem_manifestacao").notNull(),
		statusimportacao: varchar({ length: 30 }).default("aguardando_xml").notNull(),
		idrascunho: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("nfeinbounddocumento_idempresa_chavenfe_uidx").on(
			table.idempresa,
			table.chavenfe,
		),
		index("nfeinbounddocumento_idempresa_criadoem_idx").on(
			table.idempresa,
			table.criadoem,
		),
		index("nfeinbounddocumento_statusimportacao_idx").on(table.statusimportacao),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "nfeinbounddocumento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idrascunho],
			foreignColumns: [notafiscal.id],
			name: "nfeinbounddocumento_idrascunho_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
