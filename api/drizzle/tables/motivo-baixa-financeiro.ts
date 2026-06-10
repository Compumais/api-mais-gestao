import {
	bigint,
	foreignKey,
	integer,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const motivobaixafinanceiro = pgTable(
	"motivobaixafinanceiro",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		descricao: varchar({ length: 50 }).notNull(),
		inativo: integer().default(0),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "motivobaixafinanceiro_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
