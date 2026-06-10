import type { HttpResponse } from "@/model/http-model.js";
import type { Objeto } from "@/model/objeto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarObjetoPorId } from "@/repositories/objeto-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarObjetoParametros = {
	objetoId: string;
	idusuario: string;
};

export async function buscarObjetoService({
	objetoId,
	idusuario,
}: BuscarObjetoParametros): Promise<HttpResponse<Objeto | null>> {
	const registro = await buscarObjetoPorId(objetoId);

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

	return httpOk<Objeto>(registro);
}
