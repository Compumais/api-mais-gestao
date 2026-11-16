import { api } from "@/lib/axios";
import type { Financeiro } from "@/services/financeiro.service";

export type RemessaBancaria = {
	id: string;
	idempresa: string;
	idcontacorrente: string;
	sequencia: number;
	layout: string;
	status: string;
	nomearquivo: string | null;
	criadoem: string;
	enviadaem: string | null;
};

export type ResultadoGerarRemessa = {
	idremessa: string;
	qtdIncluidos: number;
	qtdJaExistiam: number;
	erros: Array<{ idfinanceiro: string; mensagem: string }>;
	nomearquivo: string | null;
};

export type RetornoBancario = {
	id: string;
	idempresa: string;
	idcontacorrente: string;
	nomearquivo: string;
	checksum: string;
	layout: string;
	status: string;
	idusuario: string;
	criadoem: string;
	processadoem: string | null;
};

export type RetornoBancarioItem = {
	id: string;
	idretorno: string;
	nossonumero: string | null;
	numerodocumento: string | null;
	nomesacado: string | null;
	valor: string | null;
	valorpago: string | null;
	vencimento: string | null;
	datacredito: string | null;
	dataocorrencia: string | null;
	ocorrencia: string;
	ocorrenciadescricao: string | null;
	motivo: string | null;
	desconto: string | null;
	abatimento: string | null;
	juros: string | null;
	multa: string | null;
	outrosacrescimos: string | null;
	taxacobranca: string | null;
	valoriof: string | null;
	idfinanceiro: string | null;
	statusprocessamento: string;
	mensagemerro: string | null;
};

export const cobrancaBancariaService = {
	async listarTitulos(params: {
		idempresa: string;
		tipo?: "R";
		status?: string;
		emissaoInicio?: string;
		emissaoFim?: string;
		vencimentoInicio?: string;
		vencimentoFim?: string;
		identidade?: string;
		emitente?: string;
		remessagerada?: number;
		permiteBoleto?: boolean;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: Financeiro[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/financeiros", {
			params: {
				...params,
				permiteBoleto: params.permiteBoleto ? "true" : undefined,
			},
		});
		return data;
	},

	async gerarRemessa(payload: {
		idempresa: string;
		idcontacorrente: string;
		idsfinanceiros: string[];
		dadosCobranca?: {
			instrucaocobrancaboleto?: number | null;
			diasinstrucaocobrancaboleto?: number | null;
			observacaoboleto?: string | null;
			percentualdesconto?: number | null;
		};
	}) {
		const { data } = await api.post<ResultadoGerarRemessa>(
			"/remessas-bancarias/gerar",
			payload,
		);
		return data;
	},

	urlDownloadRemessa(id: string, idempresa: string) {
		return `/remessas-bancarias/${id}/download?idempresa=${encodeURIComponent(idempresa)}`;
	},

	async listarRemessas(params: {
		idempresa: string;
		idcontacorrente?: string;
		status?: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: RemessaBancaria[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/remessas-bancarias", { params });
		return data;
	},

	async importarRetorno(payload: {
		idempresa: string;
		idcontacorrente: string;
		nomearquivo: string;
		conteudo: string;
	}) {
		const { data } = await api.post<{
			retorno: RetornoBancario;
			itens: RetornoBancarioItem[];
			jaExistia: boolean;
		}>("/retornos-bancarios/importar", payload);
		return data;
	},

	async processarRetorno(payload: {
		id: string;
		idempresa: string;
		idsitens?: string[];
	}) {
		const { data } = await api.post<{
			processados: number;
			ignorados: number;
			erros: number;
			itens: RetornoBancarioItem[];
		}>(`/retornos-bancarios/${payload.id}/processar`, {
			idempresa: payload.idempresa,
			idsitens: payload.idsitens,
		});
		return data;
	},

	async buscarRetorno(id: string, idempresa: string) {
		const { data } = await api.get<{
			retorno: RetornoBancario;
			itens: RetornoBancarioItem[];
		}>(`/retornos-bancarios/${id}`, { params: { idempresa } });
		return data;
	},

	async listarRetornos(params: {
		idempresa: string;
		idcontacorrente?: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: RetornoBancario[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/retornos-bancarios", { params });
		return data;
	},
};
