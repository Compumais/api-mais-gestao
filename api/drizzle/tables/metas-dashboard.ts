import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const metasDashboard = pgTable(
	"metas_dashboard",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		idempresa: text().notNull(),
		tipo: text().notNull(),
		periodoInicio: date("periodo_inicio").notNull(),
		periodoFim: date("periodo_fim").notNull(),
		valorMeta: numeric("valor_meta", { precision: 18, scale: 4 }).notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("metas_dashboard_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("metas_dashboard_empresa_periodo_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
			table.periodoInicio.asc().nullsLast().op("date_ops"),
			table.periodoFim.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "metas_dashboard_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
