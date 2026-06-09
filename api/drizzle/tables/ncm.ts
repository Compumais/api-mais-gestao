import {
	bigint,
	foreignKey,
	index,
	numeric,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas";

// Cadastro de Nomenclatura Comum do Mercosul (NCM)
export const ncm = pgTable(
	"ncm",
	{
		id: text().primaryKey().notNull(), // Id
		idempresa: text().notNull(), // ID da empresa
		codigo: varchar({ length: 10 }), // Código
		codigoexcecao: varchar({ length: 3 }), // Codigo de exceção de NCM - de acordo com a tabela de incidencia do imposto de produtos industrializados (TIPI)
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		descricao: text(), // Descrição
		idnaturezaoperacaoestado: text(), // ID da tabela de natureza de operação por estado
		idtabelamva: text(), // ID da tabela de MVA
		inativo: smallint(), // Inativo
		modalidadebcicmsst: smallint(), // Modalidade BC do ICMS ST
		percentualimpostoaproximado: numeric({ precision: 5, scale: 2 }), // Percentual aproximado de impostos
		percentualmva: numeric({ precision: 5, scale: 2 }), // Percentual do MVA
		percentualreducaomva: numeric({ precision: 5, scale: 2 }), // Percentual de redução do MVA
		percimpostoaproximportacao: numeric({ precision: 5, scale: 2 }), // Percentual aproximado de impostos para produto importado
		tipo: smallint(), // Tipo de registro
	},
	(table) => [
		index("ncm_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("ncm_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "ncm_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
