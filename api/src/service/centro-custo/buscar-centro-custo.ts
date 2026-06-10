import type { CentroCusto } from "@/model/centro-custo-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCentroCustoPorId } from "@/repositories/centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarCentroCustoParametros = {
	centroCustoId: string;
	idusuario: string;
};

export async function buscarCentroCustoService({
	centroCustoId,
	idusuario,
}: BuscarCentroCustoParametros): Promise<HttpResponse<CentroCusto | null>> {
	const registro = await buscarCentroCustoPorId(centroCustoId);

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

	return httpOk<CentroCusto>(registro);
}
