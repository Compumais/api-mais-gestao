import { api } from "@/lib/axios";

export type Contrato = {
	id: string;
	idempresa: string;
	identidade: string;
	idtipocontrato: string | null;
	codigo: string | null;
	descricao: string;
	situacao: string;
	datainicio: string;
	datafim: string | null;
	valor: string;
	periodicidade: string;
	diavencimento: number;
	regracompetencia: string;
	fluxofaturamento: number;
	discriminacao: string | null;
	itemlistaservico: string | null;
	codigonbs: string | null;
	codigotributacaonacional: string | null;
	idcondicaopagto: string | null;
	idtipodocumento: string | null;
	idplanocontas: string | null;
	idcontacorrente: string | null;
	idtipocobranca: string | null;
	observacao: string | null;
};

export type ContratoCobranca = {
	id: string;
	idempresa: string;
	idcontrato: string;
	idlote: string | null;
	competencia: string;
	valor: string;
	vencimento: string;
	fluxofaturamento: number;
	discriminacao: string | null;
	statusfaturamento: string;
	etapaatual: string | null;
	ultimoerro: string | null;
	tentativas: number;
	idnotafiscal: string | null;
	idfinanceiro: string | null;
	idremessaitem: string | null;
};

export type ContratoFaturamentoLote = {
	id: string;
	idempresa: string;
	competencia: string;
	status: string;
	idusuario: string;
	criadoem: string;
};

export type ItemElegibilidade = {
	contrato: Contrato;
	elegivel: boolean;
	valor: string;
	vencimento: string | null;
	fluxoFaturamento: number;
	pendencias: string[];
	idCobrancaExistente?: string;
	statusCobrancaExistente?: string;
};

export type FormatoImportacaoContratos = "csv" | "xlsx";

export type ImportacaoContratosData = {
	idempresa: string;
	formato: FormatoImportacaoContratos;
	conteudo: string;
	nomeArquivo?: string;
	idtipodocumento: string;
};

export type ContratoPreviewImportacao = {
	linha: number;
	codigocliente: string;
	nomeCliente: string | null;
	grupocontrato: string;
	tipocontrato: string;
	descricao: string;
	valor: string | null;
	diavencimento: number | null;
	criarGrupo: boolean;
	criarTipo: boolean;
	clientePendente: boolean;
	identidadeSugerida: string | null;
	nomeSugerido: string | null;
	acao: "criar";
	erros: string[];
};

export type PreviewImportacaoContratosResponse = {
	totalContratos: number;
	totalCriar: number;
	totalGruposNovos: number;
	totalTiposNovos: number;
	totalClientesPendentes: number;
	totalErros: number;
	errosGerais: string[];
	contratos: ContratoPreviewImportacao[];
};

export type ClientePendenteImportacaoContrato = {
	linha: number;
	grupocontrato: string;
	tipocontrato: string;
	descricao: string;
	valor: string;
	diavencimento: number;
};

export type ClientePendenteImportacao = {
	codigocliente: string;
	identidadeSugerida: string | null;
	nomeSugerido: string | null;
	contratos: ClientePendenteImportacaoContrato[];
};

export type ImportarContratosResponse = {
	totalImportados: number;
	totalCriados: number;
	totalGruposCriados: number;
	totalTiposCriados: number;
	clientesPendentes: ClientePendenteImportacao[];
};

export type VincularClienteImportacaoData = {
	idempresa: string;
	idtipodocumento: string;
	acao: "cadastrar" | "associar";
	codigocliente: string;
	nome?: string;
	identidade?: string;
	contratos: Array<{
		grupocontrato: string;
		tipocontrato: string;
		descricao: string;
		valor: string;
		diavencimento: number;
	}>;
};

export type VincularClienteImportacaoResponse = {
	identidade: string;
	nomeCliente: string;
	totalCriados: number;
	totalGruposCriados: number;
	totalTiposCriados: number;
};

export const contratoService = {
	async buscarProximoCodigo(idempresa: string): Promise<{ codigo: string }> {
		const { data } = await api.get<{ codigo: string }>(
			"/contratos/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},

	async listar(params: {
		idempresa: string;
		descricao?: string;
		situacao?: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: Contrato[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/contratos", { params });
		return data;
	},

	async buscar(id: string, idempresa: string) {
		const { data } = await api.get<Contrato>(`/contratos/${id}`, {
			params: { idempresa },
		});
		return data;
	},

	async criar(dados: Record<string, unknown>) {
		const { data } = await api.post<Contrato>("/contratos", dados);
		return data;
	},

	async atualizar(id: string, dados: Record<string, unknown>) {
		const { data } = await api.put<Contrato>(`/contratos/${id}`, dados);
		return data;
	},

	async excluir(id: string, idempresa: string) {
		await api.delete(`/contratos/${id}`, { params: { idempresa } });
	},

	async listarElegiveis(params: {
		idempresa: string;
		competencia: string;
		somenteElegiveis?: boolean;
	}) {
		const { data } = await api.get<{
			competencia: string;
			itens: ItemElegibilidade[];
		}>("/contratos/faturamento/elegiveis", { params });
		return data;
	},

	async confirmarLote(dados: {
		idempresa: string;
		competencia: string;
		idsContratos: string[];
	}) {
		const { data } = await api.post<{
			lote: ContratoFaturamentoLote;
			cobrancas: ContratoCobranca[];
		}>("/contratos/faturamento/lotes", dados);
		return data;
	},

	async listarLotes(params: {
		idempresa: string;
		competencia?: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: ContratoFaturamentoLote[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/contratos/faturamento/lotes", { params });
		return data;
	},

	async buscarLote(id: string, idempresa: string) {
		const { data } = await api.get<{
			lote: ContratoFaturamentoLote;
			cobrancas: ContratoCobranca[];
		}>(`/contratos/faturamento/lotes/${id}`, { params: { idempresa } });
		return data;
	},

	async listarCobrancas(params: {
		idempresa: string;
		idcontrato?: string;
		competencia?: string;
		idlote?: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: ContratoCobranca[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/contratos/faturamento/cobrancas", { params });
		return data;
	},

	async retomarCobranca(id: string, idempresa: string) {
		const { data } = await api.post<{ cobranca: ContratoCobranca }>(
			`/contratos/faturamento/cobrancas/${id}/retomar`,
			{ idempresa },
		);
		return data;
	},

	async previewImportacao(
		dados: ImportacaoContratosData,
	): Promise<PreviewImportacaoContratosResponse> {
		const { data } = await api.post<PreviewImportacaoContratosResponse>(
			"/contratos/importar/preview",
			dados,
		);
		return data;
	},

	async importar(
		dados: ImportacaoContratosData,
		onUploadProgress?: (percentual: number) => void,
	): Promise<ImportarContratosResponse> {
		const { data } = await api.post<ImportarContratosResponse>(
			"/contratos/importar",
			dados,
			{
				onUploadProgress: (evento) => {
					if (onUploadProgress && evento.total) {
						onUploadProgress(Math.round((evento.loaded / evento.total) * 100));
					}
				},
			},
		);
		return data;
	},

	async vincularClienteImportacao(
		dados: VincularClienteImportacaoData,
	): Promise<VincularClienteImportacaoResponse> {
		const { data } = await api.post<VincularClienteImportacaoResponse>(
			"/contratos/importar/vincular-cliente",
			dados,
		);
		return data;
	},
};
