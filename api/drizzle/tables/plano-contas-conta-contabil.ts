import {
	bigint,
	foreignKey,
	pgTable,
	text,
} from "drizzle-orm/pg-core";
import { contacontabil } from "./conta-contabil";
import { empresa } from "./empresas";
import { planocontas } from "./plano-contas";

export const planocontascontacontabil = pgTable(
	"planocontascontacontabil",
	{
		id: text().primaryKey().notNull(),
		idcontacontabil: text(),
		idempresa: text(),
		idplanocontas: text(),
		currenttimemillis: bigint({ mode: "number" }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "planocontascontacontabil_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontacontabil],
			foreignColumns: [contacontabil.id],
			name: "planocontascontacontabil_idcontacontabil_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "planocontascontacontabil_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
