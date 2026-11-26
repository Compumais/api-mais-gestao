import { sql } from "drizzle-orm";
import {
	foreignKey,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export type BiColSpan = 4 | 6 | 8 | 12;

export type BiLayoutItem = {
	widgetId: string;
	ordem: number;
	colSpan: BiColSpan;
};

export const biDashboardLayouts = pgTable(
	"bi_dashboard_layouts",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 100 }).default("Meu Painel").notNull(),
		itens: jsonb("itens")
			.$type<BiLayoutItem[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		atualizadopor: text(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("bi_dashboard_layouts_idempresa_key").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "bi_dashboard_layouts_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.atualizadopor],
			foreignColumns: [usuarios.id],
			name: "bi_dashboard_layouts_atualizadopor_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
