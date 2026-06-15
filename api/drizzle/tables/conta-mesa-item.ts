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
import { contamesa } from "./conta-mesa";
import { entidade } from "./entidade";
import { produtos } from "./produtos";
import { unidademedida } from "./unidade-medida";
import { usuarios } from "./usuarios";

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
		unidademedida: varchar({ length: 6 }).notNull(),
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
