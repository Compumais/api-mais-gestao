import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { centrocusto } from "./centro-custo.js";
import { criteriorateio } from "./criterio-rateio.js";
import { empresa } from "./empresas.js";
import { planocontas } from "./plano-contas.js";
import { usuarios } from "./usuarios.js";

export const apropriacaocentrocusto = pgTable(
	"apropriacao_centro_custo",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcentrocusto: text().notNull(),
		origemtipo: varchar({ length: 40 }).notNull(),
		origemid: text().notNull(),
		valor: numeric({ precision: 12, scale: 2 }).notNull(),
		percentual: numeric({ precision: 5, scale: 2 }),
		idcriteriorateio: text(),
		regime: varchar({ length: 12 }).notNull(),
		datalancamento: date().notNull(),
		idplanocontas: text(),
		referenciaexterna: varchar({ length: 120 }),
		idusuariocadastro: text().notNull(),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("apropriacao_cc_empresa_centro_data_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
			table.idcentrocusto.asc().nullsLast().op("text_ops"),
			table.datalancamento.asc().nullsLast().op("date_ops"),
		),
		index("apropriacao_cc_origem_idx").using(
			"btree",
			table.origemtipo.asc().nullsLast().op("text_ops"),
			table.origemid.asc().nullsLast().op("text_ops"),
		),
		index("apropriacao_cc_empresa_plano_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
			table.idplanocontas.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "apropriacao_centro_custo_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcentrocusto],
			foreignColumns: [centrocusto.id],
			name: "apropriacao_centro_custo_idcentrocusto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.idcriteriorateio],
			foreignColumns: [criteriorateio.id],
			name: "apropriacao_centro_custo_idcriteriorateio_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "apropriacao_centro_custo_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "apropriacao_centro_custo_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
