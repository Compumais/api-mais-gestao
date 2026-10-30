import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const bancoimagemgrupo = pgTable("bancoimagemgrupo", {
	id: text().primaryKey().notNull(),
	nome: varchar({ length: 120 }).notNull(),
	ordem: integer().default(0).notNull(),
	ativo: boolean().default(true).notNull(),
	nomearquivo: varchar({ length: 255 }),
	tipomime: varchar({ length: 50 }),
	tamanho: integer(),
	referencia: varchar({ length: 255 }),
	chavearmazenamento: varchar({ length: 255 }),
	criadoem: timestamp({ withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	atualizadoem: timestamp({ withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
});
