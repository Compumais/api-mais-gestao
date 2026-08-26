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

export type TipoBlocoModeloImpressaoPedido =
	| "cabecalhoEmpresa"
	| "titulo"
	| "textoLivre"
	| "dadosPedido"
	| "cliente"
	| "observacao"
	| "itens"
	| "totais"
	| "assinaturas"
	| "rodape";

export type BlocoModeloImpressaoPedido = {
	id: string;
	tipo: TipoBlocoModeloImpressaoPedido;
	coluna?: "cheia" | "esquerda" | "direita";
	props?: {
		titulo?: string;
		texto?: string;
		campos?: string[];
	};
};

export type LayoutModeloImpressaoPedido = BlocoModeloImpressaoPedido[];

export const modeloimpressaopedido = pgTable(
	"modeloimpressaopedido",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		nome: varchar({ length: 120 }).notNull(),
		descricao: varchar({ length: 255 }),
		layout: jsonb("layout")
			.$type<LayoutModeloImpressaoPedido>()
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
		index("modeloimpressaopedido_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "modeloimpressaopedido_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
