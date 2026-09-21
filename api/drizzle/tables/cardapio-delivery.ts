import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import type {
	BairroEntrega,
	CampoFinalizacao,
	HorarioCardapio,
} from "../../src/model/cardapio-delivery-tipos.js";
import { empresa } from "./empresas.js";

export const cardapiodelivery = pgTable(
	"cardapiodelivery",
	{
		id: text()
			.primaryKey()
			.notNull()
			.$defaultFn(() => randomUUID()),
		idempresa: text().notNull(),
		slug: varchar({ length: 80 }).notNull(),
		ativo: integer().default(0).notNull(),
		corprimaria: varchar({ length: 16 }).default("#c2410c"),
		logourl: varchar({ length: 255 }),
		bannerurl: varchar({ length: 255 }),
		habilitadelivery: integer().default(1).notNull(),
		habilitaretirada: integer().default(1).notNull(),
		taxaentregapadrao: numeric({ precision: 12, scale: 2 }).default("0"),
		bairrosentrega: jsonb("bairrosentrega")
			.$type<BairroEntrega[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		pedidominimo: numeric({ precision: 12, scale: 2 }).default("0"),
		chavepix: varchar({ length: 120 }),
		tempomedioentrega: varchar({ length: 60 }),
		mensagemrodape: text(),
		horario: jsonb("horario")
			.$type<HorarioCardapio>()
			.default(sql`'{}'::jsonb`)
			.notNull(),
		camposfinalizacao: jsonb("camposfinalizacao")
			.$type<CampoFinalizacao[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		idmeiospagamento: jsonb("idmeiospagamento")
			.$type<string[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("cardapiodelivery_idempresa_key").on(table.idempresa),
		uniqueIndex("cardapiodelivery_slug_key").on(table.slug),
		index("cardapiodelivery_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "cardapiodelivery_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
