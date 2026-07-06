import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	jsonb,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { certificadodigital } from "./certificado-digital.js";
import { empresa } from "./empresas.js";

export const nfeconfiguracao = pgTable(
	"nfeconfiguracao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		ambiente: smallint().default(2).notNull(),
		versaoleiaute: varchar({ length: 10 }).default("4.00").notNull(),
		schema: varchar({ length: 30 }).default("PL_009_V4").notNull(),
		idcertificadoativo: text(),
		verproc: varchar({ length: 20 }).default("MaisGestao 1.0.0"),
		tokenibpt: varchar({ length: 100 }),
		emailenvioxml: varchar({ length: 200 }),
		infresptec_cnpj: varchar({ length: 14 }),
		infresptec_nome: varchar({ length: 60 }),
		infresptec_email: varchar({ length: 200 }),
		infresptec_fone: varchar({ length: 20 }),
		contingenciaativa: boolean().default(false).notNull(),
		contingenciajson: jsonb("contingenciajson")
			.$type<Record<string, unknown>>()
			.default(sql`'{}'::jsonb`),
		ultimacfopsaida: varchar({ length: 5 }),
		ultimanatop: varchar({ length: 60 }),
		ultimaidserie: text(),
		ultimoindpres: smallint(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("nfeconfiguracao_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "nfeconfiguracao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcertificadoativo],
			foreignColumns: [certificadodigital.id],
			name: "nfeconfiguracao_idcertificadoativo_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
