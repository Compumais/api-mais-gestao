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
import { empresa } from "./empresas.js";

export const condicaopagamento = pgTable(
	"condicaopagamento",
	{
		id: text().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(), // ID da empresa
		codigo: varchar({ length: 10 }), // Código de cadastro da condição de pagamento
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		descricao: varchar({ length: 512 }), // Descriçao da condicao de pagamento
		dialimite: smallint(), // Dia limite de venda para o calculo do primeiro vencimento
		diavencimento: smallint(), // Dia do vencimento
		dodispositivo: smallint(), // Identifica se esta condição foi incluida no retaguarda(0) ou no dispositivo(1)
		enviamobile: smallint(), // Identifica se esta condição será enviada ao Unimobile Vendas
		escopo: smallint(), // Identifica o escopo de utilização: 0=Compra e venda, 1=Vendas, 2=Compras
		fator: numeric({ precision: 5, scale: 4 }), // Fator da condição de pagamento
		inativo: smallint(), // Identifica se a condição esta inativa
		mesescarencia: smallint(), // Meses de carência para o primeiro vencimento
		naoutilizarnopdv: smallint(), // Identifica se a condição de pagamento vai ser utilizada no Pdv
		parcelas: smallint(), // Número de parcelas
		percentual: numeric({ precision: 5, scale: 2 }), // Percentual de acréscimo ou desconto
		podeserflex: smallint(), // Identifica se esta condição pode gerar flex
		prazomanipulacao: smallint(), // Prazo permitido ao vendedor de manipulação da condição no Unimobile Vendas
		prazomedio: smallint(), // Prazo médio da condição de pagamento
		prazos: varchar({ length: 512 }), // Prazos em dias da condição
		tipo: smallint(), // Tipo de condição de pagamento
	},
	(table) => [
		index("condicaopagamento_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("condicaopagamento_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "condicaopagamento_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);
