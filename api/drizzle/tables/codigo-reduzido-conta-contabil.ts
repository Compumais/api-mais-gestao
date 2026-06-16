import { bigint, date, foreignKey, pgTable, text } from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { usuarios } from "./usuarios.js";

export const codigoreduzidocontacontabil = pgTable(
	"codigoreduzidocontacontabil",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		datacadastro: date().defaultNow().notNull(),
		dataultimaalteracao: date().defaultNow().notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "codigoreduzidocontacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "codigoreduzidocontacontabil_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "codigoreduzidocontacontabil_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
