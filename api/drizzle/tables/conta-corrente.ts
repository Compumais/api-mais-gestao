import {
	bigint,
	date,
	foreignKey,
	integer,
	numeric,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { banco } from "./banco.js";
import { contacontabil } from "./conta-contabil.js";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";

export const contacorrente = pgTable(
	"contacorrente",
	{
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		id: text().primaryKey().notNull(),
		descricao: varchar({ length: 50 }),
		idempresa: text().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		codigo: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idbanco: text(),
		agencia: varchar({ length: 25 }),
		abertura: date(),
		numeroconta: varchar({ length: 40 }),
		gerente: varchar({ length: 40 }),
		telefonegerente: varchar({ length: 20 }),
		cnpjcpftitular: varchar({ length: 20 }),
		observacao: varchar({ length: 150 }),
		agenciadv: varchar({ length: 1 }),
		contadv: varchar({ length: 2 }),
		codigocedente: varchar({ length: 20 }),
		codigocedentedv: varchar({ length: 1 }),
		carteira: varchar({ length: 6 }),
		operacao: varchar({ length: 5 }),
		aceite: smallint().default(0),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		nossonumeroseq: bigint({ mode: "number" }),
		codigofornecidoagencia: varchar({ length: 10 }),
		codigofornecidoagenciadv: varchar({ length: 2 }),
		instrucao1: varchar({ length: 100 }),
		instrucao2: varchar({ length: 100 }),
		instrucao3: varchar({ length: 100 }),
		instrucao4: varchar({ length: 100 }),
		especiedocumento: varchar({ length: 3 }),
		tamanhocodigobarras: smallint().default(0),
		tipoimpressao: smallint().default(0),
		bancoemiteboleto: smallint(),
		arquivolicenca: varchar({ length: 255 }),
		diasprotesto: smallint(),
		layoutarquivoremessa: varchar({ length: 100 }),
		sequenciaremessa: integer(),
		outrodadoconfiguracao1: varchar({ length: 20 }),
		outrodadoconfiguracao2: varchar({ length: 20 }),
		layoutarquivoretorno: varchar({ length: 100 }),
		layoutboleto: varchar({ length: 255 }),
		caixa: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idfilial: bigint({ mode: "number" }),
		codigoinstrucao1: varchar({ length: 10 }),
		codigoinstrucao2: varchar({ length: 10 }),
		codigoinstrucao3: varchar({ length: 10 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currenttimemillis: bigint({ mode: "number" }),
		nometitular: varchar({ length: 20 }),
		aceitecobrebem: varchar({ length: 5 }),
		layoutboletopredefinido: varchar({ length: 255 }),
		nomearquivoremessa: varchar({ length: 50 }),
		formatoarquivo: smallint(),
		alturapapelboleto: smallint(),
		margemsuperiorboleto: smallint(),
		margemesquerdaboleto: smallint(),
		naogerarmensagemprotesto: smallint(),
		naogerarmensagemjuros: smallint(),
		naogerarmensagemmulta: smallint(),
		naogerarinstrucaocaixaremessa: smallint(),
		localpagamentoboleto: varchar({ length: 200 }),
		dadoscedentecomprovantesacado: smallint(),
		naousarfatorvencimento: smallint(),
		valorinstrucao1: varchar({ length: 20 }),
		valorinstrucao2: varchar({ length: 20 }),
		valorinstrucao3: varchar({ length: 20 }),
		processaretornonumerodocumento: smallint(),
		razaosocial: varchar({ length: 60 }),
		cnpj: varchar({ length: 18 }),
		cep: varchar({ length: 9 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idestado: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcidade: bigint({ mode: "number" }),
		endereco: varchar({ length: 50 }),
		numeroendereco: varchar({ length: 6 }),
		bairro: varchar({ length: 50 }),
		inativo: smallint(),
		bancogeranossonumero: smallint(),
		emissaoboleto: smallint(),
		distribuicaoboleto: smallint(),
		tipoprotesto: smallint(),
		tipojuros: smallint(),
		tipomulta: smallint(),
		naogerarregistrodetalhe3: smallint(),
		postobeneficiario: varchar({ length: 5 }),
		tipoimpressaouboleto: smallint(),
		tipoidentificacaobeneficiario: smallint(),
		tipoidentificacaoentidade: smallint(),
		caminhoimagemboleto: varchar({ length: 255 }),
		redimensionarimagemboleto: smallint(),
		localimpressaoinstrucaouboleto: smallint(),
		caixapadrao: smallint(),
		numerobeneficiarioboleto: varchar({ length: 30 }),
		numeroversaolayoutarquivo: varchar({ length: 3 }),
		numeroversaolayoutlote: varchar({ length: 3 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idconveniado: bigint({ mode: "number" }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcontacontabilintegracao: bigint({ mode: "number" }),
		valoracrescimo: numeric({ precision: 10, scale: 2 }),
		codificacaoarquivoremessa: varchar({ length: 10 }),
		jurosencargos: numeric({ precision: 12, scale: 2 }),
		multaencargos: numeric({ precision: 12, scale: 2 }),
		// TODO: failed to parse database type 'bytea'
		imagemboleto: text("imagemboleto"),
		tipovalidacaoarquivoretorno: smallint(),
		codigooperacao: varchar({ length: 20 }),
		geracaonossonumero: smallint(),
		calcularencargosfinanceiros: smallint(),
		descontoantecipacao: numeric({ precision: 5, scale: 2 }),
		desconsiderasabado: smallint(),
		desconsideradomingo: smallint(),
		diasdesconsiderarjuros: smallint(),
		diasdesconsiderarmulta: smallint(),
		diasdesconsiderardesconto: smallint(),
		receberpixpdv: smallint(),
		chavepix: varchar({ length: 100 }),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		identidade: bigint({ mode: "number" }),
		tipointegracao: smallint(),
		chaveapi: varchar({ length: 512 }),
		tipoambienteintegracao: smallint(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		idcertificadointegracao: bigint({ mode: "number" }),
		diaslimitepagamento: smallint(),
	},
	(table) => [
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "contacorrent_idempresa.fkey",
		})
			.onDelete("cascade")
			.onUpdate("cascade"),
		foreignKey({
			columns: [table.idbanco],
			foreignColumns: [banco.id],
			name: "contacorrent_idbanco.fkey",
		})
			.onDelete("cascade")
			.onUpdate("cascade"),
		foreignKey({
			columns: [table.identidade],
			foreignColumns: [entidade.id],
			name: "contacorrent_identidade.fkey",
		})
			.onDelete("cascade")
			.onUpdate("cascade"),
		foreignKey({
			columns: [table.idcontacontabilintegracao],
			foreignColumns: [contacontabil.id],
			name: "contacorrent_idcontacontabilintegracao.fkey",
		})
			.onDelete("cascade")
			.onUpdate("cascade"),
	],
);
