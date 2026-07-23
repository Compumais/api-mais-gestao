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

export type NfseUrlsOperacao = {
	emissao?: string | null;
	consulta?: string | null;
	cancelamento?: string | null;
};

export const nfseconfiguracao = pgTable(
	"nfseconfiguracao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		ambiente: smallint().default(2).notNull(),
		provedor: varchar({ length: 20 }).default("abrasf").notNull(),
		codigomunicipioibge: varchar({ length: 7 }),
		versaolayout: varchar({ length: 10 }).default("2.02").notNull(),
		urlwsdl: varchar({ length: 500 }),
		urlsoperacao: jsonb("urlsoperacao").$type<NfseUrlsOperacao | null>(),
		usarlotesincrono: boolean().default(true).notNull(),
		idcertificadoativo: text(),
		ultimaidserie: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("nfseconfiguracao_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "nfseconfiguracao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcertificadoativo],
			foreignColumns: [certificadodigital.id],
			name: "nfseconfiguracao_idcertificadoativo_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
