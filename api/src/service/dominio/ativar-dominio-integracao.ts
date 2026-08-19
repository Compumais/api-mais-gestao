import { v4 as uuidv4 } from "uuid";
import {
	consultarActivationInfoDominio,
	habilitarActivationDominio,
} from "@/lib/dominio-client.js";
import type { DominioIntegracaoPublica } from "@/model/dominio-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarDominioIntegracao,
	buscarDominioIntegracaoPorEmpresa,
	criarDominioIntegracao,
} from "@/repositories/dominio-integracao-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criptografarTexto,
	normalizarCnpj,
} from "@/util/criptografia-certificado.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { mapearDominioIntegracaoPublica } from "@/util/mascarar-chave-dominio.js";

type AtivarDominioIntegracaoParametros = {
	idusuario: string;
	idempresa: string;
	chavecontador: string;
	boxefile?: boolean;
};

function cnpjsIguais(
	a: string | null | undefined,
	b: string | null | undefined,
) {
	if (!a || !b) return false;
	return normalizarCnpj(a) === normalizarCnpj(b);
}

export async function ativarDominioIntegracaoService({
	idusuario,
	idempresa,
	chavecontador,
	boxefile,
}: AtivarDominioIntegracaoParametros): Promise<
	HttpResponse<DominioIntegracaoPublica>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const chaveTrim = chavecontador.trim();
	if (!chaveTrim) {
		return httpBadRequest("Informe a chave fornecida pelo contador");
	}

	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa) {
		return httpBadRequest("Empresa não encontrada");
	}

	let info: Awaited<ReturnType<typeof consultarActivationInfoDominio>>;
	try {
		info = await consultarActivationInfoDominio(chaveTrim);
	} catch (erro) {
		const mensagem =
			erro instanceof Error
				? erro.message
				: "Falha ao confirmar a chave do contador";
		return httpBadRequest(mensagem);
	}

	if (!info.cnpjCliente) {
		return httpBadRequest(
			"A API Domínio não retornou o CNPJ do cliente para esta chave",
		);
	}

	if (!cnpjsIguais(info.cnpjCliente, empresa.cnpj)) {
		return httpBadRequest(
			`A chave pertence ao CNPJ ${info.cnpjCliente}, diferente do CNPJ da empresa (${empresa.cnpj})`,
		);
	}

	let integrationKey: string;
	try {
		integrationKey = await habilitarActivationDominio(chaveTrim);
	} catch (erro) {
		const mensagem =
			erro instanceof Error
				? erro.message
				: "Falha ao gerar a chave de integração Domínio";
		return httpBadRequest(mensagem);
	}

	const agora = new Date().toISOString();
	const existente = await buscarDominioIntegracaoPorEmpresa(idempresa);
	const dadosAtualizacao = {
		habilitado: true,
		boxefile: boxefile ?? existente?.boxefile ?? false,
		chavecontador: criptografarTexto(chaveTrim),
		integrationkey: criptografarTexto(integrationKey),
		nomeescritorio: info.nomeEscritorio,
		nomecliente: info.nomeCliente,
		cnpjcliente: info.cnpjCliente,
		ultimoerro: null,
		ativadoem: agora,
		atualizadoem: agora,
	};

	const registro = existente
		? await atualizarDominioIntegracao(existente.id, dadosAtualizacao)
		: await criarDominioIntegracao({
				id: uuidv4(),
				idempresa,
				criadoem: agora,
				...dadosAtualizacao,
			});

	if (!registro) {
		return httpErroInterno();
	}

	return httpOk(mapearDominioIntegracaoPublica(registro, chaveTrim));
}
