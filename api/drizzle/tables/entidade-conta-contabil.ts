import { bigint, date, foreignKey, pgTable, text } from "drizzle-orm/pg-core";
import { contacontabil } from "./conta-contabil.js";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";
import { usuarios } from "./usuarios.js";

export const entidadecontacontabil = pgTable(
	"entidadecontacontabil",
	{
		id: text().primaryKey().notNull(),
		idcontacontabil: text().notNull(),
		idempresa: text().notNull(),
		identidade: text().notNull(),
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
			name: "entidadecontacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontacontabil],
			foreignColumns: [contacontabil.id],
			name: "entidadecontacontabil_idcontacontabil_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "entidadecontacontabil_identidade_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "entidadecontacontabil_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "entidadecontacontabil_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
