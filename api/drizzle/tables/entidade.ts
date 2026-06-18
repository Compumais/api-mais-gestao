import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	pgTable,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const entidade = pgTable(
	"entidade",
	{
		id: text().primaryKey().notNull(),
		nome: varchar({ length: 60 }).notNull(),
		razaosocial: varchar({ length: 60 }),
		tipopessoa: smallint().default(0), // 0 - Pessoa Física, 1 - Pessoa Jurídica
		cnpjcpf: varchar({ length: 20 }).notNull(),
		inscricaoestadual: varchar({ length: 20 }),
		rg: varchar({ length: 20 }),
		email: varchar({ length: 200 }),
		telefone: varchar({ length: 40 }),
		endereco: varchar({ length: 60 }),
		numeroendereco: varchar({ length: 6 }),
		complemento: varchar({ length: 50 }),
		bairro: varchar({ length: 50 }),
		fornecedor: smallint().default(0), // 0 - Não, 1 - Sim
		cliente: smallint().default(0), // 0 - Não, 1 - Sim
		transportador: smallint().default(0), // 0 - Não, 1 - Sim
		representante: smallint().default(0), // 0 - Não, 1 - Sim
		idcidade: text(),
		idestado: text(),
		cep: varchar({ length: 9 }),
		fax: varchar({ length: 40 }),
		nascimento: date(),
		idplanocontas: text(),
		pais: text(),
		idempresa: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("entidades_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("entidades_email_idx").using(
			"btree",
			table.email.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "entidades_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
