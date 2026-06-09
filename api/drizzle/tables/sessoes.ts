import {
  foreignKey,
	index,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios";

export const sessoes = pgTable(
	"sessoes",
	{
		id: text("id").primaryKey(),
		expiraem: timestamp("expiraem").notNull(),
		token: text("token").notNull().unique(),
		criadoem: timestamp("criadoem").defaultNow().notNull(),
		atualizadoem: timestamp("atualizadoem")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		enderecoip: text("enderecoip"),
		useragent: text("useragent"),
		idusuario: text("idusuario")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("sessoes_idusuario_idx").on(table.idusuario),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "sessoes_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
