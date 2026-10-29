import type { EmissaoNfeFormData } from "@mais-gestao/nfe-emissao-shared";
import { api } from "@/src/api/client";

export interface NotaFiscalEmitida {
	id: string;
	idempresa: string;
	numeronotafiscal?: string | null;
	serie?: string | null;
	chavenfe?: string | null;
	status?: number | null;
	razaosocial?: string | null;
	valortotalnota?: string | null;
	datahoraemissao?: string | null;
	mensagemtransmissaonfe?: string | null;
	tipoambientenfe?: number | null;
}

export interface ListarNfesResponse {
	data: NotaFiscalEmitida[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ResultadoEmissaoNfe {
	idnotafiscal: string;
	chave?: string;
	protocolo?: string;
	cStat?: string;
	xMotivo?: string;
}

export interface NfeSerie {
	id: string;
	numero: string;
	modelo: string;
	ambiente: number;
	ativa?: boolean;
}

export interface NfeConfiguracao {
	ambiente: number;
	ultimaidserie?: string | null;
}

export const nfeService = {
	async listarEmitidas(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		status?: number;
		numero?: string;
		dataInicio?: string;
		dataFim?: string;
	}) {
		const { data } = await api.get<ListarNfesResponse>("/nfe/emissao", {
			params,
		});
		return data;
	},

	async listarRascunhos(params: {
		idempresa: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<ListarNfesResponse>(
			"/nfe/emissao/rascunhos",
			{ params },
		);
		return data;
	},

	async excluirRascunho(id: string, idempresa: string) {
		await api.delete(`/nfe/emissao/rascunhos/${id}`, {
			params: { idempresa },
		});
	},

	async buscarNota(id: string) {
		const { data } = await api.get<{
			notaFiscal: NotaFiscalEmitida;
			itens: Array<Record<string, unknown>>;
		}>(`/notas-fiscais/${id}`);
		return data;
	},

	async emitir(dados: EmissaoNfeFormData) {
		const { data } = await api.post<ResultadoEmissaoNfe>("/nfe/emissao", dados);
		return data;
	},

	async salvarRascunho(dados: EmissaoNfeFormData) {
		const { data } = await api.post<{ idnotafiscal: string; status: number }>(
			"/nfe/emissao/rascunho",
			dados,
		);
		return data;
	},

	async transmitir(id: string, confirmarProducao = false) {
		const { data } = await api.post<ResultadoEmissaoNfe>(
			`/nfe/emissao/${id}/transmitir`,
			{ confirmarProducao },
		);
		return data;
	},

	async cancelar(id: string, justificativa: string) {
		const { data } = await api.post<ResultadoEmissaoNfe>(
			`/nfe/emissao/${id}/cancelar`,
			{ justificativa },
		);
		return data;
	},

	async inutilizar(id: string, justificativa: string) {
		const { data } = await api.post<ResultadoEmissaoNfe>(
			`/nfe/emissao/${id}/inutilizar`,
			{ justificativa },
		);
		return data;
	},

	async calcularTributos(params: {
		idempresa: string;
		itens: EmissaoNfeFormData["itens"];
		totais?: EmissaoNfeFormData["totais"];
	}) {
		const { data } = await api.post<{
			crt: number;
			itens: EmissaoNfeFormData["itens"];
			totaisFiscais: Record<string, number>;
		}>("/nfe/emissao/calcular-tributos", params);
		return data;
	},

	async calcularObservacoes(params: {
		idempresa: string;
		informacoesAdicionais?: string;
		itens: EmissaoNfeFormData["itens"];
		localEntrega?: EmissaoNfeFormData["localEntrega"];
	}) {
		const { data } = await api.post<{
			informacoesAdicionais?: string;
			pendencias: string[];
		}>("/nfe/emissao/calcular-observacoes", params);
		return data;
	},

	async previewDanfe(dados: EmissaoNfeFormData) {
		const { data } = await api.post<ArrayBuffer>("/nfe/emissao/preview-danfe", dados, {
			responseType: "arraybuffer",
		});
		return data;
	},

	async downloadDanfe(id: string) {
		const { data } = await api.get<ArrayBuffer>(`/notas-fiscais/${id}/danfe`, {
			responseType: "arraybuffer",
		});
		return data;
	},

	async listarSeries(idempresa: string, ambiente?: number) {
		const { data } = await api.get<{ data: NfeSerie[] }>("/nfe-series", {
			params: { idempresa, modelo: "55", ambiente },
		});
		return data.data ?? [];
	},

	async buscarConfiguracao(idempresa: string) {
		const { data } = await api.get<NfeConfiguracao>(
			`/empresas/${idempresa}/nfe-configuracao`,
		);
		return data;
	},
};
