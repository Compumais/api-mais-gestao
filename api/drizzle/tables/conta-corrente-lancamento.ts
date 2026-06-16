import {
	bigint,
	char,
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { contacorrente } from "./conta-corrente.js";
import { planocontas } from "./plano-contas.js";
import { usuarios } from "./usuarios.js";

export const contacorrentelancamento = pgTable(
	"contacorrentelancamento",
	{
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		id: text().primaryKey().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcontacorrente: text().notNull(),
		datahora: date(),
		tipo: char({ length: 1 }), // E ou S
		valor: numeric({ precision: 12, scale: 2 }),
		saldoanterior: numeric({ precision: 12, scale: 2 }),
		saldoatual: numeric({ precision: 12, scale: 2 }),
		historico: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idusuario: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idplanocontas: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		evento: bigint({ mode: "number" }),
		debito: numeric({ precision: 12, scale: 2 }),
		documento: varchar({ length: 30 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
		identificado: smallint(),
		depositonaoidentificado: smallint(),
		tiporateiocentrocusto: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idlancamentotransferencia: text(),
		dataconciliacao: date(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idusuarioconciliacao: text(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idlancamentoestornado: bigint({ mode: "number" }),
	},
	(table) => [
		index("idx_contacorrentelanc_evento").using(
			"btree",
			table.evento.asc().nullsLast().op("int8_ops"),
		),
		foreignKey({
			columns: [table.idcontacorrente],
			foreignColumns: [contacorrente.id],
			name: "contacorrentelancamento_idcontacorrente_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "contacorrentelancamento_idusuario_fkey",
		}),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "contacorrentelancamento_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idlancamentotransferencia],
			foreignColumns: [table.id],
			name: "contacorrentelancamento_idlancamentotransferencia_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuarioconciliacao],
			foreignColumns: [usuarios.id],
			name: "contacorrentelancamento_idusuarioconciliacao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idlancamentoestornado],
			foreignColumns: [table.id],
			name: "contacorrentelancamento_idlancamentoestornado_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
