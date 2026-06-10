import type { DAV } from "@/model/dav-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId } from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarDavParametros = {
	davId: string;
	idusuario: string;
};

export async function buscarDavService({
	davId,
	idusuario,
}: BuscarDavParametros): Promise<HttpResponse<DAV | null>> {
	const registro = await buscarDavPorId(davId);

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

	return httpOk<DAV>(registro);
}
