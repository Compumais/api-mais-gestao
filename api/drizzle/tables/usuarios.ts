import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	perfil: jsonb("perfil").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
	maxempresas: integer("maxempresas"),
	email: text("email").notNull().unique(),
	emailverificado: boolean("emailverificado").default(false).notNull(),
	imagem: text("imagem"),
	plano: text("plano"), // BASIC, PREMIUM, ENTERPRISE
	plano_inicio_ciclo: date("plano_inicio_ciclo"),
	plano_fim_ciclo: date("plano_fim_ciclo"),
	plano_proximo: text("plano_proximo"), // Plano agendado para downgrade
	criadoem: timestamp("criadoem").defaultNow().notNull(),
	atualizadoem: timestamp("atualizadoem")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
