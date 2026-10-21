import {
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	text,
} from "drizzle-orm/pg-core";
import { centrocusto } from "./centro-custo.js";
import { criteriorateio } from "./criterio-rateio.js";
import { empresa } from "./empresas.js";

export const criteriorateiolinha = pgTable(
	"criterio_rateio_linha",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcriteriorateio: text().notNull(),
		idcentrocusto: text().notNull(),
		percentual: numeric({ precision: 5, scale: 2 }),
		peso: numeric({ precision: 12, scale: 4 }),
		ordem: integer().default(0),
	},
	(table) => [
		index("criterio_rateio_linha_criterio_idx").using(
			"btree",
			table.idcriteriorateio.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "criterio_rateio_linha_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcriteriorateio],
			foreignColumns: [criteriorateio.id],
			name: "criterio_rateio_linha_idcriteriorateio_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcentrocusto],
			foreignColumns: [centrocusto.id],
			name: "criterio_rateio_linha_idcentrocusto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
