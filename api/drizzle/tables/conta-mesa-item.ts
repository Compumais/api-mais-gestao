import { sql } from "drizzle-orm";
import {
	date,
	foreignKey,
	numeric,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { contamesa } from "./conta-mesa.js";
import { entidade } from "./entidade.js";
import { produtos } from "./produtos.js";
import { unidademedida } from "./unidade-medida.js";
import { usuarios } from "./usuarios.js";

export const contamesaitem = pgTable(
	"contamesaitem",
	{
		id: text().primaryKey().notNull(),
		idproduto: text().notNull(),
		couverartistico: smallint().default(0), // 1=Sim, 0=Não
		dataabertura: date().default(sql`CURRENT_DATE`),
		idcontamesa: text().notNull(),
		idgarcom: text().notNull(),
		nomeproduto: varchar({ length: 120 }).notNull(),
		observacao: text(),
		quantidade: numeric({ precision: 12, scale: 3 }).notNull(),
		precopromocao: numeric({ precision: 12, scale: 3 }).notNull(),
		precoalterado: numeric({ precision: 12, scale: 3 }).notNull(),
		precounitario: numeric({ precision: 12, scale: 3 }).notNull(),
		taxaservico: smallint().default(0), // 1=Sim, 0=Não
		unidademedida: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "contamesaitem_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcontamesa],
			foreignColumns: [contamesa.id],
			name: "contamesaitem_idcontamesa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idgarcom],
			foreignColumns: [usuarios.id],
			name: "contamesaitem_idgarcom_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.unidademedida],
			foreignColumns: [unidademedida.id],
			name: "contamesaitem_unidademedida_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
