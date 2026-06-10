import type { TipoProblema } from "@/model/tipo-problema-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarTipoProblemaPorId } from "@/repositories/tipo-problema-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarTipoProblemaParametros = {
	tipoProblemaId: string;
	idusuario: string;
};

export async function buscarTipoProblemaService({
	tipoProblemaId,
	idusuario,
}: BuscarTipoProblemaParametros): Promise<HttpResponse<TipoProblema | null>> {
	const registro = await buscarTipoProblemaPorId(tipoProblemaId);

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

	return httpOk<TipoProblema>(registro);
}
