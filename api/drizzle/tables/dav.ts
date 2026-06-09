import { bigint, date, foreignKey, index, integer, numeric, pgTable, smallint, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { cfop } from "./cfop";
import { condicaopagamento } from "./condicao-pagamento";
import { contacorrente } from "./conta-corrente";
import { empresa } from "./empresas";
import { entidade } from "./entidade";
import { tipodocumentofinanceiro } from "./tipo-documento-financeiro";
import { usuarios } from "./usuarios";

export const dav = pgTable(
	"dav",
	{
		id: text().primaryKey().notNull(), // Chave primaria
		idempresa: text().notNull(), // ID da empresa
		acrescimo: numeric({ precision: 12, scale: 2 }), // Valor do acrescimo
		agenciabancocheque: varchar({ length: 10 }), // Agencia do banco do cheque a vista
		anofabricacao: smallint(), // Ano de fabricação do veículo
		aprazo: numeric({ precision: 12, scale: 2 }), // Valor pago a prazo
		aprovado: smallint(), // Identifica se o orçamento foi Aprovado
		assinatura: text(), // Assinatura do pedido
		avista: numeric({ precision: 12, scale: 2 }), // Valor pago a vista
		bairroentrega: varchar({ length: 50 }), // Bairro de entrega
		baseicms: numeric({ precision: 12, scale: 2 }), // Base de cálculo do icms
		baseicmssubstituicao: numeric({ precision: 12, scale: 2 }), // Base de cálculo do icms substituição tributária
		carteiradigital: numeric({ precision: 12, scale: 2 }), // Valor de outros pagamentos
		ccf: integer(), // CCF do cupom fiscal onde o dav foi utilizado
		celularentrega: varchar({ length: 40 }), // Número do celular para entrega
		cepentrega: varchar({ length: 9 }), // CEP de entrega
		cheque: numeric({ precision: 12, scale: 2 }), // Valor pago em cheque
		cnpjcpfcliente: varchar({ length: 18 }), // CNPJ/CPF do cliente
		cnpjcpfentrega: varchar({ length: 20 }), // CNPJ/CPF da entrega
		cnpjcpftransportadora: varchar({ length: 18 }), // CNPJ ou CPF da transportadora
		cnpjfilial: varchar({ length: 18 }), // CNPJ da filial
		codigo: bigint({ mode: "number" }), // Código
		codigoecommerce: varchar({ length: 50 }), // Código da DAV (Pedido) no ECommerce
		codigomobile: varchar({ length: 36 }), // Código da DAV (Pedido) no Mobile
		codigoorigemecommerce: varchar({ length: 50 }), // Código Origem no ECommerce
		codigorastreio: varchar({ length: 200 }), // Código do rastreamento
		codigotabelafinanciamento: varchar({ length: 10 }), // Código da tabela de financiamento
		cofins: numeric({ precision: 12, scale: 2 }), // Valor do COFINS
		comissaorepresentante: numeric({ precision: 12, scale: 2 }), // Valor da comissão do representante
		complementoentrega: varchar({ length: 60 }), // Complemento do endereço da entrega
		conferido: smallint(), // Identifica se foi conferido
		coo: integer(), // COO do cupom fiscal onde o dav foi utilizado
		cooger: integer(), // COO do relatório gerencial
		cpfcnpjemitentecheque: varchar({ length: 20 }), // CPF/CNPJ do emitente do cheque a vista
		cupomemitido: smallint(), // DAV possui cupom fiscal emitido: 0=Não 1=Sim
		currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
		data: date(), // Data emissão
		dataalteracao: timestamp({ precision: 3, mode: "string" }), // Data alteração
		datacancelamento: date(), // Data do cancelamento
		datahoradespacho: timestamp({ precision: 3, mode: "string" }), // Data e hora do despacho
		datahorafaturamento: timestamp({ precision: 3, mode: "string" }), // Data e hora do faturamento
		datahoraimpressao: timestamp({ precision: 3, mode: "string" }), // Data e hora da impressão
		datahorarecebimento: timestamp({ precision: 3, mode: "string" }), // Data e hora do recebimento
		dataimportacao: date(), // Data de importação
		datainclusao: timestamp({ precision: 3, mode: "string" }), // Data inclusão
		datapedidomobile: timestamp({ precision: 3, mode: "string" }), // Data e hora do pedido no mobile
		dataprimeirovencimento: date(), // Data para o primeiro vencimento
		deposito: numeric({ precision: 12, scale: 2 }), // Valor de outros pagamentos
		desconto: numeric({ precision: 12, scale: 2 }), // Valor do desconto total dos produtos
		descontosubtotal: numeric({ precision: 12, scale: 2 }), // Valor do desconto do sub-total da DAV
		despachomelhorenvio: smallint(), // Despacho realizado no Melhor Envio
		devolucao: numeric({ precision: 12, scale: 2 }), // Valor pago em devoluções
		diferencafianciamento: numeric({ precision: 12, scale: 2 }), // Valor de diferença do financiamento
		dinheiro: numeric({ precision: 12, scale: 2 }), // Valor pago em dinheiro
		ecfmarca: varchar({ length: 20 }), // Marca do ECF
		ecfmfadicional: varchar({ length: 1 }), // Letra indicativa de MF adicional
		ecfmodelo: varchar({ length: 20 }), // Modelo do ECF
		ecfserie: varchar({ length: 20 }), // Número de série do ECF
		ecftipo: varchar({ length: 7 }), // Tipo do ECF
		emailentrega: varchar({ length: 60 }), // E-mail
		enderecoentrega: varchar({ length: 60 }), // Endereço de entrega
		enderecotransportadora: varchar({ length: 50 }), // Endereço da transportadora
		entrega: timestamp({ precision: 3, mode: "string" }), // Data da entrega da(s) mercadoria(s)
		especietransportadora: varchar({ length: 60 }), // Espécie da mercadoria transportadora
		extra1: varchar({ length: 512 }), // Campo extra 1 (campo utilizado para guardar uma informação qualquer)
		extra2: varchar({ length: 512 }), // Campo extra 2 (campo utilizado para guardar uma informação qualquer)
		extra3: varchar({ length: 512 }), // Campo extra 3 (campo utilizado para guardar uma informação qualquer)
		extra4: varchar({ length: 512 }), // Campo extra 4 (campo utilizado para guardar uma informação qualquer)
		extra5: varchar({ length: 512 }), // Campo extra 5 (campo utilizado para guardar uma informação qualquer)
		extra6: varchar({ length: 512 }), // Campo extra 6 (campo utilizado para guardar uma informação qualquer)
		extra7: varchar({ length: 512 }), // Campo extra 7 (campo utilizado para guardar uma informação qualquer)
		extra8: varchar({ length: 512 }), // Campo extra 8 (campo utilizado para guardar uma informação qualquer)
		extra9: varchar({ length: 512 }), // Campo extra 9 (campo utilizado para guardar uma informação qualquer)
		extra10: varchar({ length: 512 }), // Campo extra 10 (campo utilizado para guardar uma informação qualquer)
		hash: bigint({ mode: "number" }), // Hash para controle de alteração
		hashpafnfce: bigint({ mode: "number" }), // Hash para controle de alteração do PAF-NFC-e
		icms: numeric({ precision: 12, scale: 2 }), // Valor do icms
		icmsfundopobrezainterno: numeric({ precision: 12, scale: 2 }), // Valor do ICMS relativo ao Fundo de Combate à Pobreza (FCP) interno
		icmsfundopobrezast: numeric({ precision: 12, scale: 2 }), // Valor do ICMS relativo ao Fundo de Combate à Pobreza (FCP) ST
		icmssubstituicao: numeric({ precision: 12, scale: 2 }), // Valor do icms substituição tributária
		idadiantamento: text(), // ID do adiantamento do cliente
		idadmcarteiradigital: text(), // Carteira digital
		idbancocheque: text(), // Banco do cheque a vista
		idcarrinhocompras: text(), // ID do carrinho de compras
		idcfop: text(), // ID da natureza de operação
		idcidadeentrega: text(), // ID da cidade de entrega
		idcidadetransportadora: text(), // id da cidade da transortadora
		idcliente: text(), // ID do cliente
		idcondicaopagamento: text(), // ID da condição de pagamento
		idconfiguracaoecommerce: text(), // ID da Configuração do Ecommerce integração
		idcontacorrentedeposito: text(), // Conta corrente do depósito
		idcontacorrentepix: text(), // Conta corrente do PIX
		idcupomshop: text(), // ID do cupom Uniplus Shop
		iddavgerada: text(), // ID DAV que foi gerada
		iddavmesclada: text(), // ID da DAV que foi gerada atraves da mesclagem
		iddavoriginal: text(), // ID DAV original
		identidaderemessaecommerce: text(), // ID Entidade Remessa ecommerce
		identificacao: varchar({ length: 20 }), // Apelido para a pré-venda
		identregamercadolivre: text(), // ID da entrega do Mercado Livre
		idestadoentrega: text(), // ID do estado de entrega
		idestadotransportadora: text(), // Estado da transportadora
		idestadoveiculotransportadora: text(), // UF do veículo transportadora
		idfilial: text(), // ID da filial
		idfinalizador: text(), // ID do finalizador
		idformaentregaregiao: text(), // ID da forma de entrega região
		idlocalestoque: text(), // Local de estoque
		idlocalretirada: text(), // Id local de retirada
		idlocalretiradanf: text(), // Local de retirada
		idnfce: text(), // NFC-e
		idnotafiscal: text(), // ID da nota fiscal
		idnotaressaecomerce: text(), // ID Nota Remessa ECommerce
		idnotavendaecomerce: text(), // ID Nota Venda ECommerce
		idoperacao: text(), // ID da operacao
		idoperacaofiscal: text(), // ID Operação fiscal
		idrastreioecommerce: text(), // ID do rastreio no ecommerce
		idrepresentante: text(), // ID do representante responsãvel pela venda
		idrepresentante2: text(), // ID do segundo comissionado
		idroteirovendedor: text(), // ID do Roteiro do Vendedor associado a venda.
		idtabelafinanciamento: text(), // id da tabela de financiamento
		idtabelafinanciamentoparcela: text(), // id da tabela de parcelas do financiamento
		idtabelafinanparcelacond: text(), // id da tabela de parcelas do financiamento por condição de pagamento
		idtabelapreco: text(), // ID da tabela de preços
		idtipodocumentofinanceiro: text(), // ID do tipo de documento financeiro
		idtipopedido: text(), // ID Tipo de pedido
		idtransacaofinanceira: text(), // Transação financeira
		idtransportadora: text(), // ID da transportadora
		idtranspremessaecommerce: text(), // ID Entidade Transportadora ECommerce
		idusuario: text(), // ID do usuário que realizou a venda
		idusuariocancelamento: text(), // ID do usuário que cancelou
		idusuarioconferencia: text(), // Usuário que conferiu o pedido
		idusuariodescontofin: text(), // ID do usuário que deu desconto no financiamento.
		idusuariofaturamento: text(), // ID do usuário que faturou
		idusuarioliberouatraso: text(), // ID do usuário que liberou venda para cliente com atrasos
		idusuarioliberoulimite: text(), // ID do usuário que liberou venda acima do limite de crédito
		ietransportadora: varchar({ length: 20 }), // Inscrição estadual da transportadora
		impresso: smallint(), // Identifica se a DAV foi impressa
		incluidoporcliente: smallint(), // Foi cadastrado pelo cliente
		inscricaoestadual: varchar({ length: 20 }), // Inscrição estadual
		ipi: numeric({ precision: 12, scale: 2 }), // Valor do IPI
		latitudeentrega: numeric({ precision: 10, scale: 7 }), // Latitude
		longitudeentrega: numeric({ precision: 10, scale: 7 }), // Longitude
		marca: varchar({ length: 30 }), // Marca do veiculo
		marcatransportadora: varchar({ length: 60 }), // Marca da mercadoria transportadora
		modelo: varchar({ length: 30 }), // Modelo do veículo
		nomecliente: varchar({ length: 60 }), // Nome do cliente
		nomeemitentecheque: varchar({ length: 60 }), // Nome do emitente do cheque a vista
		nomerazaosocialentrega: varchar({ length: 50 }), // Nome/Razão social da entrega
		numerocheque: varchar({ length: 20 }), // Número do cheque a vista
		numerocontacorrentebancocheque: varchar({ length: 10 }), // Conta corrente do cheque a vista
		numeroenderecoentrega: varchar({ length: 6 }), // Número do endereço de entrada
		numeroenderecotransportadora: varchar({ length: 6 }), // Número do endereço transportadora
		numeroparcelas: smallint(), // Número de parcelas
		numeroserie: varchar({ length: 30 }), // Número de série
		numerotransportadora: varchar({ length: 60 }), // Número do roda pé da NF transportadora
		objnotaecommerce: text(), // Joson Nota EComerce
		observacao: text(), // Observação
		outros: numeric({ precision: 12, scale: 2 }), // Valor pago em outros valores
		pautapreco: smallint(), // Pauta de preço utilizada na venda
		pdv: smallint(), // Número do ECF onde a dav foi utilizado
		pedidocliente: varchar({ length: 50 }), // Pedido do representante
		pedidoclientexped: varchar({ length: 60 }), // Pedido do cliente (xPed)
		pedidoreferenteadiantamento: smallint(), // Indica se o pedido é referente a um adiantamento do cliente
		percentualdescontosubtotal: numeric({ precision: 5, scale: 2 }), // Percentual de desconto do subtotal
		pesobrutotransportadora: numeric({ precision: 12, scale: 3 }), // Peso bruto da mercadoria transportadora
		pesoliquidotransportadora: numeric({ precision: 12, scale: 3 }), // Peso liquido da mercadoria transportadora
		pis: numeric({ precision: 12, scale: 2 }), // Valor do PIS
		pix: numeric({ precision: 12, scale: 2 }), // Valor de outros pagamentos
		placa: varchar({ length: 10 }), // Placa do veículo
		placaveiculotransportadora: varchar({ length: 8 }), // Placa do veículo transportadora
		plano: varchar({ length: 255 }), // Plano
		posaprazo: numeric({ precision: 12, scale: 2 }), // Valor do pagamento em POS à prazo
		posavista: numeric({ precision: 12, scale: 2 }), // Valor do pagamento em POS à vista
		quantidadetransportadora: numeric({ precision: 15, scale: 6 }), // Quantidade transportadora
		renavam: varchar({ length: 11 }), // Renavam do veículo
		status: smallint(), // Status 0=Aberto; 1=Fechado; 2=Passou pelo caixa; 3=Cancelado; 4=Nota fiscal gerada
		statusecommerce: varchar({ length: 50 }), // Status da DAV (Pedido) no ECommerce
		taxa: numeric({ precision: 12, scale: 2 }), // Taxa
		telefoneentrega: varchar({ length: 40 }), // Número do telefone para entrega
		temfinanciamento: smallint(), // Indicador se o dav tem financiamento
		tipocompra: smallint(), // Tipo da compra
		tipodocumento: smallint(), // Tipo de documento 1=Pré-venda; 2=Orçamento; 4=Pedido
		tipofrete: smallint(), // Tipo de frete
		tipoparcela: smallint(), // Tipo de parcela
		tipopedidoecommerce: varchar({ length: 50 }), // Tipo pedido ECommerce
		tipopessoa: smallint(), // Tipo de pessoa 0=Física; 1=Jurídica
		tipopessoaentrega: smallint(), // Tipo pessoa da entrega
		tipovenda: smallint(), // Tipo de venda
		titulodav: varchar({ length: 30 }), // Titulo do dav
		trocoshop: numeric({ precision: 12, scale: 2 }), // Troco Shop
		urlrastreio: varchar({ length: 200 }), // URL de rastreio
		validade: date(), // Data de validade
		valor: numeric({ precision: 12, scale: 2 }), // Valor do documento
		valoracrescimo: numeric({ precision: 12, scale: 2 }), // Valor do acréscimo
		valordesconto: numeric({ precision: 12, scale: 2 }), // Valor do desconto
		valordescontousuario: numeric({ precision: 12, scale: 2 }), // Valor do desconto do usuário
		valorentrada: numeric({ precision: 12, scale: 2 }), // Valor de entrada
		valorentradaoriginal: numeric({ precision: 12, scale: 2 }), // Valor de entrada
		valorfrete: numeric({ precision: 12, scale: 2 }), // Valor do frete
		valorprestacao: numeric({ precision: 12, scale: 2 }), // Valor da prestação
		valorprestacaooriginal: numeric({ precision: 12, scale: 2 }), // Valor da prestação original
		valortotalfinanceiro: numeric({ precision: 12, scale: 2 }), // Valor total do financeiro
		valortotalparcelas: numeric({ precision: 12, scale: 2 }), // Valor total das parcelas
		valortotalparcelasoriginal: numeric({ precision: 12, scale: 2 }), // Valor total das parcelas
		vencimentocheque: date(), // Vencimento do cheque a vista
	},
	(table) => [
		index("dav_idempresa_idx").using(
			"btree",
			table.idempresa.asc().nullsLast().op("text_ops"),
		),
		index("dav_codigo_idx").using(
			"btree",
			table.codigo.asc().nullsLast().op("int8_ops"),
		),
		foreignKey({
			columns: [table.idempresa],
			foreignColumns: [empresa.id],
			name: "dav_idempresa_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.idcliente],
			foreignColumns: [entidade.id],
			name: "fk_dav_cliente",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idrepresentante],
			foreignColumns: [entidade.id],
			name: "fk_dav_representante",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idrepresentante2],
			foreignColumns: [entidade.id],
			name: "fk_dav_representante2",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtransportadora],
			foreignColumns: [entidade.id],
			name: "fk_dav_transp",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.identidaderemessaecommerce],
			foreignColumns: [entidade.id],
			name: "fk_dav_entremessaecommerce",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcondicaopagamento],
			foreignColumns: [condicaopagamento.id],
			name: "fk_dav_condicaopagamento",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idtipodocumentofinanceiro],
			foreignColumns: [tipodocumentofinanceiro.id],
			name: "fk_dav_tipodocumentofinanceiro",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcfop],
			foreignColumns: [cfop.id],
			name: "fk_dav_cfop",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcontacorrentedeposito],
			foreignColumns: [contacorrente.id],
			name: "fk_dav_contadeposito",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idcontacorrentepix],
			foreignColumns: [contacorrente.id],
			name: "fk_dav_contapix",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.iddavgerada],
			foreignColumns: [table.id],
			name: "fk_dav_davgerada",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.iddavmesclada],
			foreignColumns: [table.id],
			name: "fk_dav_davmesclada",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.iddavoriginal],
			foreignColumns: [table.id],
			name: "fk_dav_davoriginal",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuario],
			foreignColumns: [usuarios.id],
			name: "fk_dav_usuario",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariofaturamento],
			foreignColumns: [usuarios.id],
			name: "fk_dav_usuariofaturamento",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariodescontofin],
			foreignColumns: [usuarios.id],
			name: "fk_dav_usuario_desc_fin",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuariocancelamento],
			foreignColumns: [usuarios.id],
			name: "fk_dav_usuario_cancel",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.idusuarioconferencia],
			foreignColumns: [usuarios.id],
			name: "fk_dav_idusuarioconferencia",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);