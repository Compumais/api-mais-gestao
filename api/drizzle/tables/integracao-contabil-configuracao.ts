import { bigint, foreignKey, pgTable, text } from "drizzle-orm/pg-core";
import { contacontabil } from "./conta-contabil.js";
import { empresa } from "./empresas.js";

export const integracaocontabilconfiguracao = pgTable(
	"integracaocontabilconfiguracao",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		contabilizarclifordiversos: bigint({ mode: "number" }).default(0),
		idcontabaixarpagar: text(),
		idcontabaixarreceber: text(),
		idcontaclientediversos: text(),
		idcontafornecedordiversos: text(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "integracaocontabilconfiguracao_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontabaixarpagar],
			foreignColumns: [contacontabil.id],
			name: "integracaocontabilconfiguracao_idcontabaixarpagar_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontabaixarreceber],
			foreignColumns: [contacontabil.id],
			name: "integracaocontabilconfiguracao_idcontabaixarreceber_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontaclientediversos],
			foreignColumns: [contacontabil.id],
			name: "integracaocontabilconfiguracao_idcontaclientediversos_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontafornecedordiversos],
			foreignColumns: [contacontabil.id],
			name: "integracaocontabilconfiguracao_idcontafornecedordiversos_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
