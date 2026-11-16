import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { financeiro } from "./financeiro.js";
import { retornobancario } from "./retorno-bancario.js";

export const retornobancarioitem = pgTable(
	"retorno_bancario_item",
	{
		id: text().primaryKey().notNull(),
		idretorno: text().notNull(),
		nossonumero: varchar({ length: 40 }),
		numerodocumento: varchar({ length: 40 }),
		nomesacado: varchar({ length: 150 }),
		valor: numeric({ precision: 15, scale: 2 }),
		valorpago: numeric({ precision: 15, scale: 2 }),
		vencimento: varchar({ length: 10 }),
		datacredito: varchar({ length: 10 }),
		dataocorrencia: varchar({ length: 10 }),
		ocorrencia: varchar({ length: 10 }).notNull(),
		ocorrenciadescricao: varchar({ length: 120 }),
		motivo: varchar({ length: 120 }),
		desconto: numeric({ precision: 15, scale: 2 }),
		abatimento: numeric({ precision: 15, scale: 2 }),
		juros: numeric({ precision: 15, scale: 2 }),
		multa: numeric({ precision: 15, scale: 2 }),
		outrosacrescimos: numeric({ precision: 15, scale: 2 }),
		taxacobranca: numeric({ precision: 15, scale: 2 }),
		valoriof: numeric({ precision: 15, scale: 2 }),
		idfinanceiro: text(),
		statusprocessamento: varchar({ length: 20 }).notNull().default("pendente"),
		mensagemerro: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("retorno_bancario_item_idretorno_idx").on(table.idretorno),
		index("retorno_bancario_item_nossonumero_idx").on(table.nossonumero),
		index("retorno_bancario_item_idfinanceiro_idx").on(table.idfinanceiro),
		foreignKey({
			columns: [table.idretorno],
			foreignColumns: [retornobancario.id],
			name: "retorno_bancario_item_idretorno_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idfinanceiro],
			foreignColumns: [financeiro.id],
			name: "retorno_bancario_item_idfinanceiro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
