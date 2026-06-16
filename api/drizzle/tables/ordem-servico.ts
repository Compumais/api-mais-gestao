import {
	bigint,
	date,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { empresa } from "./empresas.js";
import { entidade } from "./entidade.js";
import { produtos } from "./produtos.js";
import { tipodocumentofinanceiro } from "./tipo-documento-financeiro.js";
import { usuarios } from "./usuarios.js";

export const ordemservico = pgTable(
	"ordemservico",
	{
		id: text().primaryKey().notNull(), // Chave primária
		idempresa: text().notNull(), // ID da empresa
		agendamento: timestamp({ precision: 3, mode: "string" }), // Data de agendamento
		anofabricacao: smallint(), // Ano de fabricação do veículo
		aprovacaoorcamento: date(), // Data de aprovação da OS orçamento
		caracteristicas: varchar({ length: 50 }), // Características
		ccf: integer(), // CCF da operacao que emitiu o cupom fiscal
		cnpjcpfcliente: varchar({ length: 18 }), // CNPJ/CPF do cliente
		cnpjfilial: varchar({ length: 18 }), // CNPJ da filial
		codigo: bigint({ mode: "number" }), // Código
		compra: date(), // Data de compra
		coo: integer(), // COO da operação que emitiu o cupom fiscal
		cooger: integer(), // COO do relatorio gerencial que a Ordem de serviço foi impressa
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		data: timestamp({ precision: 3, mode: "string" }), // Data e hora
		datahoraimpressao: timestamp({ precision: 3, mode: "string" }), // Data e hora de impressao do documento
		datahoraretirada: timestamp({ precision: 3, mode: "string" }), // Data e hora de retirada do objeto
		dataos: date(), // Data
		dataultimoevento: timestamp({ precision: 3, mode: "string" }), // Data do último evento
		descontosubtotal: numeric({ precision: 12, scale: 2 }), // Valor do desconto do sub-total
		descricaoitem: text(), // Descrição do item
		descricaotipoultimoevento: text(), // Descrição último tipo evento
		descricaoultimoevento: text(), // Descrição último evento
		descsubtotalproduto: numeric({ precision: 12, scale: 2 }), // Valor do desconto do sub-total dos produtos
		descsubtotalservico: numeric({ precision: 12, scale: 2 }), // Valor do desconto do sub-total dos serviços
		deslocamento: varchar({ length: 50 }), // Deslocamento
		ecfmarca: varchar({ length: 20 }), // Marca da ECF
		ecfmfadicional: varchar({ length: 1 }), // Letra indicativa de MF adicional
		ecfmodelo: varchar({ length: 20 }), // Modelo da ECF
		ecfserie: varchar({ length: 20 }), // Série da ECF
		ecftipo: varchar({ length: 7 }), // Tipo da ECF
		entradaitem: timestamp({ precision: 3, mode: "string" }), // Data da entrada do item
		existeevento: smallint(), // Existe evento
		extra1: text(), // Campo Extra para informações adicionais 1
		extra2: text(), // Campo Extra para informações adicionais 2
		extra3: text(), // Campo Extra para informações adicionais 3
		extra4: text(), // Campo Extra para informações adicionais 4
		extra5: text(), // Campo Extra para informações adicionais 5
		extra6: text(), // Campo Extra para informações adicionais 6
		extra7: text(), // Campo Extra para informações adicionais 7
		extra8: text(), // Campo Extra para informações adicionais 8
		extra9: text(), // Campo Extra para informações adicionais 9
		extra10: text(), // Campo Extra para informações adicionais 10
		extra11: text(), // Campo Extra para informações adicionais 11
		extra12: text(), // Campo Extra para informações adicionais 12
		extra13: text(), // Campo Extra para informações adicionais 13
		extra14: text(), // Campo Extra para informações adicionais 14
		extra15: text(), // Campo Extra para informações adicionais 15
		extra16: text(), // Campo Extra para informações adicionais 16
		faturouparacupom: smallint(), // Indica se faturou para cupom fiscal
		faturouparanota: smallint(), // Indica se faturou para nota fiscal
		fimservico: timestamp({ precision: 3, mode: "string" }), // Data/hora do fim do serviço
		garantia: smallint(), // Identifica se o produto esta na Garantia
		geroufinanceiro: smallint(), // Identifica se gerou financeiro
		hash: bigint({ mode: "number" }), // Hash de controle de alteração do registro
		hashpafnfce: bigint({ mode: "number" }), // Hash de controle de alteração do registro do PAF-NFC-e
		idarea: text(), // ID da área
		idatendente: text(), // ID do atendente
		idcliente: text(), // ID do cliente
		idcondicaopagamento: text(), // Condição de pagamento
		iddavos: text(), // Dav-OS
		iddocumentofiscal: text(), // ID do documento fiscal
		idfilial: text(), // ID da filial
		idobjeto: text(), // ID do objeto a ser consertado
		idorcamentofaturamento: text(), // ID do orçamento de faturamento
		idosmesclada: text(), // ID da OS que foi gerada atraves da mesclagem
		idosorigem: text(), // ID da OS que quue foi duplicada
		idprioridade: text(), // ID da prioridade
		idproduto: text(), // ID do produto
		idrepresentante2: text(), // ID do segundo comissionado
		idtipodocumentofinanceiro: text(), // ID do tipo de documento financeiro
		idtipoproblema: text(), // ID do tipo de problema
		idultimotecnico: text(), // ID do último ténico
		idusuario: text(), // ID do usuário que cadastrou a O.S.
		idusuarioaprovacaoorcamento: text(), // ID do usuário que aprovou o orçamento
		idusuarioentrega: text(), // ID do usuário que executou a retirada
		idusuarioliberouatraso: text(), // ID do usuário que liberou venda para cliente com atrasos
		idusuarioliberoulimite: text(), // ID do usuário que liberou venda acima do limite de crédito
		impresso: smallint(), // Impresso
		inicioservico: timestamp({ precision: 3, mode: "string" }), // Data/hora do início do serviço
		laudotecnico: text(), // Laudo Técnico
		localatendimento: smallint(), // Local de atendimento
		marca: varchar({ length: 30 }), // Marca do veiculo
		modelo: varchar({ length: 30 }), // Modelo do veículo
		nomecliente: varchar({ length: 60 }), // Nome do cliente
		nomeresponsavelretirada: text(), // Nome do responsável que fez a retirada
		numerofabricacao: varchar({ length: 30 }), // Número de fabricação
		numeronotafiscal: varchar({ length: 20 }), // Número da nota fiscal de compra
		observacao: text(), // Observações
		observacaogarantia: text(), // Observações da garantia
		orcamento: smallint(), // Indica se a OS foi gravada como orçamento
		orcamentoaprovado: smallint(), // Indica se a OS orçamento foi aprovada
		pautapreco: smallint(), // Pauta de preço utilizada na venda
		pdv: smallint(), // Número do pdv que emitiu o cupom fiscal
		percdescsubtotalproduto: numeric({ precision: 5, scale: 2 }), // Percentual de desconto do subtotal dos produtos
		percdescsubtotalservico: numeric({ precision: 5, scale: 2 }), // Percentual de desconto do subtotal dos serviços
		percentualdescontosubtotal: numeric({ precision: 5, scale: 2 }), // Percentual de desconto do subtotal
		placa: varchar({ length: 10 }), // Placa do veículo
		previsaoconclusao: date(), // Previsão de conclusão
		problemadescrito: text(), // Problema descrito
		renavam: varchar({ length: 11 }), // Renavam do veículo
		saidaitem: timestamp({ precision: 3, mode: "string" }), // Data da saída do item
		servicoexecutado: text(), // Serviço(s) executado(s)
		serviconaoexecutado: text(), // Serviço(s) não executado(s)
		status: smallint(), // Status da ordem de serviço
		tipogarantia: smallint(), // Tipo de garantia
		titulodav: varchar({ length: 30 }), // Titulo do dav
		validadegarantia: date(), // Data de validade da garantia
		validadeorcamento: date(), // Data de validade da OS orçamento
		valor: numeric({ precision: 12, scale: 2 }), // Valor
		valorbrinde: numeric({ precision: 12, scale: 2 }), // Valor Total Brinde
		valorprodutos: numeric({ precision: 12, scale: 2 }), // Valor dos produtos
		valorservicos: numeric({ precision: 12, scale: 2 }), // Valor dos serviços
	},
	(table) => [
		index("ordemservico_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("ordemservico_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("int8_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "ordemservico_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcliente],
			foreignColumns: [entidade.id],
			name: "fk_ordemservico_entidade",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idrepresentante2],
			foreignColumns: [entidade.id],
			name: "fk_ordemservico_representante2",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idatendente],
			foreignColumns: [entidade.id],
			name: "fk_ordemservico_atendente",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idultimotecnico],
			foreignColumns: [entidade.id],
			name: "fk_ordemservico_ultimo_tecnico",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idproduto],
			foreignColumns: [produtos.id],
			name: "fk_ordemservico_produto",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipodocumentofinanceiro],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "fk_ordemservico_tipodocfin",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idosmesclada],
			foreignColumns: [table.id],
			name: "fk_ordemservico_osmesclada",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idosorigem],
			foreignColumns: [table.id],
			name: "fk_ordemservico_osorigem",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "fk_ordemservico_usuario_cad",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuarioaprovacaoorcamento],
			foreignColumns: [usuarios.id],
			name: "fk_ordemservico_usuaprovorc",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuarioentrega],
			foreignColumns: [usuarios.id],
			name: "fk_ordemservico_usuario",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);
