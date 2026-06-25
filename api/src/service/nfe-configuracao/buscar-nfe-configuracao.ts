import { v4 as uuidv4 } from "uuid";
import type { NfeConfiguracao } from "@/model/nfe-emissao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNfeConfiguracao,
	buscarNfeConfiguracaoPorEmpresa,
	criarNfeConfiguracao,
} from "@/repositories/nfe-configuracao-repositories.js";
import { httpErro, httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import {
	aplicarPadroesTecnicosNfe,
	NFE_CONFIG_PADRAO,
} from "@/util/nfe-config-padrao.js";

export type NfeConfiguracaoBody = {
	ambiente?: number;
	idcertificadoativo?: string | null;
	tokenibpt?: string | null;
	emailenvioxml?: string | null;
	infresptec_cnpj?: string | null;
	infresptec_nome?: string | null;
	infresptec_email?: string | null;
	infresptec_fone?: string | null;
	contingenciaativa?: boolean;
	contingenciajson?: Record<string, unknown> | null;
};

type ParametrosEmpresa = {
	idempresa: string;
	idusuario: string;
};

export async function buscarNfeConfiguracaoService({
	idempresa,
	idusuario,
}: ParametrosEmpresa): Promise<HttpResponse<NfeConfiguracao | null>> {
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

	let config = await buscarNfeConfiguracaoPorEmpresa(idempresa);

	if (!config) {
		const agora = new Date().toISOString();
		config = await criarNfeConfiguracao(
			aplicarPadroesTecnicosNfe({
				id: uuidv4(),
				idempresa,
				ambiente: 2,
				contingenciaativa: false,
				criadoem: agora,
				atualizadoem: agora,
			}),
		);
	}

	if (
		config &&
		(config.versaoleiaute !== NFE_CONFIG_PADRAO.versaoleiaute ||
			config.schema !== NFE_CONFIG_PADRAO.schema ||
			config.verproc !== NFE_CONFIG_PADRAO.verproc)
	) {
		config = await atualizarNfeConfiguracao(
			config.id,
			aplicarPadroesTecnicosNfe({
				atualizadoem: new Date().toISOString(),
			}),
		);
	}

	return httpOk<NfeConfiguracao | null>(config ?? null);
}

export async function atualizarNfeConfiguracaoService({
	idempresa,
	idusuario,
	dados,
}: ParametrosEmpresa & { dados: NfeConfiguracaoBody }): Promise<
	HttpResponse<NfeConfiguracao | null>
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
	let config = await buscarNfeConfiguracaoPorEmpresa(idempresa);

	if (!config) {
		config = await criarNfeConfiguracao(
			aplicarPadroesTecnicosNfe({
				id: uuidv4(),
				idempresa,
				ambiente: dados.ambiente ?? 2,
				...dados,
				criadoem: agora,
				atualizadoem: agora,
			}),
		);
	} else {
		config = await atualizarNfeConfiguracao(
			config.id,
			aplicarPadroesTecnicosNfe({
				...dados,
				atualizadoem: agora,
			}),
		);
	}

	if (!config) {
		return httpErro();
	}

	return httpOk<NfeConfiguracao>(config);
}
