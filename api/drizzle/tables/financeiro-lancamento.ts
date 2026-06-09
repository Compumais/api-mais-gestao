import {
	bigint,
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
import { financeiro } from "./financeiro";
import { planocontas } from "./plano-contas";

export const financeirolancamento = pgTable(
	"financeirolancamento",
	{
		id: text().primaryKey().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idfinanceiro: text().notNull(),
		valoranterior: numeric({ precision: 12, scale: 2 }),
		desconto: numeric({ precision: 12, scale: 2 }),
		valor: numeric({ precision: 12, scale: 2 }),
		pagamento: date(),
		baixa: timestamp({ precision: 6, mode: "string" }),
		juros: numeric({ precision: 12, scale: 2 }),
		multa: numeric({ precision: 12, scale: 2 }),
		usuario: varchar({ length: 10 }),
		cancelado: smallint().default(sql`(0)`),
		datahoracancelado: timestamp({ precision: 6, mode: "string" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		evento: bigint({ mode: "number" }).notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		historico: text(),
		reabertura: numeric({ precision: 12, scale: 2 }),
		observacao: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
		valorsubstituido: numeric({ precision: 12, scale: 2 }),
		valordevolucao: numeric({ precision: 12, scale: 2 }),
		datavencimentoanterior: date(),
		valorbaixa: numeric({ precision: 12, scale: 2 }),
		acrescimo: numeric({ precision: 12, scale: 2 }),
		baixa2: date(),
		idplanocontasjuros: smallint(),
		idplanocontasmulta: smallint(),
		idplanocontasdesconto: smallint(),
		idplanocontasacrescimo: smallint(),
		tiporateiocentrocustojuros: smallint(),
		tiporateiocentrocustomulta: smallint(),
		tiporateiocentrocustodesconto: smallint(),
		tiporateiocentrocustoacrescimo: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idportadoranterior: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idtipocobrancaanterior: bigint({ mode: "number" }),
		automatico: smallint(),
	},
	(table) => [
		index("idx_finlan_evento").using(
			"btree",
			table.evento.asc().nullsLast().op("int8_ops"),
		),
		index("idx_finlan_idfinanceiro").using(
			"btree",
			table.idfinanceiro.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idfinanceiro],
			foreignColumns: [financeiro.id],
			name: "financeirolancamento_idfinanceiro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontasacrescimo],
			foreignColumns: [planocontas.id],
			name: "financeirolancamento_evento_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontasdesconto],
			foreignColumns: [planocontas.id],
			name: "financeirolancamento_idplanocontasdesconto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontasmulta],
			foreignColumns: [planocontas.id],
			name: "financeirolancamento_idplanocontasmulta_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontasjuros],
			foreignColumns: [planocontas.id],
			name: "financeirolancamento_idplanocontasjuros_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
