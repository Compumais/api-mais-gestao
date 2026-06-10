import type { HttpResponse } from "@/model/http-model.js";
import type { LocalRetirada } from "@/model/local-retirada-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarLocalRetiradaPorId } from "@/repositories/local-retirada-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarLocalRetiradaParametros = {
	localRetiradaId: string;
	idusuario: string;
};

export async function buscarLocalRetiradaService({
	localRetiradaId,
	idusuario,
}: BuscarLocalRetiradaParametros): Promise<HttpResponse<LocalRetirada | null>> {
	const registro = await buscarLocalRetiradaPorId(localRetiradaId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<LocalRetirada>(registro);
}
