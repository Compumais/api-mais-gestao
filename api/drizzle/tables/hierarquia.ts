import {
	bigint,
	char,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { cest } from "./cest.js";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";

export const hierarquia = pgTable(
	"hierarquia",
	{
		id: text().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(), // ID da empresa
		aliquotacofins: numeric({ precision: 12, scale: 4 }), // Alíquota do COFINS de Saída
		aliquotacofinsentrada: numeric({ precision: 12, scale: 4 }), // Alíquota do COFINS de Entrada
		aliquotafcp: numeric({ precision: 5, scale: 2 }), // Percentual de Fundo de combate a pobreza
		aliquotafcpnf: numeric({ precision: 5, scale: 2 }), // Aliquota do FCP para a Nota Fiscal
		aliquotaicmsinterna: numeric({ precision: 5, scale: 2 }), // Percentual da aliquota de ICMS dentro do estado usada pelo PAF-ECF
		aliquotaicmsnf: numeric({ precision: 5, scale: 2 }), // Aliquota do ICMS para a Nota Fiscal
		aliquotapis: numeric({ precision: 12, scale: 4 }), // Alíquota do PIS de Saída
		aliquotapisentrada: numeric({ precision: 12, scale: 4 }), // Alíquota do PIS de entrada
		aliquotareducaoicmsnfcesat: numeric({ precision: 7, scale: 4 }), // Percentual da aliquota de redução ICMS para NFCE/SAT
		classe: smallint(), // Identifica o tipo de estoque: 0 = Revenda; 1 = Matéria prima; 2 = Mat. embalagem; 3 = Consumo interno
		codigo: varchar({ length: 30 }), // Código
		comissao: numeric({ precision: 5, scale: 2 }), // Percentual de comissão
		comissaoaprazo: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo
		comissaoaprazopauta1: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo da pauta 1
		comissaoaprazopauta2: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo da pauta 2
		comissaoaprazopauta3: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo da pauta 3
		comissaoaprazopauta4: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas a prazo da pauta 4
		comissaoavista: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista
		comissaoavistapauta1: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista da pauta 1
		comissaoavistapauta2: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista da pauta 2
		comissaoavistapauta3: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista da pauta 3
		comissaoavistapauta4: numeric({ precision: 5, scale: 2 }), // Percentual de comissão para vendas à vista da pauta 4
		comissaogestaopreco: numeric({ precision: 5, scale: 2 }), // % Comissão margem - Gestão
		comissaopauta1: numeric({ precision: 5, scale: 2 }), // Percentual de comissão da pauta 1
		comissaopauta2: numeric({ precision: 5, scale: 2 }), // Percentual de comissão da pauta 2
		comissaopauta3: numeric({ precision: 5, scale: 2 }), // Percentual de comissão da pauta 3
		comissaopauta4: numeric({ precision: 5, scale: 2 }), // Percentual de comissão da pauta 4
		comissaoquitacao: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação
		comissaoquitacaopauta1: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação da pauta 1
		comissaoquitacaopauta2: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação da pauta 2
		comissaoquitacaopauta3: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação da pauta 3
		comissaoquitacaopauta4: numeric({ precision: 5, scale: 2 }), // Percentual de comissão sobre a quitação da pauta 4
		cstcofins: varchar({ length: 2 }), // Situção tributária do COFINS de Saída
		cstcofinsentrada: varchar({ length: 2 }), // Situção tributária do COFINS de Entrada
		csticms: varchar({ length: 3 }), // Código da situaçao tributaria de saída do ICMS
		cstpis: varchar({ length: 2 }), // Situção tributária do PIS de Saída
		cstpisentrada: varchar({ length: 2 }), // Situção tributária do PIS de Entrada
		cstsnicms: varchar({ length: 3 }), // Código da situaçao tributaria de saída do ICMS para o Simples Nacional
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		custovariavelgestaopreco: numeric({ precision: 5, scale: 2 }), // % Custo variável margem - Gestão
		diferencialicmsgestaocusto: numeric({ precision: 5, scale: 2 }), // % Diferencial ICMS - Gestão
		enviamobile: smallint(), // Identifica se este grupo será enviado ao Unimobile Vendas
		iat: char({ length: 1 }), // Indicador de arredondamento ou truncamento. A=Arredondamento; T=Truncamento
		icone: text(), // Icone (bytea)
		idbasecalculocredito: text(), // Base de cálculo de credito
		idbeneficiofiscalnf: text(), // Benefício Fiscal
		idbeneficiofiscaloperacao: text(), // Benefício Fiscal
		idcest: text(), // ID do CEST
		idcomprador: text(), // ID do comprador
		idcontribuicaoprevidenciaria: text(), // ID Receita sem contribuição
		idcontribuicaosocialapurada: text(), // ID Contribuição social apurada
		idcontribuicaosocialapurcofins: text(), // Contribuição social apurada cofins
		identificacliente: smallint(), // Determina se vai ser necessário identificar o cliente nas vendas do PAF-ECF
		identificaconsumidor: smallint(), // Força identificar o consumidor no pdv
		idncm: text(), // ID da Nomenclatura Comum do Mercosul
		idreceitasemcontribuicao: text(), // ID Receita sem contribuição
		idtabelafinanciamento: text(), // Id da tabela de financiamento
		idtabelamva: text(), // ID tabela MVA
		idtipocredito: text(), // ID Tipo de crédito
		ipi: numeric({ precision: 5, scale: 2 }), // Percentual de IPI de saída
		ipientrada: numeric({ precision: 5, scale: 2 }), // Percentual de IPI de entrada
		ippt: char({ length: 1 }), // Indicador de produção própria ou de terceiros. P=Próprio; T=Terceiros
		lucrobrutomaximo: numeric({ precision: 12, scale: 2 }), // Lucro bruto máximo
		lucrobrutominimo: numeric({ precision: 12, scale: 2 }), // Lucro bruto mínimo
		modalidadeicmsst: smallint(), // Modalidade de determinação da base de cálculo do ICMS de substituição
		modocalculoipi: smallint(), // Modo de cálculo do IPI de saida
		modocalculoipientrada: smallint(), // Modo de cálculo do IPI de etnrada
		motivodesoneracaoicms: smallint(), // Motivo desoneracao ICMS
		motivodesoneracaonf: smallint(), // Motivo desoneração NF
		ncm: varchar({ length: 10 }), // Nomenclatura Comum do Mercosul
		nome: varchar({ length: 40 }), // Nome
		nummaxcombinacoes: integer(), // Número máximo de combinações
		origem: smallint(), // Origem do produto - 0=Nacional; 1=Importação direta; 2=Adquirida no mercado interno
		outrasdespesasgestaopreco: numeric({ precision: 5, scale: 2 }), // % Outras Despesas margem - Gestão
		outrosimpostosgestaopreco: numeric({ precision: 5, scale: 2 }), // % Outros impostos margem - Gestão
		outrosvalorescredgestaocusto: numeric({ precision: 5, scale: 2 }), // % Outros valores débito - Gestão
		outrosvaloresdebgestaocusto: numeric({ precision: 5, scale: 2 }), // % Outros valores crédito - Gestão
		pedevendedor: smallint(), // Identifica se é necessário identificar o vendedor nas vendas pelo PAF-ECF
		percentualcustoindireto: numeric({ precision: 5, scale: 2 }), // Custo operacional do grupo de produto
		percentualmarkdownmaximo: numeric({ precision: 12, scale: 2 }), // Percentual markdown máximo
		percentualmarkdownminimo: numeric({ precision: 12, scale: 2 }), // Percentual markdown mínimo
		percentualmarkupmaximo: numeric({ precision: 12, scale: 2 }), // Percentual markup máximo
		percentualmarkupminimo: numeric({ precision: 12, scale: 2 }), // Percentual markup mínimo
		percentualreducaoicms: numeric({ precision: 7, scale: 4 }), // Percentual de redução do ICMS
		percentualreducaomva: numeric({ precision: 5, scale: 2 }), // Percentual de reduçao de MVA
		possuialiquotacombatepobreza: smallint(), // Identificação se o produto possui alíquota do fundo de combate à pobreza
		precodiferenciado: smallint(), // Preço diferenciado
		prefixogrupoproduto: varchar({ length: 10 }), // Prefixo do grupo de produto
		produtoseramodelofichatecnica: smallint(), // Produto será modelo de ficha técnica
		produtoteracotacao: smallint(), // Identifica se o produto tera cotação
		situacaotributariaentrada: varchar({ length: 3 }), // Código da situaçao tributaria de entrada do ICMS
		situacaotributariaipi: varchar({ length: 3 }), // Situação tributaria do IPI de saída
		situacaotributariaipientrada: varchar({ length: 3 }), // Situação tributaria do IPI de entrada
		situacaotributariasnentrada: varchar({ length: 3 }), // Código da situaçao tributaria de entrada do ICMS para o Simples Nacional
		tabelafinanciamento: varchar({ length: 6 }), // Código da tabela de financiamento
		tipoproduto: varchar({ length: 2 }), // Tipo de produto
		tributacao: varchar({ length: 7 }), // Tributação do produto para o PAF-ECF
		tributacaoespecial: varchar({ length: 7 }), // Tributação especial
		tributacaoespecialnfcesat: varchar({ length: 3 }), // Situação tributária especial para NFC-e/SAT
		tributacaosn: varchar({ length: 3 }), // Tributação para NFC-e do Simples Nacional
		valoricmsst: numeric({ precision: 12, scale: 2 }), // Percentual da modalidade de determinação da base de cálculo do ICMS de substituição
	},
	(table) => [
		index("hierarquia_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "hierarquia_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcest],
			foreignColumns: [cest.id],
			name: "fk_hierarquia_cest",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcomprador],
			foreignColumns: [entidade.id],
			name: "fk_hierarquia_comprador",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
