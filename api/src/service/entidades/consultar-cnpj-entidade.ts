import { buscarEstadoPorSigla } from "@/constants/estados-brasil.js";
import {
	buscarCnpjOpenCnpj,
	OpenCnpjErroConsultaError,
	OpenCnpjNaoEncontradoError,
} from "@/lib/opencnpj-client.js";
import type {
	ConsultaCnpjEntidade,
	OpenCnpjDados,
} from "@/model/consulta-cnpj-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEntidadePorCnpj } from "@/repositories/entidade-repositories.js";
import {
	BrasilApiCnpjErroConsultaError,
	BrasilApiCnpjNaoEncontradoError,
	buscarCnpjBrasilApi,
	buscarMunicipiosBrasilApi,
	normalizarNomeLocalidade,
} from "@/service/localidade/brasil-api-client.js";
import { mapearBrasilApiParaOpenCnpjDados } from "@/util/mapear-brasilapi-cnpj.js";
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

async function obterDadosCnpjComFallback(
	cnpjNormalizado: string,
): Promise<OpenCnpjDados> {
	try {
		return await buscarCnpjOpenCnpj(cnpjNormalizado);
	} catch (error) {
		if (error instanceof OpenCnpjNaoEncontradoError) {
			throw error;
		}

		console.error(
			"OpenCNPJ indisponível; tentando BrasilAPI como fallback:",
			error,
		);

		try {
			const brasilApi = await buscarCnpjBrasilApi(cnpjNormalizado);
			return mapearBrasilApiParaOpenCnpjDados(brasilApi);
		} catch (fallbackError) {
			if (fallbackError instanceof BrasilApiCnpjNaoEncontradoError) {
				throw new OpenCnpjNaoEncontradoError(cnpjNormalizado);
			}

			if (fallbackError instanceof BrasilApiCnpjErroConsultaError) {
				console.error("BrasilAPI CNPJ também falhou:", fallbackError);
				throw new OpenCnpjErroConsultaError(
					"Falha ao consultar CNPJ (OpenCNPJ e BrasilAPI indisponíveis)",
				);
			}

			throw fallbackError;
		}
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
		const dados = await obterDadosCnpjComFallback(cnpjNormalizado);
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
			console.error("Erro ao consultar CNPJ:", error);
			return httpBadGateway(
				"Não foi possível consultar CNPJ (OpenCNPJ e BrasilAPI indisponíveis)",
			);
		}

		console.error("Erro inesperado ao consultar CNPJ:", error);
		return httpBadGateway("Não foi possível consultar CNPJ");
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
