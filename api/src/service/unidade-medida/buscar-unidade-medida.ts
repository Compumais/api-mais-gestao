import type { UnidadeMedida } from "@/model/unidade-medida-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarUnidadeMedidaPorId } from "@/repositories/unidade-medida-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarUnidadeMedidaParametros = {
	unidadeMedidaId: string;
	idusuario: string;
};

export async function buscarUnidadeMedidaService({
	unidadeMedidaId,
	idusuario,
}: BuscarUnidadeMedidaParametros): Promise<HttpResponse<UnidadeMedida | null>> {
	const registro = await buscarUnidadeMedidaPorId(unidadeMedidaId);

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

	return httpOk<UnidadeMedida>(registro);
}
