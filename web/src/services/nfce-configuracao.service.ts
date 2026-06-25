import { api } from "@/lib/axios";

import {

	nfeConfiguracaoService,

	type CertificadoDigitalResumo,

	type NfeSerie,

} from "@/services/nfe-configuracao.service";



export interface NfceConfiguracao {

	id: string;

	idempresa: string;

	ambiente: number;

	versaoleiaute: string;

	schema: string;

	idcertificadoativo?: string | null;

	verproc?: string | null;

	idcsc_homologacao?: string | null;

	csctoken_homologacao?: string | null;

	idcsc_producao?: string | null;

	csctoken_producao?: string | null;

	contingenciaativa: boolean;
	meiospagamentonfce: {
		dinheiro: boolean;
		cartao: boolean;
		pix: boolean;
		prepago: boolean;
	};
	ultimaidserie?: string | null;

}



export type { CertificadoDigitalResumo, NfeSerie };



export const nfceConfiguracaoService = {

	async buscar(idempresa: string): Promise<NfceConfiguracao> {

		const { data } = await api.get<NfceConfiguracao>(

			`/empresas/${idempresa}/nfce-configuracao`,

		);

		return data;

	},



	async atualizar(

		idempresa: string,

		dados: Partial<NfceConfiguracao>,

	): Promise<NfceConfiguracao> {

		const { data } = await api.put<NfceConfiguracao>(

			`/empresas/${idempresa}/nfce-configuracao`,

			dados,

		);

		return data;

	},



	listarCertificados: nfeConfiguracaoService.listarCertificados,

	enviarCertificado: nfeConfiguracaoService.enviarCertificado,

	ativarCertificado: nfeConfiguracaoService.ativarCertificado,

	excluirCertificado: nfeConfiguracaoService.excluirCertificado,



	async listarSeries(idempresa: string): Promise<NfeSerie[]> {
		return nfeConfiguracaoService.listarSeries(idempresa, "65");
	},

	async criarSerie(
		dados: Omit<NfeSerie, "id" | "idempresa" | "modelo"> & {
			idempresa: string;
		},
	): Promise<NfeSerie> {
		return nfeConfiguracaoService.criarSerie({
			modelo: "65",
			...dados,
		});
	},

	atualizarSerie: nfeConfiguracaoService.atualizarSerie,
	excluirSerie: nfeConfiguracaoService.excluirSerie,
};

