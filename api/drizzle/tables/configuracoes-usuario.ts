import { sql } from "drizzle-orm";
import { foreignKey, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios";

export const configuracoesUsuario = pgTable(
	"configuracoes_usuario",
	{
		id: text().primaryKey().notNull(),
		idusuario: text().notNull(),
		// Configurações de integrações globais
		integracoes: jsonb("integracoes")
			.$type<{
				geminiApiKey?: string;
				openaiApiKey?: string;
				openrouterApiKey?: string;
				asaasToken?: string;
			}>()
			.default(sql`'{}'::jsonb`),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("configuracoes_usuario_idusuario_key").on(table.idusuario),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "configuracoes_usuario_idusuario_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
