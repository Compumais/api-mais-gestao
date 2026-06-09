import {
	bigint,
	foreignKey,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const banco = pgTable(
	"banco",
	{
		id: text().primaryKey().notNull(),
		codigo: varchar({ length: 6 }).notNull(),
		nome: varchar({ length: 60 }).notNull(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
		idempresa: text()
			.notNull()
			.references(() => empresa.id, {
				onDelete: "cascade",
			}),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "banco_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
