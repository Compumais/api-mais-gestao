import {
	boolean,
	foreignKey,
	index,
	jsonb,
	pgTable,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export type AutomacaoParametros = {
	incluirSintegra?: boolean;
	incluirXml?: boolean;
	finalidadeSintegra?: "1" | "2" | "3" | "5";
	incluirNfe?: boolean;
	incluirNfce?: boolean;
};

export const automacao = pgTable(
	"automacao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 120 }).notNull(),
		funcao: varchar({ length: 80 }).notNull(),
		ativo: boolean().default(true).notNull(),
		recorrencia: varchar({ length: 20 }).notNull(),
		horario: varchar({ length: 5 }).default("08:00").notNull(),
		diames: smallint(),
		diasemana: smallint(),
		parametros: jsonb().$type<AutomacaoParametros | null>(),
		proximaexecucao: timestamp({ precision: 3, mode: "string" }),
		ultimaexecucao: timestamp({ precision: 3, mode: "string" }),
		statusultima: varchar({ length: 30 }),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		index("automacao_idempresa_idx").on(table.idempresa),
		index("automacao_proximaexecucao_idx").on(table.proximaexecucao),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "automacao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
