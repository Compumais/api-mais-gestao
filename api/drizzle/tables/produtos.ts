import { sql } from "drizzle-orm";
import {
	char,
	date,
	foreignKey,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { cest } from "./cest";
import { cfop } from "./cfop";
import { empresa } from "./empresas";
import { entidade } from "./entidade";
import { hierarquia } from "./hierarquia";
import { ncm } from "./ncm";
import { planocontas } from "./plano-contas";
import { receitasemcontribuicao } from "./receitasem-contribuicao";
import { unidademedida } from "./unidade-medida";

export const produtos = pgTable(
	"produtos",
	{
		id: text().primaryKey().notNull(),
		idempresa: text().notNull(),
		descricao: varchar({ length: 100 }).notNull(),
		aliquotacofins: numeric({ precision: 12, scale: 2 }),
		aliquotaconfinsentrada: numeric({ precision: 12, scale: 2 }),
		aliquotafcpnf: numeric({ precision: 12, scale: 2 }),
		aliquotaicmsdiferencialentrada: numeric({ precision: 12, scale: 2 }),
		aliquotaicmsinterna: numeric({ precision: 12, scale: 2 }),
		aliquotapis: numeric({ precision: 12, scale: 2 }),
		aliquotapisconfinsentradapreco: numeric({ precision: 12, scale: 2 }),
		aliquotapisconfinssaidapreco: numeric({ precision: 12, scale: 2 }),
		aliquotapisentrada: numeric({ precision: 12, scale: 2 }),
		aliquotareducaoicmsnfcesat: numeric({ precision: 12, scale: 2 }),
		alteraprecopdv: integer(),
		alturashop: numeric({ precision: 12, scale: 2 }),
		anofabricacao: integer(),
		anomodelofabricacao: integer(),
		atualizacaopreco: date(),
		baseicmsconhecimento: numeric({ precision: 12, scale: 2 }),
		baseipiultimanota: numeric({ precision: 12, scale: 2 }),
		basepiscofinsconhecimento: numeric({ precision: 12, scale: 2 }),
		basepiscofinsentradapreco: numeric({ precision: 12, scale: 2 }),
		caminhoicone: varchar(),
		caminhoimagem: varchar(),
		cest: integer(),
		cfopvendaecf: integer(),
		codigo: integer(),
		comissao: numeric({ precision: 12, scale: 2 }),
		comissaoavista: numeric({ precision: 12, scale: 2 }),
		comissaoprazo: numeric({ precision: 12, scale: 2 }),
		cstcofins: numeric({ precision: 12, scale: 2 }),
		cstcofinsentrada: numeric({ precision: 12, scale: 2 }),
		cstpis: numeric({ precision: 12, scale: 2 }),
		cstpisentrada: numeric({ precision: 12, scale: 2 }),
		cstservico: numeric({ precision: 12, scale: 2 }),
		custoalteradopor: text(),
		custoaquisicao: numeric({ precision: 12, scale: 2 }),
		custoindireto: numeric({ precision: 12, scale: 2 }),
		customedioinicial: numeric({ precision: 12, scale: 2 }),
		customediopendente: numeric({ precision: 12, scale: 2 }),
		custovariavelgestaopreco: numeric({ precision: 12, scale: 2 }),
		dataalteracao: date(),
		dataalteracaopreco: date(),
		dataultimacompra: date(),
		datacadastro: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		diferencialicmsgestaocusto: numeric({ precision: 12, scale: 2 }),
		diferidoicmsentrada: numeric({ precision: 12, scale: 2 }),
		ean: integer(),
		eantributavel: integer(),
		endereco: text(),
		fatorconversao: numeric({ precision: 12, scale: 2 }),
		fatorconversaoalternativo: numeric({ precision: 12, scale: 2 }),
		fatorconversaoproducao: numeric({ precision: 12, scale: 2 }),
		fatorconversaounidadeetq: numeric({ precision: 12, scale: 2 }),
		fcpstentrada: numeric({ precision: 12, scale: 2 }),
		fornecedor: text(),
		freteconhecimento: numeric({ precision: 12, scale: 2 }),
		fretegratismercadolivre: integer(),
		freteoutrasdespesas: numeric({ precision: 12, scale: 2 }),
		funrural: integer(),
		icmsconhecimento: numeric({ precision: 12, scale: 2 }),
		icmsentrada: numeric({ precision: 12, scale: 2 }),
		icmssaida: numeric({ precision: 12, scale: 2 }),
		icmsstentrada: numeric({ precision: 12, scale: 2 }),
		icone: text(),
		idbasecalculocredito: text(),
		idbeneficiofiscalnf: text(),
		idbeneficiofiscaloperacao: text(),
		idcest: text(),
		idcfopcontroleperda: text(),
		idcfopentrada: text(),
		idcfopentradadevolucaoexterna: text(),
		idcfopentradadevolucaointerna: text(),
		idcfopentradaexterna: text(),
		idcfopentradatransfexterna: text(),
		idcfopentradatransfinterna: text(),
		idunidademedida: text(),
		idgrupo: text(),
		preco: numeric({ precision: 12, scale: 2 }),
		iat: char({ length: 1 }), // A=Arredondamento, T=Truncamento
		referencia: varchar({ length: 60 }),
		inativo: integer().default(0), // 0=Ativo, 1=Inativo
		idcfopsaida: text(),
		idcfopsaidadevolucaoexterna: text(),
		idcfopsaidadevolucaointerna: text(),
		idcfopsaidaexterna: text(),
		idcfopsaidaexternanaocontrib: text(),
		idcfopsaidanfce: text(),
		idcfopsaidatransfexterna: text(),
		idcfopsaidatransfinterna: text(),
		idclassificacaofiscal: text(),
		idcomprador: text(),
		idcontribuicaoprevidenciaria: text(),
		idcontribuicaosocialapurada: text(),
		idcontribuicaosocialapurcofins: text(),
		idcreditoestimulado: text(),
		iddepartamento: text(),
		idenquadramentoipientrada: text(),
		idenquadramentoipisaida: text(),
		identificaconsumidor: text(),
		idfabricante: text(),
		idfornecedor: text(),
		idmotivorebaixa: text(),
		idncm: text(),
		idplanocontas: text(),
		idreceitasemcontribuicao: text(),
		imagem: text(),
		ipi: numeric({ precision: 12, scale: 2 }),
		ipientrada: numeric({ precision: 12, scale: 2 }),
		ipiultimanota: numeric({ precision: 12, scale: 2 }),
		ippt: varchar({ length: 1 }), // P=Mercadoria manugaturada, T=Mercadoria manufaturada por terceiros;
		kit: integer(), // 0=Produto nao e kit, 1=Produto um kit
		modalidadeicmsst: integer(),
		modocalculoipi: integer(),
		modocalculoipientrada: integer(),
		modocalculopreco: integer(),
		motivodesoneracaoicms: integer(),
		motivodesoneracaonf: integer(),
		ncm: varchar({ length: 10 }),
		nome: varchar({ length: 120 }).notNull(),
		nomeecf: varchar({ length: 120 }),
		numerofci: varchar({ length: 36 }),
		observacoes: text(),
		opcional: integer(), // 0=Produto nao e opcional, 1=Produto e opcional
		origem: integer(), // 0=Nacional, 1=Estrangeira - Importação direta, 2=Estrangeira - Adquirida no mercado interno
		origemcusto: integer(), // 0=NF, 1=Usuário, 2=Registro de produção
		outrasdespesasgestaopreco: numeric({ precision: 5, scale: 2 }),
		outrosimpostoscusto: numeric({ precision: 15, scale: 6 }),
		outrosvalorescredgestaocusto: numeric({ precision: 5, scale: 2 }),
		outrosvaloresdebgestaocusto: numeric({ precision: 5, scale: 2 }),
		pedevendedor: integer(),
		percentualfcpentrada: numeric({ precision: 15, scale: 6 }),
		percentualfcpstentrada: numeric({ precision: 15, scale: 6 }),
		percentualfreteoutrasdespesas: numeric({ precision: 15, scale: 6 }),
		percentualipisaida: numeric({ precision: 5, scale: 2 }),
		percentuallucroajustado: numeric({ precision: 12, scale: 2 }),
		percentualreducaoicms: numeric({ precision: 7, scale: 4 }),
		percentualreducaomva: numeric({ precision: 5, scale: 2 }),
		percoutrosvalorespreco: numeric({ precision: 5, scale: 2 }),
		percredbasepiscofinsentrada: numeric({ precision: 5, scale: 2 }),
		percredbasepiscofinssaida: numeric({ precision: 5, scale: 2 }),
		pesavel: integer(), // 0=Produto nao e pesavel, 1=Produto e pesavel
		peso: numeric({ precision: 12, scale: 2 }),
		podeserbrinde: integer(), // 0=Produto nao pode ser brinde, 1=Produto pode ser brinde
		precoultimacompra: numeric({ precision: 12, scale: 2 }),
		quantidademaxima: integer(),
		quantidademinima: integer(),
		quantidadepadrao: integer(),
		situacaotributariasn: varchar({ length: 3 }),
		situacaotributariasnentrada: varchar({ length: 3 }),
		tipo: varchar({ length: 1 }), // P=Produto, S=Serviço
		tipofatorconversaounidadeetq: integer(), // 1=Multiplcação, 2=Divisão
		tipoporcao: integer(), // 0=Grama, 1=Militro, 2=Unidade
		tipoproduto: varchar({ length: 2 }),
		tipoquantidade: integer(),
		tributacao: varchar({ length: 7 }),
		tributacaoespecial: varchar({ length: 7 }),
		tributacaoespecialnfcesat: varchar({ length: 3 }),
		tributacaosn: varchar({ length: 3 }),
		ultimaaliquotafcpst: numeric({ precision: 12, scale: 2 }),
		ultimaaliquotaicmsst: numeric({ precision: 12, scale: 2 }),
		ultimabasefcpst: numeric({ precision: 12, scale: 2 }),
		ultimodescontonotaentrada: numeric({ precision: 12, scale: 2 }),
		ultimovalorfcpst: numeric({ precision: 12, scale: 2 }),
		ultimovaloricmsst: numeric({ precision: 12, scale: 2 }),
		ultimovaloricmssubstituto: numeric({ precision: 12, scale: 2 }),
		unidademedida: varchar({ length: 6 }),
		valoricmsdiferencialentrada: numeric({ precision: 12, scale: 2 }),
		valoricmsst: numeric({ precision: 12, scale: 2 }),
		valoripiultimanota: numeric({ precision: 12, scale: 2 }),
		valorlancamentospedcusto: numeric({ precision: 12, scale: 2 }),
		valorlancamentospedcustodebito: numeric({ precision: 12, scale: 2 }),
		venderpeloprecototal: integer(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "produtos_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.fornecedor],
			foreignColumns: [entidade.id],
			name: "produtos_fornecedor_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcomprador],
			foreignColumns: [entidade.id],
			name: "produtos_idcomprador_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfopcontroleperda],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopcontroleperda_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopsaidanfce],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopsaidanfce_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentrada],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentrada_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopsaida],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopsaida_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradadevolucaoexterna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradadevolucaoexterna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradadevolucaointerna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradadevolucaointerna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradaexterna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradaexterna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradatransfexterna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradatransfexterna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcfopentradadevolucaointerna],
			foreignColumns: [cfop.id],
			name: "produtos_idcfopentradatransfinterna_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idplanocontas],
			foreignColumns: [planocontas.id],
			name: "produtos_idplanocontas_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idncm],
			foreignColumns: [ncm.id],
			name: "produtos_idncm_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcest],
			foreignColumns: [cest.id],
			name: "produtos_idcest_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idunidademedida],
			foreignColumns: [unidademedida.id],
			name: "produtos_idunidademedida_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idgrupo],
			foreignColumns: [hierarquia.id],
			name: "produtos_idgrupo_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idreceitasemcontribuicao],
			foreignColumns: [receitasemcontribuicao.id],
			name: "produtos_idreceitasemcontribuicao_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
