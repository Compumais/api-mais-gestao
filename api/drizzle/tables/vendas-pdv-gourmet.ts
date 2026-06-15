import { sql } from "drizzle-orm";
import {
	foreignKey,
	integer,
	pgTable,
	smallint,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { contamesa } from "./conta-mesa";
import { empresa } from "./empresas";
import { usuarios } from "./usuarios";

export const vendapdvgourmet = pgTable(
	"vendapdvgourmet",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idcontamesa: text(),
		vendalocal: smallint().default(0), // 1=Sim, 0=Não
		numeropdv: integer().notNull(),
		idvendaitem: text(),
		datacriacao: timestamp({ precision: 3, mode: "string" }).default(
			sql`CURRENT_TIMESTAMP`,
		),
		dataalteracao: timestamp({ precision: 3, mode: "string" }).default(
			sql`CURRENT_TIMESTAMP`,
		),
		usuarioquefechouvenda: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "vendapdvgourmet_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontamesa],
			foreignColumns: [contamesa.id],
			name: "vendapdvgourmet_idcontamesa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.usuarioquefechouvenda],
			foreignColumns: [usuarios.id],
			name: "vendapdvgourmet_usuarioquefechouvenda_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
