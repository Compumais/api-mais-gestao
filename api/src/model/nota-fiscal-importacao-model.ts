export type StatusVinculoImportacao = "pendente" | "vinculado" | "novo";

export type TributacaoImportacaoItem = {
	situacaotributaria?: string | undefined;
	cstpis?: string | undefined;
	cstcofins?: string | undefined;
	baseicms?: string | undefined;
	percentualicms?: string | undefined;
	icms?: string | undefined;
	aliquotapis?: string | undefined;
	aliquotacofins?: string | undefined;
	pis?: string | undefined;
	cofins?: string | undefined;
	ipi?: string | undefined;
	cstipi?: string | undefined;
	enquadramentoipi?: string | undefined;
	origem?: number | undefined;
	baseicmsst?: string | undefined;
	icmsst?: string | undefined;
	mvaicmsst?: string | undefined;
	fcpst?: string | undefined;
};

export type RateioCustoImportacaoItem = {
	frete?: string | undefined;
	seguro?: string | undefined;
	outras?: string | undefined;
	desconto?: string | undefined;
};

export type ProdutoEncontradoImportacao = {
	id: string;
	nome: string;
	codigo?: number | undefined;
};

export type RastroImportacaoItem = {
	numeroLote?: string | undefined;
	quantidadeLote?: string | undefined;
	dataFabricacao?: string | undefined;
	dataValidade?: string | undefined;
	codigoAgregacao?: string | undefined;
};

export type RastroTributacaoSaidaImportacao = {
	origem: "parametrizacao" | "cfop-depara" | "heuristica";
	idparametrizacaotributos?: string | undefined;
};

export type DadosImportacaoItem = {
	codigoFornecedor?: string | undefined;
	descricaoFornecedor: string;
	eanXml?: string | undefined;
	statusVinculo: StatusVinculoImportacao;
	idproduto?: string | undefined;
	produtoEncontrado?: ProdutoEncontradoImportacao | undefined;
	confirmarCadastro: boolean;
	idgrupo?: string | undefined;
	unidadeXml?: string | undefined;
	unidadeEstoque?: string | undefined;
	unidadeTributavelXml?: string | undefined;
	quantidadeTributavelXml?: string | undefined;
	precounitarioTributavelXml?: string | undefined;
	idunidademedida?: string | undefined;
	fatorConversao: string;
	quantidadeXml: string;
	quantidadeEstoque: string;
	precounitarioXml: string;
	precounitarioEstoque: string;
	precoVenda?: string | undefined;
	cfopXml?: string | undefined;
	idcfop?: string | undefined;
	ncmXml?: string | undefined;
	idncm?: string | undefined;
	cestXml?: string | undefined;
	idcest?: string | undefined;
	tributacao: TributacaoImportacaoItem;
	rastrosXml?: RastroImportacaoItem[] | undefined;
	rateio?: RateioCustoImportacaoItem | undefined;
	custoContabilCalculado?: string | undefined;
	rastroTributacaoSaida?: RastroTributacaoSaidaImportacao | undefined;
};

/** Snapshot imutável gravado na confirmação da NF */
export type DadosImportacaoItemFinalizado = DadosImportacaoItem & {
	finalizadoEm: string;
	versao: number;
	xmlItemSnapshot: {
		quantidadeXml: string;
		precounitarioXml: string;
		unidadeXml?: string | undefined;
		totalXml?: string | undefined;
		descontoXml?: string | undefined;
		tributacaoXml: TributacaoImportacaoItem;
		rastrosXml?: RastroImportacaoItem[] | undefined;
	};
};

export type DuplicataImportacaoNf = {
	numero?: string | undefined;
	vencimento?: string | undefined;
	valor?: string | undefined;
};

export type DadosImportacaoNota = {
	ufemitente?: string | undefined;
	cfopOperacaoXml?: string | undefined;
	natOpXml?: string | undefined;
	finNFe?: number | undefined;
	chaveReferenciadaXml?: string | undefined;
	ipiDevolvidoXml?: string | undefined;
	duplicatas?: DuplicataImportacaoNf[] | undefined;
	idgrupoPadrao?: string | undefined;
	finalizadoEm?: string | undefined;
	versao?: number | undefined;
	xmlArquivado?: {
		chavenfe?: string | undefined;
		protocolonfe?: string | undefined;
		hashsha256?: string | undefined;
		tamanhobytes?: number | undefined;
	} | undefined;
};

export type FornecedorSugeridoImportacao = {
	id?: string | undefined;
	cnpj?: string | undefined;
	razaosocial?: string | undefined;
	inscricaoestadual?: string | undefined;
	encontrado: boolean;
};
