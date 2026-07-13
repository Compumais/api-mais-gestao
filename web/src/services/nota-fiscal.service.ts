import { api } from "@/lib/axios";

export interface NotaFiscal {
	id: string;
	idempresa: string;
	identidade: string | null;
	numero: string | null;
	numeronotafiscal: string | null;
	serie: string | null;
	modelo: string | null;
	chavenfe: string | null;
	emissao: string | null;
	entradasaida: string | null;
	razaosocial: string | null;
	cnpjemissor: string | null;
	valortotalnota: string | null;
	totalproduto: string | null;
	status: number | null;
	tipoorigem: number | null;
	datainclusao: string | null;
	observacao: string | null;
	idplanocontas: string | null;
	idcondicaopagto: string | null;
	idtipodocumento?: string | null;
	idcfop: string | null;
	baseicms: string | null;
	icms: string | null;
	ipi: string | null;
	pis: string | null;
	cofins: string | null;
	dadosimportacao?: {
		cfopOperacaoXml?: string;
		natOpXml?: string;
		finNFe?: number;
		chaveReferenciadaXml?: string;
		ipiDevolvidoXml?: string;
		idgrupoPadrao?: string;
	} | null;
}

export interface NotaFiscalItem {
	id: string;
	idnotafiscal: string;
	idproduto: string | null;
	descricao: string | null;
	quantidade: string | null;
	precounitario: string | null;
	total: string | null;
	cfop: string | null;
	ncm: string | null;
	unidade: string | null;
	contador: number | null;
}

