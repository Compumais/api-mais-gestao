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

export const contacontabil = pgTable(
	"contacontabil",
	{
		id: text().primaryKey().notNull(),
		idcontapai: text(),
		idempresa: text().notNull(),
		inativo: integer().default(0),
		descricao: varchar({ length: 100 }).notNull(),
		codigocontareferencial: varchar({ length: 60 }),
		codigoextenso: varchar({ length: 85 }),
		codigoreduzido: varchar({ length: 20 }),
		contaglutinadora: integer(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		datacadastro: date().defaultNow().notNull(),
		dataultimaalteracao: date().defaultNow().notNull(),
		idultimousuarioalteracao: text().notNull(),
		idusuariocadastro: text().notNull(),
		natureza: varchar({ length: 1 }),
		nivelconta: integer(),
		numeronivel1: varchar({ length: 20 }),
		numeronivel2: varchar({ length: 20 }),
		numeronivel3: varchar({ length: 20 }),
		numeronivel4: varchar({ length: 20 }),
		numeronivel5: varchar({ length: 20 }),
		numeronivel6: varchar({ length: 20 }),
		numeronivel7: varchar({ length: 20 }),
		numeronivel8: varchar({ length: 20 }),
		numeronivel9: varchar({ length: 20 }),
		tipocontacontabil: varchar({ length: 1 }),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "contacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idultimousuarioalteracao],
			foreignColumns: [usuarios.id],
			name: "contacontabil_idultimousuarioalteracao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idusuariocadastro],
			foreignColumns: [usuarios.id],
			name: "contacontabil_idusuariocadastro_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontapai],
			foreignColumns: [table.id],
			name: "contacontabil_idcontapai_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
