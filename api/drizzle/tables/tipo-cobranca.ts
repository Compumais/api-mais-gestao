import {
	foreignKey,
	integer,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { tipodocumentofinanceiro } from "./tipo-documento-financeiro.js";

export const tipocobranca = pgTable(
	"tipocobranca",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		codigo: integer().notNull(),
		descricao: varchar({ length: 120 }).notNull(),
		idtipodocumentofinanceiro: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "fk_tipocobranca_empresa",
		}),
		foreignKey({
			columns: [table.idtipodocumentofinanceiro],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "fk_tipocobranca_tipodocumentofinanceiro",
		}),
	],
);
