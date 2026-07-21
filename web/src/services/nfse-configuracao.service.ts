import { api } from "@/lib/axios";
import type { NfseConfiguracaoFormData } from "@/schemas/nfse-configuracao.schema";

export interface NfseConfiguracao {
	id: string;
	idempresa: string;
	ambiente: number;
	provedor: string;
	codigomunicipioibge: string | null;
	versaolayout: string;
	urlwsdl: string | null;
	urlsoperacao?: {
		emissao?: string | null;
		consulta?: string | null;
		cancelamento?: string | null;
	} | null;
	usarlotesincrono: boolean;
	idcertificadoativo: string | null;
	ultimaidserie: string | null;
}

export interface NfseSerie {
	id: string;
	idempresa: string;
	serie: string;
	numeroproximo: number;
	padrao: boolean;
	ativo: boolean;
}

export const nfseConfiguracaoService = {
	async buscar(idempresa: string) {
		const { data } = await api.get<NfseConfiguracao>(
			`/empresas/${idempresa}/nfse-configuracao`,
		);
		return data;
	},

	async atualizar(idempresa: string, dados: NfseConfiguracaoFormData) {
		const { data } = await api.put<NfseConfiguracao>(
			`/empresas/${idempresa}/nfse-configuracao`,
			dados,
		);
		return data;
	},

	async listarSeries(idempresa: string) {
		const { data } = await api.get<{ data: NfseSerie[] }>("/nfse-series", {
			params: { idempresa },
		});
		return data.data;
	},

	async criarSerie(payload: {
		idempresa: string;
		serie: string;
		numeroproximo?: number;
		padrao?: boolean;
	}) {
		const { data } = await api.post<NfseSerie>("/nfse-series", payload);
		return data;
	},

	async atualizarSerie(
		id: string,
		payload: {
			idempresa: string;
			serie?: string;
			numeroproximo?: number;
			padrao?: boolean;
			ativo?: boolean;
		},
	) {
		const { data } = await api.put<NfseSerie>(`/nfse-series/${id}`, payload);
		return data;
	},

	async listarCertificados(idempresa: string) {
		const { data } = await api.get<{
			data: Array<{
				id: string;
				apelido: string;
				cnpjcertificado: string;
				ativo: boolean;
			}>;
		}>(`/certificados-digitais`, { params: { idempresa } });
		return data.data ?? [];
	},
};
