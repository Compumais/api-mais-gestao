import { buscarEstadoPorSigla } from "@/constants/estados-brasil.js";
import {
	buscarCnpjOpenCnpj,
	OpenCnpjErroConsultaError,
	OpenCnpjNaoEncontradoError,
} from "@/lib/opencnpj-client.js";
import type { ConsultaCnpjEntidade } from "@/model/consulta-cnpj-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEntidadePorCnpj } from "@/repositories/entidade-repositories.js";
import {
	buscarMunicipiosBrasilApi,
	normalizarNomeLocalidade,
} from "@/service/localidade/brasil-api-client.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";
import {
	httpBadGateway,
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";
import {
	mapearEntidadeConsultaCnpj,
	mapearExtrasConsultaCnpj,
	type LocalidadeConsultaCnpj,
} from "@/util/mapear-consulta-cnpj-entidade.js";

type ObterConsultaCnpjParametros = {
	cnpj: string;
	idempresa?: string | undefined;
};

async function resolverLocalidadeConsultaCnpj(
	municipio: string | null | undefined,
	uf: string | null | undefined,
): Promise<LocalidadeConsultaCnpj> {
	const ufNormalizada = uf?.trim().toUpperCase() ?? null;
	const estado = ufNormalizada ? buscarEstadoPorSigla(ufNormalizada) : null;
	const cidadeNome = municipio?.trim() || null;

	if (!estado || !cidadeNome) {
		return {
			cidade: cidadeNome,
			estado: estado?.nome ?? ufNormalizada,
			idestado: estado?.idestado ?? ufNormalizada,
			idcidade: null,
		};
	}

	try {
		const municipios = await buscarMunicipiosBrasilApi(estado.idestado);
		const cidadeNormalizada = normalizarNomeLocalidade(cidadeNome);
		const municipioEncontrado = municipios.find(
			(item) => normalizarNomeLocalidade(item.nome) === cidadeNormalizada,
		);

		return {
			cidade: cidadeNome,
			estado: estado.nome,
			idestado: estado.idestado,
			idcidade: municipioEncontrado?.codigo_ibge ?? null,
		};
	} catch {
		return {
			cidade: cidadeNome,
			estado: estado.nome,
			idestado: estado.idestado,
			idcidade: null,
		};
	}
}

export async function obterConsultaCnpjEntidade({
	cnpj,
	idempresa,
}: ObterConsultaCnpjParametros): Promise<HttpResponse<ConsultaCnpjEntidade>> {
	const cnpjNormalizado = normalizarCnpj(cnpj);

	if (cnpjNormalizado.length !== 14) {
		return httpBadRequest("CNPJ deve conter 14 dígitos");
	}

	try {
		const dados = await buscarCnpjOpenCnpj(cnpjNormalizado);
		const localidade = await resolverLocalidadeConsultaCnpj(
			dados.municipio,
			dados.uf,
		);

		let jaCadastrada: { id: string } | null = null;

		if (idempresa) {
			const existente = await buscarEntidadePorCnpj(idempresa, cnpjNormalizado);
			if (existente) {
				jaCadastrada = { id: existente.id };
			}
		}

		return httpOk<ConsultaCnpjEntidade>({
			entidade: mapearEntidadeConsultaCnpj(dados, localidade),
			extras: mapearExtrasConsultaCnpj(dados),
			jaCadastrada,
		});
	} catch (error) {
		if (error instanceof OpenCnpjNaoEncontradoError) {
			return httpNaoEncontrado();
		}

		if (error instanceof OpenCnpjErroConsultaError) {
			console.error("Erro ao consultar OpenCNPJ:", error);
			return httpBadGateway("Não foi possível consultar CNPJ na OpenCNPJ");
		}

		console.error("Erro inesperado ao consultar CNPJ:", error);
		return httpBadGateway("Não foi possível consultar CNPJ na OpenCNPJ");
	}
}

type ConsultarCnpjEntidadeParametros = {
	cnpj: string;
	idempresa?: string | undefined;
};

export async function consultarCnpjEntidadeService(
	parametros: ConsultarCnpjEntidadeParametros,
): Promise<HttpResponse<ConsultaCnpjEntidade>> {
	return obterConsultaCnpjEntidade(parametros);
}
