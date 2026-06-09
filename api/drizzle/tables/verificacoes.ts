import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const verificacoes = pgTable(
	"verificacoes",
	{
		id: text("id").primaryKey(),
		identificador: text("identificador").notNull(),
		valor: text("valor").notNull(),
		expiraem: timestamp("expiraem").notNull(),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
		atualizadoem: timestamp("atualizadoem")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verificacoes_identificador_idx").on(table.identificador)],
);
