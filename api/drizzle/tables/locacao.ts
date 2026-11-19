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
	varchar,
} from "drizzle-orm/pg-core";
import { contacorrente } from "./conta-corrente.js";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";
import { financeiro } from "./financeiro.js";
import { planocontas } from "./plano-contas.js";
import { tipodocumentofinanceiro } from "./tipo-documento-financeiro.js";

export const locacao = pgTable(
	"locacao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		identidade: text().notNull(),
		codigo: varchar({ length: 40 }).notNull(),
		situacao: varchar({ length: 20 }).notNull().default("aberta"),
		datainicio: date().notNull(),
		cep: varchar({ length: 9 }),
		endereco: varchar({ length: 120 }),
		numeroendereco: varchar({ length: 20 }),
		complemento: varchar({ length: 60 }),
		bairro: varchar({ length: 60 }),
		idcidade: text(),
		idestado: text(),
		latitude: numeric({ precision: 10, scale: 7 }),
		longitude: numeric({ precision: 10, scale: 7 }),
		valorperiodo: numeric({ precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		valormora: numeric({ precision: 12, scale: 2 }).notNull().default("0.00"),
		valortotal: numeric({ precision: 12, scale: 2 }).notNull().default("0.00"),
		datadevolucao: date(),
		formapagamento: varchar({ length: 10 }),
		vencimento: date(),
		idtipodocumento: text(),
		idplanocontas: text(),
		idcontacorrente: text(),
		idfinanceiro: text(),
		observacao: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("locacao_empresa_codigo_uidx").on(
			table.idempresa,
			table.codigo,
		),
		index("locacao_idempresa_idx").on(table.idempresa),
		index("locacao_identidade_idx").on(table.identidade),
		index("locacao_situacao_idx").on(table.situacao),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "locacao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "locacao_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idtipodocumento],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "locacao_idtipodocumento_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "locacao_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcontacorrente],
			foreignColumns: [contacorrente.id],
			name: "locacao_idcontacorrente_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idfinanceiro],
			foreignColumns: [financeiro.id],
			name: "locacao_idfinanceiro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
