import { bigint, foreignKey, index, pgTable, smallint, text, varchar } from "drizzle-orm/pg-core";
import { empresa } from "./empresas";
import { planocontas } from "./plano-contas";
import { tipodocumentofinanceiro } from "./tipo-documento-financeiro";

export const operacaofiscal = pgTable(
	"operacaofiscal",
	{
		id: text().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(), // ID da empresa
		adicionarpiscofinsinfcomp: smallint(), // Indica se o PIS e COFINS irá ser informado nas informações adicionais
		codigocfopservicog2ka: varchar({ length: 1 }), // Codigo cfop serviço G2ka
		conferencianotafiscal: smallint(), // Nota fiscal precisa de conferência
		conferenciapedido: smallint(), // Relacionar pedido de compra para conferência financeira
		consideradevolucaovenda: smallint(), // Considera devolução de venda
		considerainscricaoestadualsub: smallint(), // Utilizar a incrição estadual de substituto
		considerarproduto: smallint(), // Considerar produtos na nota fiscal
		considerarservico: smallint(), // Considerar serviços na nota fiscal
		consideravenda: smallint(), // Considera a natureza de operação fiscal como venda - 0=Não 1=Sim
		consignacao: smallint(), // Consignação
		consignacaoentrada: smallint(), // Consignação de entrada
		consumidorfinal: smallint(), // Consumidor final
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		digitarimpostositemnotasaida: smallint(), // Permitir digitar impostos do item na nota fiscal de saída
		exigirdocumentoreferenciado: smallint(), // Exigir documento fiscal referenciado
		exportacao: smallint(), // Indica se a operação é de exportacao
		finalidadeemissaonfe: smallint(), // Finalidade emissão NF-e
		fundamentacaolegalestado: varchar({ length: 100 }), // Fundamentação legal do Estado
		habilitabaseipiitemnota: smallint(), // Habilita campo de base de IPI no item da nota fiscal
		habilitabasepiscofinsitemnota: smallint(), // Habilita campo de base de PIS/COFINS no item da nota fiscal
		idajustedocfiscalcreditoicms: text(), // Ajuste do documento fiscal para crédito de ICMS
		idcondicaopagamento: text(), // ID da condição de pagamento
		idobslancfiscalcreditoicms: text(), // Observação do lançamento fiscal para crédito de ICMS
		idplanocontas: text(), // ID do plano de contas
		idtipodocumentofinanceiro: text(), // ID do tipo de documento financeiro
		importacao: smallint(), // Indica se a operação é de importacao
		informartotaismanualmente: smallint(), // Manipular os impostos na nota fiscal de entrada
		integracao: smallint(), // Integração com o financeiro 0=Sem;1=Contas a receber;2=Contas a pagar
		naoconsideratribespecproduto: smallint(), // Indica se a tributação especial indicada no produto será considerada na incusão na nota fiscal
		nome: varchar({ length: 40 }), // Nome
		permitirbaixarlotevencido: smallint(), // Permitir baixar estoque de lote vencido em modo PEPS
		presencaconsumidor: smallint(), // Presença do consumidor
		regimeespecial: smallint(), // Documento fiscal emitido com base em regime especial ou norma especifica
		somarcofinsoutrasdesp: smallint(), // Somar COFINS nas outras despesas
		somardespacesoutrasdesp: smallint(), // Somar despesas acessórias nas outras despesas
		somaricmsoutrasdesp: smallint(), // Somar ICMS nas outras despesas
		somarpisoutrasdesp: smallint(), // Somar PIS nas outras despesas
		somarsiscomexoutrasdesp: smallint(), // Somar taxa SISCOMEX nas outras despesas
		tipovalorpreco: smallint(), // Tipo do valor do preço unitário na nota fiscal
	},
	(table) => [
		index("operacaofiscal_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "operacaofiscal_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "fk_operacaofiscal_planocontas",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipodocumentofinanceiro],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "fk_operacaofiscal_tipdocfin",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);