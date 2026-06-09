import {
	bigint,
	date,
	foreignKey,
	integer,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";
import { usuarios } from "./usuarios";

export const centrocusto = pgTable(
	"centrocusto",
	{
		id: text().primaryKey().notNull(),
		codigoextenso: varchar({ length: 85 }),
		codigoreduzido: varchar({ length: 20 }),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		datacadastro: date().defaultNow().notNull(),
		dataultimaalteracao: date().defaultNow().notNull(),
		idempresa: text().notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
		inativo: integer().default(0),
		obrigatorio: integer().default(0),
		idcentrocustopai: text(),
		nivelcentro: integer(),
		nivelcentro1: varchar({ length: 20 }),
		nivelcentro2: varchar({ length: 20 }),
		nivelcentro3: varchar({ length: 20 }),
		nivelcentro4: varchar({ length: 20 }),
		nivelcentro5: varchar({ length: 20 }),
		nivelcentro6: varchar({ length: 20 }),
		nivelcentro7: varchar({ length: 20 }),
		nivelcentro8: varchar({ length: 20 }),
		nivelcentro9: varchar({ length: 20 }),
		nome: varchar({ length: 50 }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "centrocusto_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "centrocusto_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "centrocusto_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcentrocustopai],
			foreignColumns: [table.id],
			name: "centrocusto_idcentrocustopai_fkey",
		}),
	],
);
