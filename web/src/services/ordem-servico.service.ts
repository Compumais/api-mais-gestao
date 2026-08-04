import type { OrdemServicoCampoExtra } from "@/constants/ordem-servico-status";
import { api } from "@/lib/axios";

export type CampoExtraOrdemServico = {
	campo: OrdemServicoCampoExtra;
	nome: string;
	ativo: boolean;
	obrigatorio: boolean;
};

export type OrdemServico = {
	id: string;
	idempresa: string;
	codigo: number | null;
	status: number | null;
	idcliente: string | null;
	nomecliente: string | null;
	cnpjcpfcliente: string | null;
	idobjeto: string | null;
	idarea: string | null;
	idprioridade: string | null;
	idtipoproblema: string | null;
	idatendente: string | null;
	idultimotecnico: string | null;
	idcondicaopagamento: string | null;
	idtipodocumentofinanceiro: string | null;
	problemadescrito: string | null;
	laudotecnico: string | null;
	observacao: string | null;
	agendamento: string | null;
	previsaoconclusao: string | null;
	dataos: string | null;
	data: string | null;
	orcamento: number | null;
	marca: string | null;
	modelo: string | null;
	placa: string | null;
	renavam: string | null;
	valor: string | null;
	valorprodutos: string | null;
	valorservicos: string | null;
	descontosubtotal: string | null;
	geroufinanceiro: number | null;
	faturouparanota: number | null;
	faturouparacupom: number | null;
	iddocumentofiscal: string | null;
	existeevento: number | null;
	dataultimoevento: string | null;
	descricaotipoultimoevento: string | null;
	descricaoultimoevento: string | null;
	extra1: string | null;
	extra2: string | null;
	extra3: string | null;
	extra4: string | null;
	extra5: string | null;
	extra6: string | null;
	extra7: string | null;
	extra8: string | null;
	extra9: string | null;
	extra10: string | null;
	extra11: string | null;
	extra12: string | null;
	extra13: string | null;
	extra14: string | null;
	extra15: string | null;
	extra16: string | null;
	camposextras?: CampoExtraOrdemServico[];
};

export type OrdemServicoItem = {
	id: string;
	idempresa: string;
	idordemservico: string;
	idproduto: string | null;
	nomeproduto: string | null;
	codigorproduto: string | null;
	quantidade: string | null;
	preco: string | null;
	total: string | null;
	idtecnico: string | null;
	idcfop: string | null;
	unidademedida: string | null;
	observacao: string | null;
	contador: number | null;
	cancelado: number | null;
};

export type OrdemServicoItemLote = {
	id: string;
	idempresa: string;
	idordemservicoitem: string;
	codigolote: string | null;
	quantidade: string | null;
	vencimento: string | null;
	datalote: string | null;
	emissao: string | null;
	idlote: string | null;
};

export type OrdemServicoEvento = {
	id: string;
	idempresa: string;
	idordemservico: string;
	idtipoevento: string | null;
	descricao: string | null;
	idtecnicode: string | null;
	idtecnicopara: string | null;
	nomecontato: string | null;
	idusuario: string | null;
	datacriacao: string | null;
};

export type TipoOrdemServicoEvento = {
	id: string;
	idempresa: string;
	codigo: string;
	status: number;
	cor: string | null;
	descricao: string | null;
	ordem: number | null;
	ativo: number | null;
	padrao: number | null;
};

export type ConfiguracaoOrdemServico = {
	id: string;
	idempresa: string;
	agrupafinanceiroaofaturar: number | null;
	descricao: string | null;
	descricaocampochave: string | null;
	mascaracampochave: string | null;
	mostrarcamposfinalizaritem: number | null;
	pedirprimeiroobjeto: number | null;
	tecnicoobrigatorio: number | null;
	usaarea: number | null;
	usaobjeto: number | null;
	usatipoproblema: number | null;
	usadadosveiculo: number | null;
	idcfopexternaproduto: string | null;
	idcfopexternaservico: string | null;
	idcfopexternaservicost: string | null;
	idcfopinternaproduto: string | null;
	idcfopinternaservico: string | null;
	idcfopinternaservicost: string | null;
	idmodelnfe: string | null;
	idmodelonfse: string | null;
	camposextras: CampoExtraOrdemServico[];
};

export type OrdemServicoFaturamento = {
	id: string;
	idempresa: string;
	idordemservico: string;
	idfaturamento: string | null;
	idnotafiscal: string | null;
	iddavos: string | null;
	datacriacao: string | null;
	dataalteracao: string | null;
};

export type ListarOrdensServicoParams = {
	idempresa: string;
	page?: number;
	limit?: number;
	status?: number;
	idcliente?: string;
	idultimotecnico?: string;
	codigo?: number;
	orcamento?: number;
	dataInicio?: string;
	dataFim?: string;
	busca?: string;
};

