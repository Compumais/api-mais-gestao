import type { Entidade } from "@/model/entidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarEntidadeParametros = {
	entidadeId: string;
	idusuario: string;
};

export async function buscarEntidadeService({
	entidadeId,
	idusuario,
}: BuscarEntidadeParametros): Promise<HttpResponse<Entidade | null>> {
	const entidade = await buscarEntidadePorId(entidadeId);

	if (!entidade) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		entidade.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<Entidade>(entidade);
}
