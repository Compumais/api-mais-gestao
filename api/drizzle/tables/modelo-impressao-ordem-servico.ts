import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";

export type TipoBlocoModeloImpressaoOs =
	| "cabecalhoEmpresa"
	| "titulo"
	| "textoLivre"
	| "dadosOs"
	| "cliente"
	| "veiculo"
	| "problema"
	| "laudo"
	| "observacao"
	| "itens"
	| "totais"
	| "extras"
	| "assinaturas"
	| "rodape";

export type BlocoModeloImpressaoOs = {
	id: string;
	tipo: TipoBlocoModeloImpressaoOs;
	props?: {
		titulo?: string;
		texto?: string;
		campos?: string[];
	};
};

export type LayoutModeloImpressaoOs = BlocoModeloImpressaoOs[];

export const modeloimpressaoordemservico = pgTable(
	"modeloimpressaoordemservico",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 120 }).notNull(),
		descricao: varchar({ length: 255 }),
		layout: jsonb("layout")
			.$type<LayoutModeloImpressaoOs>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		primario: boolean().default(false).notNull(),
		sistema: boolean().default(false).notNull(),
		ativo: boolean().default(true).notNull(),
		datainclusao: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		atualizadoem: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => [
		index("modeloimpressaoordemservico_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "modeloimpressaoordemservico_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