export type ListarOrdensServicoResponse = {
	data: OrdemServico[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type CriarOrdemServicoData = {
	idempresa: string;
	idcliente?: string | null;
	nomecliente?: string | null;
	cnpjcpfcliente?: string | null;
	idobjeto?: string | null;
	idarea?: string | null;
	idtipoproblema?: string | null;
	idatendente?: string | null;
	idultimotecnico?: string | null;
	idcondicaopagamento?: string | null;
	idtipodocumentofinanceiro?: string | null;
	problemadescrito?: string | null;
	laudotecnico?: string | null;
	observacao?: string | null;
	agendamento?: string | null;
	previsaoconclusao?: string | null;
	dataos?: string | null;
	orcamento?: number;
	marca?: string | null;
	modelo?: string | null;
	placa?: string | null;
	renavam?: string | null;
} & Partial<Record<OrdemServicoCampoExtra, string | null>>;

export type AtualizarOrdemServicoData = Omit<
	CriarOrdemServicoData,
	"idempresa"
> & {
	idempresa: string;
};

export type CriarItemOsData = {
	idempresa: string;
	idproduto: string;
	quantidade: string;
	preco: string;
	idtecnico?: string;
	idcfop?: string;
	unidademedida?: string;
	observacao?: string;
};

export type AtualizarItemOsData = {
	idempresa: string;
	quantidade?: string;
	preco?: string;
	idtecnico?: string | null;
	idcfop?: string | null;
	unidademedida?: string | null;
	observacao?: string | null;
	cancelado?: number;
};

export type CriarLoteOsData = {
	idempresa: string;
	quantidade: string;
	codigolote?: string;
	vencimento?: string;
	datalote?: string;
	emissao?: string;
	idlote?: string;
};

export type AtualizarLoteOsData = {
	idempresa: string;
	quantidade?: string;
	codigolote?: string | null;
	vencimento?: string | null;
	datalote?: string | null;
	emissao?: string | null;
	idlote?: string | null;
};

export type CriarEventoOsData = {
	idempresa: string;
	idtipoevento: string;
	descricao: string;
	idtecnicode?: string;
	idtecnicopara?: string;
	nomecontato?: string;
};

export type GerarContasReceberOsData = {
	idempresa: string;
	formasPagamento?: Array<{
		idtipodocumentofinanceiro: string;
		valor: number;
		indPag?: number;
	}>;
};

export type GerarContasReceberOsResposta = {
	totalParcelas: number;
	parcelasGeradas: number;
	titulosExistentes: number;
};

export type GerarNfeRascunhoOsData = {
	idempresa: string;
	idserienfe?: string;
};

export type GerarNfeRascunhoOsResposta = {
	idnotafiscal: string;
	status: number;
	idordemservico: string;
	avisos?: string[];
};

export const ordemServicoService = {
	async listar(
		params: ListarOrdensServicoParams,
	): Promise<ListarOrdensServicoResponse> {
		const { data } = await api.get<ListarOrdensServicoResponse>(
			"/ordens-servico",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<OrdemServico> {
		const { data } = await api.get<OrdemServico>(`/ordens-servico/${id}`);
		return data;
	},

	async criar(dados: CriarOrdemServicoData): Promise<OrdemServico> {
		const { data } = await api.post<OrdemServico>("/ordens-servico", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarOrdemServicoData,
	): Promise<OrdemServico> {
		const { data } = await api.put<OrdemServico>(
			`/ordens-servico/${id}`,
			dados,
		);
		return data;
	},

	async excluir(id: string, idempresa: string): Promise<void> {
		await api.delete(`/ordens-servico/${id}`, { params: { idempresa } });
	},

	async listarItens(
		id: string,
		idempresa: string,
	): Promise<OrdemServicoItem[]> {
		const { data } = await api.get<OrdemServicoItem[]>(
			`/ordens-servico/${id}/itens`,
			{ params: { idempresa } },
		);
		return data;
	},

	async criarItem(
		id: string,
		dados: CriarItemOsData,
	): Promise<OrdemServicoItem> {
		const { data } = await api.post<OrdemServicoItem>(
			`/ordens-servico/${id}/itens`,
			dados,
		);
		return data;
	},

	async atualizarItem(
		id: string,
		iditem: string,
		dados: AtualizarItemOsData,
	): Promise<OrdemServicoItem> {
		const { data } = await api.put<OrdemServicoItem>(
			`/ordens-servico/${id}/itens/${iditem}`,
			dados,
		);
		return data;
	},

	async excluirItem(
		id: string,
		iditem: string,
		idempresa: string,
	): Promise<void> {
		await api.delete(`/ordens-servico/${id}/itens/${iditem}`, {
			params: { idempresa },
		});
	},

	async listarLotes(
		id: string,
		iditem: string,
		idempresa: string,
	): Promise<OrdemServicoItemLote[]> {
		const { data } = await api.get<OrdemServicoItemLote[]>(
			`/ordens-servico/${id}/itens/${iditem}/lotes`,
			{ params: { idempresa } },
		);
		return data;
	},

	async criarLote(
		id: string,
		iditem: string,
		dados: CriarLoteOsData,
	): Promise<OrdemServicoItemLote> {
		const { data } = await api.post<OrdemServicoItemLote>(
			`/ordens-servico/${id}/itens/${iditem}/lotes`,
			dados,
		);
		return data;
	},

	async atualizarLote(
		id: string,
		iditem: string,
		idlote: string,
		dados: AtualizarLoteOsData,
	): Promise<OrdemServicoItemLote> {
		const { data } = await api.put<OrdemServicoItemLote>(
			`/ordens-servico/${id}/itens/${iditem}/lotes/${idlote}`,
			dados,
		);
		return data;
	},

	async excluirLote(
		id: string,
		iditem: string,
		idlote: string,
		idempresa: string,
	): Promise<void> {
		await api.delete(`/ordens-servico/${id}/itens/${iditem}/lotes/${idlote}`, {
			params: { idempresa },
		});
	},

	async listarEventos(
		id: string,
		idempresa: string,
	): Promise<OrdemServicoEvento[]> {
		const { data } = await api.get<OrdemServicoEvento[]>(
			`/ordens-servico/${id}/eventos`,
			{ params: { idempresa } },
		);
		return data;
	},

	async criarEvento(
		id: string,
		dados: CriarEventoOsData,
	): Promise<{ evento: OrdemServicoEvento; ordemServico: OrdemServico }> {
		const { data } = await api.post<{
			evento: OrdemServicoEvento;
			ordemServico: OrdemServico;
		}>(`/ordens-servico/${id}/eventos`, dados);
		return data;
	},

	async listarFaturamentos(
		id: string,
		idempresa: string,
	): Promise<OrdemServicoFaturamento[]> {
		const { data } = await api.get<OrdemServicoFaturamento[]>(
			`/ordens-servico/${id}/faturamentos`,
			{ params: { idempresa } },
		);
		return data;
	},

	async gerarContasReceber(
		id: string,
		dados: GerarContasReceberOsData,
	): Promise<GerarContasReceberOsResposta> {
		const { data } = await api.post<GerarContasReceberOsResposta>(
			`/ordens-servico/${id}/contas-receber`,
			dados,
		);
		return data;
	},

	async gerarNfeRascunho(
		id: string,
		dados: GerarNfeRascunhoOsData,
	): Promise<GerarNfeRascunhoOsResposta> {
		const { data } = await api.post<GerarNfeRascunhoOsResposta>(
			`/ordens-servico/${id}/gerar-nfe-rascunho`,
			dados,
		);
		return data;
	},

	async buscarConfiguracao(
		idempresa: string,
	): Promise<ConfiguracaoOrdemServico> {
		const { data } = await api.get<ConfiguracaoOrdemServico>(
			`/empresas/${idempresa}/configuracao-ordem-servico`,
		);
		return data;
	},

	async atualizarConfiguracao(
		idempresa: string,
		dados: Partial<ConfiguracaoOrdemServico> & {
			camposExtras?: CampoExtraOrdemServico[];
		},
	): Promise<ConfiguracaoOrdemServico> {
		const { data } = await api.put<ConfiguracaoOrdemServico>(
			`/empresas/${idempresa}/configuracao-ordem-servico`,
			dados,
		);
		return data;
	},

	async listarTiposEvento(params: {
		idempresa: string;
		somenteAtivos?: boolean;
	}): Promise<TipoOrdemServicoEvento[]> {
		const { data } = await api.get<TipoOrdemServicoEvento[]>(
			"/tipos-ordem-servico-evento",
			{
				params: {
					idempresa: params.idempresa,
					somenteAtivos:
						params.somenteAtivos === undefined
							? undefined
							: params.somenteAtivos
								? "true"
								: "false",
				},
			},
		);
		return data;
	},

	async atualizarTipoEvento(
		id: string,
		dados: {
			idempresa: string;
			descricao?: string;
			cor?: string;
			ordem?: number;
			ativo?: number;
		},
	): Promise<TipoOrdemServicoEvento> {
		const { data } = await api.put<TipoOrdemServicoEvento>(
			`/tipos-ordem-servico-evento/${id}`,
			dados,
		);
		return data;
	},

	async inativarTipoEvento(id: string, idempresa: string): Promise<void> {
		await api.delete(`/tipos-ordem-servico-evento/${id}`, {
			params: { idempresa },
		});
	},
};
