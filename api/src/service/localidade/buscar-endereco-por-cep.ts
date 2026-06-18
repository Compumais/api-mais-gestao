import type { EnderecoPorCep } from "@/model/localidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEstadoPorSigla } from "@/constants/estados-brasil.js";
import {
	buscarCepBrasilApi,
	buscarMunicipiosBrasilApi,
	normalizarNomeLocalidade,
} from "@/service/localidade/brasil-api-client.js";
import {
	httpBadGateway,
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";

export async function buscarEnderecoPorCepService(
	cep: string,
): Promise<HttpResponse<EnderecoPorCep>> {
	const cepLimpo = cep.replace(/\D/g, "");

	if (cepLimpo.length !== 8) {
		return httpBadRequest("CEP deve conter 8 dígitos");
	}

	try {
		const resultado = await buscarCepBrasilApi(cepLimpo);

		if (!resultado) {
			return httpNaoEncontrado();
		}

		const estado = buscarEstadoPorSigla(resultado.state);
		let idcidade: string | null = null;

		if (estado && resultado.city) {
			const municipios = await buscarMunicipiosBrasilApi(estado.idestado);
			const cidadeNormalizada = normalizarNomeLocalidade(resultado.city);
			const municipioEncontrado = municipios.find(
				(municipio) =>
					normalizarNomeLocalidade(municipio.nome) === cidadeNormalizada,
			);
			idcidade = municipioEncontrado?.codigo_ibge ?? null;
		}

		const endereco: EnderecoPorCep = {
			cep: cepLimpo,
			endereco: resultado.street?.trim() || null,
			bairro: resultado.neighborhood?.trim() || null,
			cidade: resultado.city?.trim() || null,
			estado: estado?.nome ?? resultado.state?.trim() ?? null,
			idestado: estado?.idestado ?? resultado.state?.trim().toUpperCase() ?? null,
			idcidade,
		};

		return httpOk(endereco);
	} catch (error) {
		console.error("Erro ao buscar CEP:", error);
		return httpBadGateway("Não foi possível consultar CEP na BrasilAPI");
	}
}
