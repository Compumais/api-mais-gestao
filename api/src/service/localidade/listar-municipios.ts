import type { Municipio } from "@/model/localidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEstadoPorSigla } from "@/constants/estados-brasil.js";
import {
	buscarMunicipiosBrasilApi,
	normalizarNomeLocalidade,
} from "@/service/localidade/brasil-api-client.js";
import {
	httpBadGateway,
	httpBadRequest,
	httpOk,
} from "@/util/http-util.js";

type ListarMunicipiosResposta = {
	data: Municipio[];
};

type ListarMunicipiosParametros = {
	uf: string;
	nome?: string;
};

export async function listarMunicipiosService({
	uf,
	nome,
}: ListarMunicipiosParametros): Promise<HttpResponse<ListarMunicipiosResposta>> {
	const estado = buscarEstadoPorSigla(uf);
	if (!estado) {
		return httpBadRequest("UF inválida");
	}

	try {
		const municipios = await buscarMunicipiosBrasilApi(estado.idestado);

		let data: Municipio[] = municipios.map((municipio) => ({
			idcidade: municipio.codigo_ibge,
			nome: municipio.nome,
			idestado: estado.idestado,
		}));

		if (nome?.trim()) {
			const termo = normalizarNomeLocalidade(nome);
			data = data.filter((municipio) =>
				normalizarNomeLocalidade(municipio.nome).includes(termo),
			);
		}

		data.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

		return httpOk<ListarMunicipiosResposta>({ data });
	} catch (error) {
		console.error("Erro ao listar municípios:", error);
		return httpBadGateway("Não foi possível consultar municípios na BrasilAPI");
	}
}
