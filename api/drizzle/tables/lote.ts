import {
	date,
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { produtos } from "./produtos.js";

const numeric186 = () => numeric({ precision: 18, scale: 6, mode: "string" });

export const lote = pgTable(
	"lote",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		idproduto: text().notNull(),
		numero: varchar({ length: 20 }).notNull(),
		datafabricacao: date(),
		datavalidade: date(),
		codigoagregacao: varchar({ length: 20 }),
		quantidade: numeric186().default("0").notNull(),
		quantidadefiscal: numeric186().default("0").notNull(),
		inativo: smallint().default(0).notNull(),
	},
	(table) => [
		uniqueIndex("lote_empresa_produto_numero_key").on(
			table.idempresa,
			table.idproduto,
			table.numero,
		),
		index("lote_idempresa_idx").on(table.idempresa),
		index("lote_idproduto_idx").on(table.idproduto),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "lote_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "lote_idproduto_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);
