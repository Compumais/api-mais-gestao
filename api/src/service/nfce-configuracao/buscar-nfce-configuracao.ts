import { v4 as uuidv4 } from "uuid";

import type { HttpResponse } from "@/model/http-model.js";

import type { NfceConfiguracao } from "@/model/nfce-emissao-model.js";

import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";

import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";

import {

	atualizarNfceConfiguracao,

	buscarNfceConfiguracaoPorEmpresa,

	criarNfceConfiguracao,

} from "@/repositories/nfce-configuracao-repositories.js";

import { httpErro, httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

import {

	aplicarPadroesTecnicosNfce,

	MEIOS_PAGAMENTO_NFCE_PADRAO,

	NFCE_CONFIG_PADRAO,

	normalizarMeiosPagamentoNfce,

} from "@/util/nfce-config-padrao.js";
import type { MeiosPagamentoNfceConfig } from "@/util/nfce-config-padrao.js";

export type NfceConfiguracaoBody = {
	ambiente?: number;
	idcertificadoativo?: string | null;
	idcsc_homologacao?: string | null;
	csctoken_homologacao?: string | null;
	idcsc_producao?: string | null;
	csctoken_producao?: string | null;
	contingenciaativa?: boolean;
	contingenciajson?: Record<string, unknown> | null;
	meiospagamentonfce?: MeiosPagamentoNfceConfig;
};

type ParametrosEmpresa = {

	idempresa: string;

	idusuario: string;

};



export async function buscarNfceConfiguracaoService({

	idempresa,

	idusuario,

}: ParametrosEmpresa): Promise<HttpResponse<NfceConfiguracao | null>> {

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(

		idusuario,

		idempresa,

	);



	if (!usuarioPertenceEmpresa) {

		return httpProibido();

	}



	const empresa = await buscarEmpresaPorId(idempresa);

	if (!empresa) {

		return httpNaoEncontrado();

	}



	let config = await buscarNfceConfiguracaoPorEmpresa(idempresa);



	if (!config) {

		const agora = new Date().toISOString();

		config = await criarNfceConfiguracao(

			aplicarPadroesTecnicosNfce({

				id: uuidv4(),

				idempresa,

				ambiente: 2,

				contingenciaativa: false,

				meiospagamentonfce: MEIOS_PAGAMENTO_NFCE_PADRAO,

				criadoem: agora,

				atualizadoem: agora,

			}),

		);

	}



	if (

		config &&

		(config.versaoleiaute !== NFCE_CONFIG_PADRAO.versaoleiaute ||

			config.schema !== NFCE_CONFIG_PADRAO.schema ||

			config.verproc !== NFCE_CONFIG_PADRAO.verproc)

	) {

		config = await atualizarNfceConfiguracao(

			config.id,

			aplicarPadroesTecnicosNfce({

				atualizadoem: new Date().toISOString(),

			}),

		);

	}



	if (config) {
		config = {
			...config,
			meiospagamentonfce: normalizarMeiosPagamentoNfce(config.meiospagamentonfce),
		};
	}

	return httpOk<NfceConfiguracao | null>(config ?? null);

}



export async function atualizarNfceConfiguracaoService({

	idempresa,

	idusuario,

	dados,

}: ParametrosEmpresa & { dados: NfceConfiguracaoBody }): Promise<

	HttpResponse<NfceConfiguracao | null>

> {

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(

		idusuario,

		idempresa,

	);



	if (!usuarioPertenceEmpresa) {

		return httpProibido();

	}



	const empresa = await buscarEmpresaPorId(idempresa);

	if (!empresa) {

		return httpNaoEncontrado();

	}



	const agora = new Date().toISOString();

	let config = await buscarNfceConfiguracaoPorEmpresa(idempresa);



	if (!config) {

		config = await criarNfceConfiguracao(

			aplicarPadroesTecnicosNfce({

				id: uuidv4(),

				idempresa,

				ambiente: dados.ambiente ?? 2,

				meiospagamentonfce: normalizarMeiosPagamentoNfce(dados.meiospagamentonfce),

				...dados,

				criadoem: agora,

				atualizadoem: agora,

			}),

		);

	} else {

		const dadosAtualizacao = {

			...dados,

			...(dados.meiospagamentonfce

				? { meiospagamentonfce: normalizarMeiosPagamentoNfce(dados.meiospagamentonfce) }

				: {}),

			atualizadoem: agora,

		};

		config = await atualizarNfceConfiguracao(

			config.id,

			aplicarPadroesTecnicosNfce(dadosAtualizacao),

		);

	}



	if (!config) {

		return httpErro();

	}

	return httpOk<NfceConfiguracao>({
		...config,
		meiospagamentonfce: normalizarMeiosPagamentoNfce(config.meiospagamentonfce),
	});

}

