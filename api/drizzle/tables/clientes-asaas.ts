import { foreignKey, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

export const clientesasaas = pgTable(
	"clientes_asaas",
	{
		id: text("id").primaryKey().notNull(),
		idempresa: text("idempresa")
			.notNull()
			.references(() => empresa.id, { onDelete: "cascade" }),
		idclienteasaas: text("idclienteasaas").notNull(),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
	},
	(table) => [
		index("clientes_asaas_idempresa_idx").on(table.idempresa),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "clientes_asaas_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);