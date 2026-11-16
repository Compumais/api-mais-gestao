import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { condicaopagamento } from "./condicao-pagamento.js";
import { contacorrente } from "./conta-corrente.js";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";
import { planocontas } from "./plano-contas.js";
import { tipocobranca } from "./tipo-cobranca.js";
import { tipocontrato } from "./tipo-contrato.js";
import { tipodocumentofinanceiro } from "./tipo-documento-financeiro.js";

export const contrato = pgTable(
	"contrato",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		identidade: text().notNull(),
		idtipocontrato: text(),
		codigo: varchar({ length: 40 }),
		descricao: varchar({ length: 255 }).notNull(),
		situacao: varchar({ length: 20 }).notNull().default("ativo"),
		datainicio: date().notNull(),
		datafim: date(),
		valor: numeric({ precision: 12, scale: 2 }).notNull(),
		periodicidade: varchar({ length: 20 }).notNull().default("mensal"),
		diavencimento: smallint().notNull(),
		regracompetencia: varchar({ length: 30 }).notNull().default("mes_atual"),
		fluxofaturamento: smallint().notNull(),
		discriminacao: text(),
		itemlistaservico: varchar({ length: 20 }),
		codigonbs: varchar({ length: 9 }),
		codigotributacaonacional: varchar({ length: 6 }),
		idcondicaopagto: text(),
		idtipodocumento: text(),
		idplanocontas: text(),
		idcontacorrente: text(),
		idtipocobranca: text(),
		observacao: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("contrato_idempresa_idx").on(table.idempresa),
		index("contrato_identidade_idx").on(table.identidade),
		index("contrato_situacao_idx").on(table.situacao),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "contrato_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "contrato_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idtipocontrato],
			foreignColumns: [tipocontrato.id],
			name: "contrato_idtipocontrato_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcondicaopagto],
			foreignColumns: [condicaopagamento.id],
			name: "contrato_idcondicaopagto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipodocumento],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "contrato_idtipodocumento_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "contrato_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcontacorrente],
			foreignColumns: [contacorrente.id],
			name: "contrato_idcontacorrente_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipocobranca],
			foreignColumns: [tipocobranca.id],
			name: "contrato_idtipocobranca_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
