import { sql } from "drizzle-orm";
import {
	char,
	foreignKey,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const empresafiscal = pgTable(
	"empresafiscal",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		razaosocial: varchar({ length: 60 }),
		nomefantasia: varchar({ length: 60 }),
		inscricaoestadual: varchar({ length: 20 }),
		inscricaomunicipal: varchar({ length: 20 }),
		crt: smallint(),
		cnae: varchar({ length: 7 }),
		indicadorie: smallint().default(1),
		logradouro: varchar({ length: 60 }),
		numero: varchar({ length: 10 }),
		complemento: varchar({ length: 60 }),
		bairro: varchar({ length: 60 }),
		cep: varchar({ length: 9 }),
		codigomunicipioibge: varchar({ length: 7 }),
		uf: char({ length: 2 }),
		codigopais: varchar({ length: 4 }).default("1058"),
		telefone: varchar({ length: 40 }),
		email: varchar({ length: 200 }),
		regimetributario: varchar({ length: 2 }),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("empresafiscal_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "empresafiscal_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
