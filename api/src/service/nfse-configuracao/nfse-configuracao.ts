import { v4 as uuidv4 } from "uuid";
import { NFSE_PROVEDORES } from "@/constants/nfse-emissao.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { NfseConfiguracao } from "@/model/nfse-emissao-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNfseConfiguracao,
	buscarNfseConfiguracaoPorEmpresa,
	criarNfseConfiguracao,
} from "@/repositories/nfse-configuracao-repositories.js";
import {
	httpBadRequest,
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type NfseConfiguracaoBody = {
	ambiente?: number;
	provedor?: string;
	codigomunicipioibge?: string | null;
	versaolayout?: string;
	urlwsdl?: string | null;
	urlsoperacao?: {
		emissao?: string | null;
		consulta?: string | null;
		cancelamento?: string | null;
	} | null;
	usarlotesincrono?: boolean;
	idcertificadoativo?: string | null;
	ultimaidserie?: string | null;
};

type ParametrosEmpresa = {
	idempresa: string;
	idusuario: string;
};

export async function buscarNfseConfiguracaoService({
	idempresa,
	idusuario,
}: ParametrosEmpresa): Promise<HttpResponse<NfseConfiguracao | null>> {
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

	let config = await buscarNfseConfiguracaoPorEmpresa(idempresa);

	if (!config) {
		const agora = new Date().toISOString();
		config = await criarNfseConfiguracao({
			id: uuidv4(),
			idempresa,
			ambiente: 2,
			provedor: "abrasf",
			versaolayout: "2.02",
			usarlotesincrono: true,
			criadoem: agora,
			atualizadoem: agora,
		});
	}

	return httpOk<NfseConfiguracao | null>(config ?? null);
}

export async function atualizarNfseConfiguracaoService({
	idempresa,
	idusuario,
	dados,
}: ParametrosEmpresa & { dados: NfseConfiguracaoBody }): Promise<
	HttpResponse<NfseConfiguracao | null>
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

	if (dados.provedor && !NFSE_PROVEDORES.includes(dados.provedor as never)) {
		return httpBadRequest("Provedor NFS-e inválido");
	}

	const agora = new Date().toISOString();
	let config = await buscarNfseConfiguracaoPorEmpresa(idempresa);

	if (!config) {
		config = await criarNfseConfiguracao({
			id: uuidv4(),
			idempresa,
			ambiente: dados.ambiente ?? 2,
			provedor: dados.provedor ?? "abrasf",
			codigomunicipioibge: dados.codigomunicipioibge ?? null,
			versaolayout: dados.versaolayout ?? "2.02",
			urlwsdl: dados.urlwsdl ?? null,
			urlsoperacao: dados.urlsoperacao ?? null,
			usarlotesincrono: dados.usarlotesincrono ?? true,
			idcertificadoativo: dados.idcertificadoativo ?? null,
			ultimaidserie: dados.ultimaidserie ?? null,
			criadoem: agora,
			atualizadoem: agora,
		});
	} else {
		config = await atualizarNfseConfiguracao(config.id, {
			...dados,
			atualizadoem: agora,
		});
	}

	if (!config) {
		return httpErro();
	}

	return httpOk<NfseConfiguracao>(config);
}
