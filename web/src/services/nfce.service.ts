import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface NfcePendente {
	idnotafiscal: string;
	idvenda: string | null;
	numeronotafiscal: string | null;
	serie: string | null;
	chavenfe: string | null;
	status: number | null;
	valortotalnota: string | null;
	emissao: string | null;
	datainclusao: string | null;
	tipoambientenfe: number | null;
	mensagemtransmissaonfe: string | null;
	codigostatusprotocolonfe: number | null;
}

export interface ResultadoReemissaoNfce {
	emitida: boolean;
	idnotafiscal?: string;
	chave?: string;
	protocolo?: string;
	cStat?: string;
	xMotivo?: string;
	erro?: string;
	pendencias?: Array<{ codigo: string; mensagem: string }>;
}

export const nfceService = {
	async listarPendentes(params: {
		idempresa: string;
		page?: number;
		limit?: number;
	}): Promise<{ data: NfcePendente[]; paginacao: Paginacao }> {
		const { data } = await api.get<{ data: NfcePendente[]; paginacao: Paginacao }>(
			"/nfce/pendentes",
			{ params },
		);
		return data;
	},

	async reemitir(params: {
		idempresa: string;
		idnotafiscal: string;
	}): Promise<ResultadoReemissaoNfce> {
		const { data } = await api.post<ResultadoReemissaoNfce>(
			`/nfce/${params.idnotafiscal}/reemitir`,
			{ idempresa: params.idempresa },
		);
		return data;
	},
};
