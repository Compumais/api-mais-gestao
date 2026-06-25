import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface SaldoEstoqueGestao {
	id: number;
	idempresa: string;
	codigoproduto: string | null;
	nomeproduto: string | null;
	quantidade: string | null;
	quantidadefiscal: string | null;
	divergencia: string;
	ncm: string | null;
	unidademedida: string | null;
}

export interface MovimentoEstoqueGestao {
	id: number;
	idempresa: string;
	idproduto: string | null;
	tipodocumento: number | null;
	tipoestoque: number | null;
	quantidadeentrada: string | null;
	quantidadesaida: string | null;
	data: string | null;
	datahora: string | null;
	observacao: string | null;
	idoriginal: string | null;
}

export interface ResultadoBaixaEstoqueVenda {
	movimentosRegistrados: number;
	deveEmitirNfce: boolean;
	meiosUtilizados: string[];
	avisos: string[];
	emissaoNfce?: {
		emitida: boolean;
		idnotafiscal?: string;
		chave?: string;
		protocolo?: string;
		qrCode?: string;
		urlChave?: string;
		cStat?: string;
		xMotivo?: string;
		erro?: string;
		pendencias?: Array<{ codigo: string; mensagem: string }>;
	};
}

export const estoqueGestaoService = {
	async listarSaldos(params: {
		idempresa: string;
		busca?: string;
		somenteDivergencia?: boolean;
		page?: number;
		limit?: number;
	}): Promise<{ data: SaldoEstoqueGestao[]; paginacao: Paginacao }> {
		const { data } = await api.get<{
			data: SaldoEstoqueGestao[];
			paginacao: Paginacao;
		}>("/estoque/saldos", { params });
		return data;
	},

	async listarMovimentos(params: {
		idempresa: string;
		idproduto?: string;
		codigoproduto?: string;
		tipoestoque?: number;
		page?: number;
		limit?: number;
	}): Promise<{ data: MovimentoEstoqueGestao[]; paginacao: Paginacao }> {
		const { data } = await api.get<{
			data: MovimentoEstoqueGestao[];
			paginacao: Paginacao;
		}>("/estoque/movimentos", { params });
		return data;
	},

	async baixaVenda(dados: {
		idempresa: string;
		idvenda: string;
		itens: Array<{
			idproduto: string;
			quantidade: string;
			precounitario: string;
			nomeproduto?: string;
		}>;
		pagamentos: {
			valordinheiro?: string | null;
			valorcartao?: string | null;
			valorcartaocredito?: string | null;
			valorcartaodebito?: string | null;
			valorpix?: string | null;
			valorprepago?: string | null;
			valortroco?: string | null;
			valortotal?: string | null;
		};
	}): Promise<ResultadoBaixaEstoqueVenda> {
		const { data } = await api.post<ResultadoBaixaEstoqueVenda>(
			"/estoque/baixa-venda",
			dados,
		);
		return data;
	},
};
