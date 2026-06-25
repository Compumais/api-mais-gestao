import {
	bigint,
	foreignKey,
	integer,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { motivobaixafinanceiro } from "./motivo-baixa-financeiro.js";
import { planocontas } from "./plano-contas.js";

export const tipodocumentofinanceiro = pgTable(
	"tipodocumentofinanceiro",
	{
		id: text().primaryKey().notNull(),
		descricao: varchar({ length: 50 }).notNull(),
		acao: integer().notNull(),
		saidafechamento: integer().default(0),
		inativo: integer().default(0),
		integracaixabanco: integer().default(0),
		baixageracodigobanco: integer().default(0),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		permitegerarboleto: integer(),
		idmotivobaixafinanceiro: text(),
		utilizadoemnegociao: integer(),
		enviamobile: integer(),
		tipousuario: integer().default(0),
		localusoboleto: integer().default(0),
		resgatarboleto: integer().default(0),
		calcularencargofinanceiro: integer(),
		juros: integer().default(0),
		multa: integer().default(0),
		descontoantecipacao: integer().default(0),
		desconsiderasabado: integer().default(0),
		desconsideradependente: integer().default(0),
		diasdeconsiderarjuros: integer().default(0),
		diasdeconsiderarmulta: integer().default(0),
		diasdesconsiderardesconto: integer().default(0),
		tipocalculojuros: integer(),
		consideraparainadimplencia: integer().default(0),
		enviaecommerce: integer(),
		formapagamentonfe: varchar(),
		tipocobrancasaas: integer(),
		codigomercos: integer(),
		idplanocontas: text(),
		aprazo: smallint().default(0).notNull(),
		prazodias: smallint(),
		idempresa: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "tipodocumentofinanceiro_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "tipodocumentofinanceiro_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idmotivobaixafinanceiro],
			foreignColumns: [motivobaixafinanceiro.id],
			name: "tipodocumentofinanceiro_idmotivobaixafinanceiro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
