import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import type {
	ItemPedidoCardapio,
	RespostaCampoCardapio,
} from "../../src/model/cardapio-delivery-tipos.js";
import { cardapiodelivery } from "./cardapio-delivery.js";
import { empresa } from "./empresas.js";

export const pedidocardapiodelivery = pgTable(
	"pedidocardapiodelivery",
	{
		id: text()
			.primaryKey()
			.notNull()
			.$defaultFn(() => randomUUID()),
		idempresa: text().notNull(),
		idcardapio: text().notNull(),
		protocolo: varchar({ length: 20 }).notNull(),
		clientorderid: varchar({ length: 80 }).notNull(),
		status: varchar({ length: 20 }).default("pendente").notNull(),
		modalidade: varchar({ length: 20 }).notNull(),
		nomecliente: varchar({ length: 120 }).notNull(),
		telefone: varchar({ length: 20 }).notNull(),
		documento: varchar({ length: 20 }),
		endereco: varchar({ length: 200 }),
		numero: varchar({ length: 20 }),
		bairro: varchar({ length: 80 }),
		complemento: varchar({ length: 80 }),
		referencia: varchar({ length: 120 }),
		idmeiopagamento: text(),
		nomemeiopagamento: varchar({ length: 80 }),
		observacao: text(),
		subtotal: numeric({ precision: 12, scale: 2 }).notNull(),
		valorentrega: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
		total: numeric({ precision: 12, scale: 2 }).notNull(),
		itens: jsonb("itens").$type<ItemPedidoCardapio[]>().notNull(),
		respostas: jsonb("respostas")
			.$type<RespostaCampoCardapio[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		mensagemerro: text(),
		idcontamensalocal: text(),
		ackingestadoem: timestamp({ precision: 3, mode: "string" }),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("pedidocardapiodelivery_protocolo_key").on(table.protocolo),
		uniqueIndex("pedidocardapiodelivery_clientorderid_empresa_key").on(
			table.idempresa,
			table.clientorderid,
		),
		index("pedidocardapiodelivery_pendentes_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
			table.status.asc().nullsLast().op("text_ops"),
			table.criadoem.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "pedidocardapiodelivery_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcardapio],
			foreignColumns: [cardapiodelivery.id],
			name: "pedidocardapiodelivery_idcardapio_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
