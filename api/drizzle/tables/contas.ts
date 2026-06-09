import {
    foreignKey,
	index,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios";

export const contas = pgTable(
	"contas",
	{
		id: text("id").primaryKey(),
		idconta: text("idconta").notNull(),
		idprovedor: text("idprovedor").notNull(),
		idusuario: text("idusuario")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
		acessotoken: text("acessotoken"),
		refreshtoken: text("refreshtoken"),
		idtoken: text("idtoken"),
		acessotokenexpiraem: timestamp("acessotokenexpiraem"),
		refreshtokenexpiraem: timestamp("refreshtokenexpiraem"),
		escopo: text("escopo"),
		password: text("password"),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
		atualizadoem: timestamp("atualizadoem")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("contas_idusuario_idx").on(table.idusuario),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "contas_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);