import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios.js";

export const ajudaposts = pgTable(
	"ajuda_posts",
	{
		id: text("id").primaryKey().notNull(),
		titulo: text("titulo").notNull(),
		subtitulo: text("subtitulo"),
		descricao: text("descricao").notNull(),
		capa: text("capa"),
		imagens: jsonb("imagens").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
		slug: text("slug").notNull(),
		publicado: boolean("publicado").default(true).notNull(),
		autorid: text("autorid").notNull(),
		editorid: text("editorid").notNull(),
		criadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" }).notNull(),
	},
	(table) => [
		uniqueIndex("ajuda_posts_slug_uidx").on(table.slug),
		foreignKey({
			columns: [table.autorid],
			foreignColumns: [usuarios.id],
			name: "ajuda_posts_autorid_fkey",
		}),
		foreignKey({
			columns: [table.editorid],
			foreignColumns: [usuarios.id],
			name: "ajuda_posts_editorid_fkey",
		}),
	],
);
