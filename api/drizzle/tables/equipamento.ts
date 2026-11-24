import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export const equipamento = pgTable(
	"equipamento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 40 }).notNull(),
		descricao: varchar({ length: 120 }).notNull(),
		numeroserie: varchar({ length: 60 }),
		situacao: varchar({ length: 20 }).notNull().default("disponivel"),
		precodiaria: numeric({ precision: 12, scale: 2 }).notNull().default("0.00"),
		precosemanal: numeric({ precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		precoquinzenal: numeric({ precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		precomensal: numeric({ precision: 12, scale: 2 }).notNull().default("0.00"),
		observacao: text(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("equipamento_empresa_codigo_uidx").on(
			table.idempresa,
			table.codigo,
		),
		index("equipamento_idempresa_idx").on(table.idempresa),
		index("equipamento_situacao_idx").on(table.situacao),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "equipamento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
