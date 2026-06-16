import { sql } from "drizzle-orm";
import {
	foreignKey,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export const departamento = pgTable(
	"departamento",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: varchar({ length: 20 }).notNull(),
		descricao: varchar({ length: 12 }).notNull(),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dataultimaalteracao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
		inativo: integer().default(0), // 0=Ativo, 1=Inativo
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "departamento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "departamento_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "departamento_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
