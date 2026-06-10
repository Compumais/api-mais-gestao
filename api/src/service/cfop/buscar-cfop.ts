import type { CFOP } from "@/model/cfop-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarCfopParametros = {
	cfopId: string;
	idusuario: string;
};

export async function buscarCfopService({
	cfopId,
	idusuario,
}: BuscarCfopParametros): Promise<HttpResponse<CFOP | null>> {
	const registro = await buscarCfopPorId(cfopId);

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

	return httpOk<CFOP>(registro);
}