export interface ListarNotasFiscaisResponse {
	data: NotaFiscal[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ItemNotaFiscalPayload {
	idproduto?: string;
	codigoproduto?: number;
	ean?: string;
	descricaoproduto?: string;
	descricao?: string;
	quantidade?: string | number;
	precounitario?: string | number;
	total?: string | number;
	desconto?: string | number;
	cfop?: string;
	ncm?: string;
	unidade?: string;
	situacaotributaria?: string;
	cstpis?: string;
	cstcofins?: string;
	baseicms?: string | number;
	percentualicms?: string | number;
	icms?: string | number;
	aliquotapis?: string | number;
	aliquotacofins?: string | number;
	pis?: string | number;
	cofins?: string | number;
	ipi?: string | number;
	origem?: number;
	referenciafornecedor?: string;
	informacaoadicional?: string;
}

export interface CriarNotaFiscalPayload {
	idempresa: string;
	identidade?: string | null;
	numero?: string | null;
	serie?: string | null;
	modelo?: string | null;
	chavenfe?: string | null;
	emissao?: string | null;
	entradasaida?: string | null;
	idplanocontas?: string | null;
	idcondicaopagto?: string | null;
	idtipodocumento?: string | null;
	valortotalnota?: string | number | null;
	totalproduto?: string | number | null;
	frete?: string | number | null;
	observacao?: string | null;
	gerarCustos?: boolean;
	gerarFinanceiro?: boolean;
	itens: ItemNotaFiscalPayload[];
}

export interface ImportarXmlNfPayload {
	idempresa: string;
	xml: string;
	idplanocontas?: string | null;
	idcondicaopagto?: string | null;
	idtipodocumento?: string | null;
	gerarCustos?: boolean;
	gerarFinanceiro?: boolean;
}

export interface ImportarChaveNfPayload {
	idempresa: string;
	chaveNfe: string;
	idplanocontas?: string | null;
	idcondicaopagto?: string | null;
	idtipodocumento?: string | null;
	xmlOpcional?: string;
}

export interface ImportarChaveNfResponse {
	idRascunho: string;
	urlRascunho: string;
	chavenfe: string;
}

export type StatusVinculoImportacao = "pendente" | "vinculado" | "novo";

export interface TributacaoImportacaoItem {
	situacaotributaria?: string;
	cstpis?: string;
	cstcofins?: string;
	baseicms?: string;
	percentualicms?: string;
	icms?: string;
	aliquotapis?: string;
	aliquotacofins?: string;
	pis?: string;
	cofins?: string;
	ipi?: string;
	origem?: number;
	baseicmsst?: string;
	icmsst?: string;
	fcpst?: string;
	percentualdifericms?: string;
}

export interface RateioCustoImportacaoItem {
	frete?: string;
	seguro?: string;
	outras?: string;
	desconto?: string;
}

export interface DadosImportacaoItem {
	codigoFornecedor?: string;
	descricaoFornecedor: string;
	eanXml?: string;
	statusVinculo: StatusVinculoImportacao;
	idproduto?: string;
	produtoEncontrado?: { id: string; nome: string; codigo?: number };
	confirmarCadastro: boolean;
	idgrupo?: string;
	unidadeXml?: string;
	unidadeEstoque?: string;
	idunidademedida?: string;
	tipoproduto?: string;
	fatorConversao: string;
	quantidadeXml: string;
	quantidadeEstoque: string;
	precounitarioXml: string;
	precounitarioEstoque: string;
	precoVenda?: string;
	cfopXml?: string;
	idcfop?: string;
	ncmXml?: string;
	idncm?: string;
	tributacao: TributacaoImportacaoItem;
	rateio?: RateioCustoImportacaoItem;
}

export interface FornecedorSugeridoImportacao {
	id?: string;
	cnpj?: string;
	razaosocial?: string;
	inscricaoestadual?: string;
	encontrado: boolean;
}

export interface NotaFiscalItemImportacao extends NotaFiscalItem {
	dadosimportacao: DadosImportacaoItem | null;
}

export interface CriarRascunhoImportacaoResponse {
	idRascunho: string;
	nota: NotaFiscal;
	itens: NotaFiscalItemImportacao[];
	fornecedor: FornecedorSugeridoImportacao;
}

export interface BuscarRascunhoImportacaoResponse {
	nota: NotaFiscal;
	itens: NotaFiscalItemImportacao[];
	fornecedor: FornecedorSugeridoImportacao;
}

export interface CriarNotaFiscalResponse {
	notaFiscal: NotaFiscal;
	itens: NotaFiscalItem[];
}

export interface BuscarNotaFiscalResponse {
	notaFiscal: NotaFiscal;
	itens: NotaFiscalItem[];
}

export interface BuscarProdutoNfResponse {
	encontrado: boolean;
	produto: {
		id: string;
		codigo: number | null;
		ean: number | string | null;
		nome: string;
		descricao: string;
	} | null;
}

export const notaFiscalService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		numero?: string;
		tipoorigem?: number;
	}): Promise<ListarNotasFiscaisResponse> {
		const { data } = await api.get<ListarNotasFiscaisResponse>(
			"/notas-fiscais",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<BuscarNotaFiscalResponse> {
		const { data } = await api.get<BuscarNotaFiscalResponse>(
			`/notas-fiscais/${id}`,
		);
		return data;
	},

	async atualizarCompra(
		id: string,
		payload: {
			idempresa: string;
			identidade?: string | null;
			numero?: string | null;
			serie?: string | null;
			modelo?: string | null;
			chavenfe?: string | null;
			emissao?: string | null;
			entradasaida?: string | null;
			idplanocontas?: string | null;
			idcondicaopagto?: string | null;
			idtipodocumento?: string | null;
			valortotalnota?: string | null;
			observacao?: string | null;
			itens?: Array<{
				id: string;
				descricao?: string | null;
				quantidade?: string | null;
				precounitario?: string | null;
				total?: string | null;
				cfop?: string | null;
				ncm?: string | null;
				unidade?: string | null;
			}>;
			reintegrarEstoqueFinanceiro?: boolean;
		},
	): Promise<{
		notaFiscal: NotaFiscal;
		itens: NotaFiscalItem[];
		avisos: string[];
	}> {
		const { data } = await api.put<{
			notaFiscal: NotaFiscal;
			itens: NotaFiscalItem[];
			avisos: string[];
		}>(`/notas-fiscais/${id}/compra`, payload);
		return data;
	},

	async cancelarCompra(
		id: string,
		payload: { idempresa: string; motivo?: string },
	): Promise<{
		notaFiscal: NotaFiscal;
		titulosCancelados: number;
		movimentosEstornados: number;
		avisos: string[];
	}> {
		const { data } = await api.post<{
			notaFiscal: NotaFiscal;
			titulosCancelados: number;
			movimentosEstornados: number;
			avisos: string[];
		}>(`/notas-fiscais/${id}/cancelar`, payload);
		return data;
	},

	async criar(payload: CriarNotaFiscalPayload): Promise<CriarNotaFiscalResponse> {
		const { data } = await api.post<CriarNotaFiscalResponse>(
			"/notas-fiscais",
			payload,
		);
		return data;
	},

	async importarXml(
		payload: ImportarXmlNfPayload,
	): Promise<CriarRascunhoImportacaoResponse & { mensagem?: string }> {
		const { data } = await api.post<
			CriarRascunhoImportacaoResponse & { mensagem?: string }
		>("/notas-fiscais/importar-xml", payload);
		return data;
	},

	async criarRascunhoImportacaoXml(
		payload: ImportarXmlNfPayload,
	): Promise<CriarRascunhoImportacaoResponse> {
		const { data } = await api.post<CriarRascunhoImportacaoResponse>(
			"/notas-fiscais/importar-xml/rascunho",
			payload,
		);
		return data;
	},

	async importarNotaPorChave(
		payload: ImportarChaveNfPayload,
	): Promise<ImportarChaveNfResponse> {
		const { data } = await api.post<ImportarChaveNfResponse>(
			"/notas-fiscais/importar-xml/chave",
			payload,
		);
		return data;
	},

	async buscarRascunhoImportacao(
		id: string,
		idempresa: string,
	): Promise<BuscarRascunhoImportacaoResponse> {
		const { data } = await api.get<BuscarRascunhoImportacaoResponse>(
			`/notas-fiscais/rascunhos/${id}`,
			{ params: { idempresa } },
		);
		return data;
	},

	async listarRascunhosImportacao(params: {
		idempresa: string;
		page?: number;
		limit?: number;
	}): Promise<ListarNotasFiscaisResponse> {
		const { data } = await api.get<ListarNotasFiscaisResponse>(
			"/notas-fiscais/rascunhos",
			{ params },
		);
		return data;
	},

	async atualizarRascunhoImportacao(
		id: string,
		payload: {
			idempresa: string;
			identidade?: string | null;
			idcfop?: string | null;
			idplanocontas?: string | null;
			idcondicaopagto?: string | null;
			idtipodocumento?: string | null;
			observacao?: string | null;
			entradasaida?: string | null;
			aplicarCfopItens?: boolean;
		},
	): Promise<NotaFiscal> {
		const { data } = await api.patch<NotaFiscal>(
			`/notas-fiscais/rascunhos/${id}`,
			payload,
		);
		return data;
	},

	async atualizarItemRascunhoImportacao(
		id: string,
		idItem: string,
		payload: { idempresa: string } & Partial<DadosImportacaoItem>,
	): Promise<NotaFiscalItemImportacao> {
		const { data } = await api.patch<NotaFiscalItemImportacao>(
			`/notas-fiscais/rascunhos/${id}/itens/${idItem}`,
			payload,
		);
		return data;
	},

	async aplicarGrupoPadraoRascunhoImportacao(
		id: string,
		payload: { idempresa: string; idgrupo: string },
	): Promise<{ idgrupoPadrao: string; quantidadeItens: number }> {
		const { data } = await api.post<{
			idgrupoPadrao: string;
			quantidadeItens: number;
		}>(`/notas-fiscais/rascunhos/${id}/grupo-padrao`, payload);
		return data;
	},

	async finalizarRascunhoImportacao(
		id: string,
		payload: {
			idempresa: string;
			gerarCustos?: boolean;
			gerarFinanceiro?: boolean;
		},
	): Promise<CriarNotaFiscalResponse> {
		const { data } = await api.post<CriarNotaFiscalResponse>(
			`/notas-fiscais/rascunhos/${id}/finalizar`,
			payload,
		);
		return data;
	},

	async excluirRascunhoImportacao(
		id: string,
		idempresa: string,
	): Promise<void> {
		await api.delete(`/notas-fiscais/rascunhos/${id}`, {
			params: { idempresa },
		});
	},

	async buscarProduto(params: {
		idempresa: string;
		q?: string;
		codigo?: string;
		ean?: string;
	}): Promise<BuscarProdutoNfResponse> {
		const { data } = await api.get<BuscarProdutoNfResponse>(
			"/notas-fiscais/produtos/buscar",
			{ params },
		);
		return data;
	},
};
