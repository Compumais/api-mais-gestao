import { api } from "@/lib/axios";

export interface LoteProduto {
	id: string;
	idempresa: string;
	idproduto: string;
	numero: string;
	datafabricacao: string | null;
	datavalidade: string | null;
	codigoagregacao: string | null;
	quantidade: string;
	quantidadefiscal: string;
	inativo: number;
	vencido: boolean;
}

export interface ListarLotesProdutoResponse {
	idproduto: string;
	lotes: LoteProduto[];
	saldoOrfao: number;
	controlalote: number;
	controlavalidade: number;
}

export interface LoteFefoSugerido {
	idlote: string;
	numero: string;
	quantidade: number;
	datafabricacao: string | null;
	datavalidade: string | null;
	codigoagregacao: string | null;
}

export interface ResultadoFefo {
	lotes: LoteFefoSugerido[];
	quantidadeAtendida: number;
	quantidadeFaltante: number;
	saldoOrfao: number;
}

export const lotesService = {
	async listar(params: {
		idempresa: string;
		idproduto?: string;
		codigoproduto?: string;
	}): Promise<ListarLotesProdutoResponse> {
		const { data } = await api.get<ListarLotesProdutoResponse>("/lotes", {
			params,
		});
		return data;
	},

	async listarPorProduto(
		idproduto: string,
		idempresa: string,
	): Promise<ListarLotesProdutoResponse> {
		const { data } = await api.get<ListarLotesProdutoResponse>(
			`/produtos/${idproduto}/lotes`,
			{ params: { idempresa } },
		);
		return data;
	},

	async criar(dados: {
		idempresa: string;
		idproduto: string;
		numero: string;
		datafabricacao?: string | null;
		datavalidade?: string | null;
		codigoagregacao?: string | null;
		quantidadeAjuste?: number;
		/** 0 operacional, 1 fiscal, 2 ambos */
		tipoestoque?: 0 | 1 | 2;
	}): Promise<LoteProduto> {
		const { data } = await api.post<LoteProduto>("/lotes", dados);
		return data;
	},

	async sugerirFefo(dados: {
		idempresa: string;
		idproduto: string;
		quantidade: number;
		idcfop?: string | null;
		dataReferencia?: string;
		tipoSaldo?: "operacional" | "fiscal" | "ambos";
	}): Promise<ResultadoFefo> {
		const { data } = await api.post<ResultadoFefo>(
			"/lotes/sugerir-fefo",
			dados,
		);
		return data;
	},
};
