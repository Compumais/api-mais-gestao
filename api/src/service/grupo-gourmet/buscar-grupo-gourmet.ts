import type { GrupoGourmet } from "@/model/grupo-gourmet-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarGrupoGourmetPorId } from "@/repositories/grupo-gourmet-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarGrupoGourmetParametros = {
	id: string;
	idusuario: string;
};

export async function buscarGrupoGourmetService({
	id,
	idusuario,
}: BuscarGrupoGourmetParametros): Promise<HttpResponse<GrupoGourmet | null>> {
	const registro = await buscarGrupoGourmetPorId(id);

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

	return httpOk<GrupoGourmet>(registro);
}
