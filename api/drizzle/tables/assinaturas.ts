import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { clientesasaas } from "./clientes-asaas.js";
import { empresa } from "./empresas.js";

export const assinaturas = pgTable(
	"assinaturas",
	{
		id: text("id").primaryKey().notNull(),
		idempresa: text("idempresa")
			.notNull()
			.references(() => empresa.id, { onDelete: "cascade" }),
		idassinaturaasaas: text("idassinaturaasaas").notNull(),
		status: text("status").notNull(), // ACTIVE, EXPIRED, OVERDUE...
		plano: text("plano").notNull(), // BASIC, PREMIUM
		valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
		ciclo: text("ciclo").notNull(), // MONTHLY
		proximovencimento: date("proximovencimento"),
		urlpagamento: text("urlpagamento"),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
		atualizadoem: timestamp("atualizadoem")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("assinaturas_idempresa_idx").on(table.idempresa),
		index("assinaturas_idassinaturaasaas_idx").on(table.idassinaturaasaas),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "assinaturas_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idassinaturaasaas],
			foreignColumns: [clientesasaas.id],
			name: "assinaturas_idassinaturaasaas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
