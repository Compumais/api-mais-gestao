import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export const TIPO_DOCUMENTO_ESTOQUE = {
	PDV: 0,
	NOTA_FISCAL: 1,
	ACERTO: 2,
} as const;

export interface MovimentoEstoque {
	id: number;
	idempresa: string;
	cancelado: number | null;
	currenttimemillis: number | null;
	custoaquisicao: string | null;
	customedio: string | null;
	custototal: string | null;
	data: string | null;
	datahora: string | null;
	iditemoriginal: string | null;
	idlocalestoque: string | null;
	idlote: string | null;
	idoriginal: string | null;
	idproduto: string | null;
	observacao: string | null;
	pontoequilibrio: string | null;
	precocusto: string | null;
	precoultimacompra: string | null;
	quantidadeentrada: string | null;
	quantidadesaida: string | null;
	tipodocumento: number | null;
	valortotal: string | null;
	variacao: number | null;
}

export interface ListarMovimentosEstoqueResponse {
	data: MovimentoEstoque[];
	paginacao: Paginacao;
}

export interface CriarMovimentoEstoqueData {
	idempresa: string;
	cancelado?: number | null;
	currenttimemillis?: number | null;
	custoaquisicao?: string | null;
	customedio?: string | null;
	custototal?: string | null;
	data?: string | null;
	datahora?: string | null;
	iditemoriginal?: string | null;
	idlocalestoque?: string | null;
	idlote?: string | null;
	idoriginal?: string | null;
	idproduto?: string | null;
	observacao?: string | null;
	pontoequilibrio?: string | null;
	precocusto?: string | null;
	precoultimacompra?: string | null;
	quantidadeentrada?: string | null;
	quantidadesaida?: string | null;
	tipodocumento?: number | null;
	valortotal?: string | null;
	variacao?: number | null;
}

export const movimentoEstoqueService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		idproduto?: string;
		idlocalestoque?: string;
		tipodocumento?: number;
		observacao?: string;
	}): Promise<ListarMovimentosEstoqueResponse> {
		const { data } = await api.get<ListarMovimentosEstoqueResponse>(
			"/movimentos-estoque",
			{ params },
		);
		return data;
	},

	async buscar(id: number): Promise<MovimentoEstoque> {
		const { data } = await api.get<MovimentoEstoque>(
			`/movimentos-estoque/${id}`,
		);
		return data;
	},

	async criar(dados: CriarMovimentoEstoqueData): Promise<MovimentoEstoque> {
		const { data } = await api.post<MovimentoEstoque>(
			"/movimentos-estoque",
			dados,
		);
		return data;
	},
};
