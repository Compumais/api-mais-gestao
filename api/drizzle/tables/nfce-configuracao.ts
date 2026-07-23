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



export const nfceconfiguracao = pgTable(

	"nfceconfiguracao",

	{

		id: text().primaryKey().notNull(),

		idempresa: text().notNull(),

		ambiente: smallint().default(2).notNull(),

		versaoleiaute: varchar({ length: 10 }).default("4.00").notNull(),

		schema: varchar({ length: 30 }).default("PL_009_V4").notNull(),

		idcertificadoativo: text(),

		verproc: varchar({ length: 20 }).default("MaisGestao 1.0.0"),

		idcsc_homologacao: varchar({ length: 6 }),

		csctoken_homologacao: varchar({ length: 36 }),

		idcsc_producao: varchar({ length: 6 }),

		csctoken_producao: varchar({ length: 36 }),

		contingenciaativa: boolean().default(false).notNull(),

		contingenciajson: jsonb("contingenciajson")

			.$type<Record<string, unknown>>()

			.default(sql`'{}'::jsonb`),

		meiospagamentonfce: jsonb("meiospagamentonfce")

			.$type<{

				dinheiro: boolean;

				cartao: boolean;

				pix: boolean;

				prepago: boolean;

			}>()

			.default(

				sql`'{"dinheiro":true,"cartao":true,"pix":true,"prepago":false}'::jsonb`,

			)

			.notNull(),

		emitirnfcepos: boolean().default(true).notNull(),

		ultimaidserie: text(),

		criadoem: timestamp({ precision: 3, mode: "string" })

			.default(sql`CURRENT_TIMESTAMP`)

			.notNull(),

		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),

	},

	(table) => [

		uniqueIndex("nfceconfiguracao_idempresa_key").on(table.idempresa),

		foreignKey({

			columns: [table.idempresa],

			foreignColumns: [empresa.id],

			name: "nfceconfiguracao_idempresa_fkey",

		})

			.onUpdate("cascade")

			.onDelete("cascade"),

		foreignKey({

			columns: [table.idcertificadoativo],

			foreignColumns: [certificadodigital.id],

			name: "nfceconfiguracao_idcertificadoativo_fkey",

		})

			.onUpdate("cascade")

			.onDelete("set null"),

	],

);

