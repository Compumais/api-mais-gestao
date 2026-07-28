import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { ordemservico } from "./ordem-servico.js";
import { tipoordemservicoevento } from "./tipo-ordem-servico-evento.js";
import { usuarios } from "./usuarios.js";

export const ordemservicoevento = pgTable(
	"ordemservicoevento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		descricao: text().notNull(),
		data: timestamp({ precision: 3, mode: "string" }),
		idordemservico: text().notNull(),
		idtecnicode: text(),
		idtecnicopara: text(),
		idtipoevento: text().notNull(),
		nomecontato: varchar({ length: 50 }),
		datacriacao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("ordemservicoevento_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("ordemservicoevento_idordemservico_idx").using(
			"btree",
			table.idordemservico.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "ordemservicoevento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idordemservico],
			foreignColumns: [ordemservico.id],
			name: "ordemservicoevento_idordemservico_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idtecnicode],
			foreignColumns: [usuarios.id],
			name: "ordemservicoevento_idtecnicode_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtecnicopara],
			foreignColumns: [usuarios.id],
			name: "ordemservicoevento_idtecnicopara_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipoevento],
			foreignColumns: [tipoordemservicoevento.id],
			name: "ordemservicoevento_idtipoevento_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
