import {
	boolean,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { bancoimagemgrupo } from "./banco-imagem-grupo.js";

export const bancoimagemproduto = pgTable(
	"bancoimagemproduto",
	{
		id: text().primaryKey().notNull(),
		idgrupo: text().notNull(),
		nome: varchar({ length: 160 }).notNull(),
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
	},
	(table) => [
		index("bancoimagemproduto_idgrupo_idx").on(table.idgrupo),
		foreignKey({
			columns: [table.idgrupo],
			foreignColumns: [bancoimagemgrupo.id],
			name: "bancoimagemproduto_idgrupo_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
