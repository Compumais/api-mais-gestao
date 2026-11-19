import { api } from "@/lib/axios";
import type { PeriodoLocacao } from "@/lib/locacao-calculo";

export type LocacaoItem = {
	id: string;
	idlocacao: string;
	idequipamento: string;
	periodo: PeriodoLocacao;
	quantidade: number;
	valorunitario: string;
	valordiaria: string;
	dataprevista: string;
	valorperiodo: string;
	valormora: string;
	valortotal: string;
	diasatraso: number;
	codigoequipamento: string;
	descricaoequipamento: string;
	numeroserie: string | null;
};

export type Locacao = {
	id: string;
	idempresa: string;
	identidade: string;
	codigo: string;
	situacao: string;
	datainicio: string;
	cep: string | null;
	endereco: string | null;
	numeroendereco: string | null;
	complemento: string | null;
	bairro: string | null;
	idcidade: string | null;
	idestado: string | null;
	latitude: string | null;
	longitude: string | null;
	valorperiodo: string;
	valormora: string;
	valortotal: string;
	datadevolucao: string | null;
	formapagamento: string | null;
	vencimento: string | null;
	idtipodocumento: string | null;
	idplanocontas: string | null;
	idcontacorrente: string | null;
	idfinanceiro: string | null;
	observacao: string | null;
	nomecliente?: string;
	itens?: LocacaoItem[];
};

export type LocacaoPayload = {
	idempresa: string;
	identidade: string;
	codigo?: string;
	datainicio: string;
	cep?: string | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	idcidade?: string | null;
	idestado?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	observacao?: string | null;
	itens: Array<{
		idequipamento: string;
		periodo: PeriodoLocacao;
		quantidade: number;
	}>;
};

export type PreviaFechamentoLocacao = {
	datadevolucao: string;
	valorperiodo: string;
	valormora: string;
	valortotal: string;
	itens: Array<{
		id: string;
		descricaoequipamento: string;
		codigoequipamento: string;
		periodo: string;
		quantidade: number;
		dataprevista: string;
		diasatraso: number;
		valorperiodo: string;
		valormora: string;
		valortotal: string;
	}>;
};

export const locacaoService = {
	async buscarProximoCodigo(idempresa: string) {
		const { data } = await api.get<{ codigo: string }>(
			"/locacoes/proximo-codigo",
			{
				params: { idempresa },
			},
		);
		return data;
	},

	async listar(params: {
		idempresa: string;
		codigo?: string;
		situacao?: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: Locacao[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/locacoes", { params });
		return data;
	},

	async listarMapa(idempresa: string) {
		const { data } = await api.get<{
			comPonto: Array<{
				id: string;
				codigo: string;
				nomecliente: string;
				endereco: string | null;
				numeroendereco: string | null;
				bairro: string | null;
				cep: string | null;
				latitude: string;
				longitude: string;
				equipamentos: Array<{
					codigo: string;
					descricao: string;
					numeroserie: string | null;
				}>;
			}>;
			semPonto: Array<{
				id: string;
				codigo: string;
				nomecliente: string;
				equipamentos: Array<{ codigo: string; descricao: string }>;
			}>;
		}>("/locacoes/mapa", { params: { idempresa } });
		return data;
	},

	async buscar(id: string, idempresa: string) {
		const { data } = await api.get<Locacao>(`/locacoes/${id}`, {
			params: { idempresa },
		});
		return data;
	},

	async criar(dados: LocacaoPayload) {
		const { data } = await api.post<Locacao>("/locacoes", dados);
		return data;
	},

	async atualizar(id: string, dados: LocacaoPayload) {
		const { data } = await api.put<Locacao>(`/locacoes/${id}`, dados);
		return data;
	},

	async preverFechamento(
		id: string,
		dados: { idempresa: string; datadevolucao: string },
	) {
		const { data } = await api.post<PreviaFechamentoLocacao>(
			`/locacoes/${id}/prever-fechamento`,
			dados,
		);
		return data;
	},

	async fechar(
		id: string,
		dados: {
			idempresa: string;
			datadevolucao: string;
			formapagamento: "prazo" | "avista";
			idplanocontas: string;
			idtipodocumento?: string | null;
			vencimento?: string | null;
			idcontacorrente?: string | null;
		},
	) {
		const { data } = await api.post<Locacao>(`/locacoes/${id}/fechar`, dados);
		return data;
	},

	async cancelar(id: string, idempresa: string) {
		const { data } = await api.post<Locacao>(`/locacoes/${id}/cancelar`, {
			idempresa,
		});
		return data;
	},
};
