import { ESTADOS_BRASIL } from "@/constants/estados-brasil.js";
import type { Estado } from "@/model/localidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { httpOk } from "@/util/http-util.js";

type ListarEstadosResposta = {
	data: Estado[];
};

export async function listarEstadosService(): Promise<
	HttpResponse<ListarEstadosResposta>
> {
	const data: Estado[] = ESTADOS_BRASIL.map((estado) => ({
		idestado: estado.idestado,
		nome: estado.nome,
		codigoIbge: estado.codigoIbge,
	}));

	return httpOk<ListarEstadosResposta>({ data });
}
