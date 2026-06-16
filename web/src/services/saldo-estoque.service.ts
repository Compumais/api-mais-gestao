import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface SaldoEstoque {
	id: number;
	idempresa: string;
	cest: string | null;
	cnpjfilial: string | null;
	codigoproduto: string | null;
	currenttimemillis: number | null;
	hash: number | null;
	idfilial: number | null;
	idproduto: number | null;
	ncm: string | null;
	nomeproduto: string | null;
	quantidade: string | null;
	ultimaalteracao: string | null;
	unidademedida: string | null;
	variacao: number | null;
}

export interface ListarSaldosEstoqueResponse {
	data: SaldoEstoque[];
	paginacao: Paginacao;
}

export interface CriarSaldoEstoqueData {
	idempresa: string;
	cest?: string | null;
	cnpjfilial?: string | null;
	codigoproduto?: string | null;
	currenttimemillis?: number | null;
	hash?: number | null;
	idfilial?: number | null;
	idproduto?: number | null;
	ncm?: string | null;
	nomeproduto?: string | null;
	quantidade?: string | null;
	ultimaalteracao?: string | null;
	unidademedida?: string | null;
	variacao?: number | null;
}

export interface AtualizarSaldoEstoqueData {
	cest?: string | null;
	cnpjfilial?: string | null;
	codigoproduto?: string | null;
	currenttimemillis?: number | null;
	hash?: number | null;
	idfilial?: number | null;
	idproduto?: number | null;
	ncm?: string | null;
	nomeproduto?: string | null;
	quantidade?: string | null;
	ultimaalteracao?: string | null;
	unidademedida?: string | null;
	variacao?: number | null;
}

export const saldoEstoqueService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nomeproduto?: string;
		codigoproduto?: string;
		idfilial?: number;
		idproduto?: number;
	}): Promise<ListarSaldosEstoqueResponse> {
		const { data } = await api.get<ListarSaldosEstoqueResponse>(
			"/saldos-estoque",
			{ params },
		);
		return data;
	},

	async buscar(id: number): Promise<SaldoEstoque> {
		const { data } = await api.get<SaldoEstoque>(`/saldos-estoque/${id}`);
		return data;
	},

	async criar(dados: CriarSaldoEstoqueData): Promise<SaldoEstoque> {
		const { data } = await api.post<SaldoEstoque>("/saldos-estoque", dados);
		return data;
	},

	async atualizar(
		id: number,
		dados: AtualizarSaldoEstoqueData,
	): Promise<SaldoEstoque> {
		const { data } = await api.put<SaldoEstoque>(
			`/saldos-estoque/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: number): Promise<void> {
		await api.delete(`/saldos-estoque/${id}`);
	},
};
