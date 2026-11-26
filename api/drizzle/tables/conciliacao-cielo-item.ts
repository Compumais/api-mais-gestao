import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { conciliacaocielo } from "./conciliacao-cielo.js";
import { financeiro } from "./financeiro.js";

export const conciliacaocieloitem = pgTable(
	"conciliacao_cielo_item",
	{
		id: text().primaryKey().notNull(),
		idconciliacao: text().notNull(),
		linhacsv: integer().notNull(),
		datapagamento: date(),
		datalancamento: date(),
		dataprevistapagamento: date(),
		datavenda: date(),
		estabelecimento: varchar({ length: 40 }),
		tipolancamento: varchar({ length: 60 }),
		formapagamento: varchar({ length: 80 }),
		bandeira: varchar({ length: 40 }),
		valorbruto: numeric({ precision: 15, scale: 2 }),
		valortaxa: numeric({ precision: 15, scale: 2 }),
		valorliquido: numeric({ precision: 15, scale: 2 }),
		statuspagamento: varchar({ length: 40 }),
		descricao: varchar({ length: 180 }),
		codigoautorizacao: varchar({ length: 40 }),
		nsu: varchar({ length: 40 }),
		codigovenda: varchar({ length: 60 }),
		tid: varchar({ length: 60 }),
		numerocartao: varchar({ length: 40 }),
		numeropedido: varchar({ length: 60 }),
		parcela: integer(),
		totalparcelas: integer(),
		modalidade: varchar({ length: 40 }),
		idfinanceiro: text(),
		idfinanceirosugerido: text(),
		confiancasugestao: integer().notNull().default(0),
		statusprocessamento: varchar({ length: 20 }).notNull().default("pendente"),
		mensagemerro: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("conciliacao_cielo_item_idconciliacao_idx").on(table.idconciliacao),
		index("conciliacao_cielo_item_nsu_idx").on(table.nsu),
		index("conciliacao_cielo_item_autorizacao_idx").on(table.codigoautorizacao),
		index("conciliacao_cielo_item_idfinanceiro_idx").on(table.idfinanceiro),
		foreignKey({
			columns: [table.idconciliacao],
			foreignColumns: [conciliacaocielo.id],
			name: "conciliacao_cielo_item_idconciliacao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idfinanceiro],
			foreignColumns: [financeiro.id],
			name: "conciliacao_cielo_item_idfinanceiro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idfinanceirosugerido],
			foreignColumns: [financeiro.id],
			name: "conciliacao_cielo_item_idfinanceirosugerido_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
