import { api } from "@/lib/axios";

export type ConciliacaoCielo = {
	id: string;
	idempresa: string;
	nomearquivo: string;
	checksum: string;
	estabelecimento: string | null;
	periodoinicio: string | null;
	periodofim: string | null;
	qtdlancamentos: number;
	valorbruto: string;
	valortaxa: string;
	valorliquido: string;
	status: string;
	idcontacorrente: string | null;
	idusuario: string;
	criadoem: string;
	processadoem: string | null;
};

export type ConciliacaoCieloItem = {
	id: string;
	idconciliacao: string;
	linhacsv: number;
	datapagamento: string | null;
	datalancamento: string | null;
	dataprevistapagamento: string | null;
	datavenda: string | null;
	estabelecimento: string | null;
	tipolancamento: string | null;
	formapagamento: string | null;
	bandeira: string | null;
	valorbruto: string | null;
	valortaxa: string | null;
	valorliquido: string | null;
	statuspagamento: string | null;
	descricao: string | null;
	codigoautorizacao: string | null;
	nsu: string | null;
	codigovenda: string | null;
	tid: string | null;
	numerocartao: string | null;
	numeropedido: string | null;
	parcela: number | null;
	totalparcelas: number | null;
	modalidade: string | null;
	idfinanceiro: string | null;
	idfinanceirosugerido: string | null;
	confiancasugestao: number;
	statusprocessamento: string;
	mensagemerro: string | null;
	criadoem: string;
	documento?: string | null;
	historico?: string | null;
	valorfinanceiro?: string | null;
	saldofinanceiro?: string | null;
	statusfinanceiro?: string | null;
	nomecliente?: string | null;
};

export type ResultadoImportarConciliacaoCielo = {
	conciliacao: ConciliacaoCielo;
	itens: ConciliacaoCieloItem[];
	jaExistia: boolean;
};

export type ResultadoConfirmarConciliacaoCielo = {
	confirmados: number;
	ignorados: number;
	erros: number;
	itens: ConciliacaoCieloItem[];
};

export const conciliacaoCieloService = {
	async listar(params: { idempresa: string; page?: number; limit?: number }) {
		const { data } = await api.get<{
			data: ConciliacaoCielo[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/conciliacoes-cielo", { params });
		return data;
	},

	async importar(dados: {
		idempresa: string;
		nomearquivo: string;
		conteudo: string;
	}) {
		const { data } = await api.post<ResultadoImportarConciliacaoCielo>(
			"/conciliacoes-cielo/importar",
			dados,
		);
		return data;
	},

	async buscar(id: string, idempresa: string) {
		const { data } = await api.get<{
			conciliacao: ConciliacaoCielo;
			itens: ConciliacaoCieloItem[];
		}>(`/conciliacoes-cielo/${id}`, { params: { idempresa } });
		return data;
	},

	async associar(iditem: string, dados: {
		idempresa: string;
		idfinanceiro: string | null;
	}) {
		const { data } = await api.put<ConciliacaoCieloItem>(
			`/conciliacoes-cielo/itens/${iditem}/associar`,
			dados,
		);
		return data;
	},

	async confirmar(
		id: string,
		dados: {
			idempresa: string;
			idcontacorrente: string;
			idsitens?: string[];
			baixarTitulos?: boolean;
		},
	) {
		const { data } = await api.post<ResultadoConfirmarConciliacaoCielo>(
			`/conciliacoes-cielo/${id}/confirmar`,
			dados,
		);
		return data;
	},
};
