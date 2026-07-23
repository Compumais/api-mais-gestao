import {
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { cfop } from "./cfop.js";
import { empresa } from "./empresas.js";

export const parametrizacaotributos = pgTable(
	"parametrizacaotributos",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigocfopentrada: varchar({ length: 10 }),
		cstentrada: varchar({ length: 3 }),
		csosnentrada: varchar({ length: 3 }),
		ncm: varchar({ length: 10 }),
		taxaicmsentrada: varchar({ length: 10 }),
		uf: varchar({ length: 2 }),
		ignorarprimeirodigitocst: smallint().default(0),
		idcfopsaidanfe: text(),
		cstnfe: varchar({ length: 3 }),
		csosnnfe: varchar({ length: 3 }),
		taxaicmsnfe: varchar({ length: 10 }),
		idcfopsaidanfce: text(),
		cstnfce: varchar({ length: 7 }),
		csosnnfce: varchar({ length: 3 }),
		taxaicmsnfce: varchar({ length: 10 }),
		aliquotapis: numeric({ precision: 12, scale: 4 }),
		cstpis: varchar({ length: 2 }),
		aliquotacofins: numeric({ precision: 12, scale: 4 }),
		cstcofins: varchar({ length: 2 }),
		cstipi: varchar({ length: 2 }),
		idenquadramentoipi: text(),
		percentualmva: numeric({ precision: 12, scale: 4 }),
		percentualirrf: numeric({ precision: 12, scale: 4 }),
		tipoproduto: varchar({ length: 2 }),
		inativo: smallint().default(0),
	},
	(table) => [
		index("parametrizacaotributos_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("parametrizacaotributos_entrada_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
			table.codigocfopentrada.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "parametrizacaotributos_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopsaidanfe],
			foreignColumns: [cfop.id],
			name: "parametrizacaotributos_idcfopsaidanfe_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopsaidanfce],
			foreignColumns: [cfop.id],
			name: "parametrizacaotributos_idcfopsaidanfce_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
