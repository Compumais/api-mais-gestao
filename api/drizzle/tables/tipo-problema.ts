import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export const tipoproblema = pgTable(
	"tipoproblema",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 6 }),
		descricao: varchar({ length: 50 }),
		inativo: smallint(), // 0=Ativo, 1=Inativo
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		index("tipoproblema_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "tipoproblema_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "tipoproblema_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "tipoproblema_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
