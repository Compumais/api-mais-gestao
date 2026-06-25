import type { CEST } from "@/model/cest-mode.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCestPorId } from "@/repositories/cest-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarCestParametros = {
	cestId: string;
	idusuario: string;
};

export async function buscarCestService({
	cestId,
	idusuario,
}: BuscarCestParametros): Promise<HttpResponse<CEST | null>> {
	const registro = await buscarCestPorId(cestId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	if (registro.idempresa) {
		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			idusuario,
			registro.idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return httpProibido();
		}
	}

	return httpOk<CEST>(registro);
}
