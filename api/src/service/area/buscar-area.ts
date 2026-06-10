import type { Area } from "@/model/area-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarAreaPorId } from "@/repositories/area-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarAreaParametros = {
	areaId: string;
	idusuario: string;
};

export async function buscarAreaService({
	areaId,
	idusuario,
}: BuscarAreaParametros): Promise<HttpResponse<Area | null>> {
	const registro = await buscarAreaPorId(areaId);

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

	return httpOk<Area>(registro);
}
