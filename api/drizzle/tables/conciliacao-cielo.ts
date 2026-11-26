import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { contacorrente } from "./conta-corrente.js";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export const conciliacaocielo = pgTable(
	"conciliacao_cielo",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nomearquivo: varchar({ length: 180 }).notNull(),
		checksum: varchar({ length: 64 }).notNull(),
		estabelecimento: varchar({ length: 40 }),
		periodoinicio: date(),
		periodofim: date(),
		qtdlancamentos: integer().notNull().default(0),
		valorbruto: numeric({ precision: 15, scale: 2 }).notNull().default("0.00"),
		valortaxa: numeric({ precision: 15, scale: 2 }).notNull().default("0.00"),
		valorliquido: numeric({ precision: 15, scale: 2 }).notNull().default("0.00"),
		status: varchar({ length: 30 }).notNull().default("importado"),
		idcontacorrente: text(),
		idusuario: text().notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		processadoem: timestamp({ precision: 3, mode: "string" }),
	},
	(table) => [
		index("conciliacao_cielo_idempresa_idx").on(table.idempresa),
		uniqueIndex("conciliacao_cielo_checksum_empresa_uidx").on(
			table.idempresa,
			table.checksum,
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "conciliacao_cielo_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontacorrente],
			foreignColumns: [contacorrente.id],
			name: "conciliacao_cielo_idcontacorrente_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "conciliacao_cielo_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
