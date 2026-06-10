import type { Hierarquia } from "@/model/hierarquia-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarHierarquiaPorId } from "@/repositories/hierarquia-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarHierarquiaParametros = {
	hierarquiaId: string;
	idusuario: string;
};

export async function buscarHierarquiaService({
	hierarquiaId,
	idusuario,
}: BuscarHierarquiaParametros): Promise<HttpResponse<Hierarquia | null>> {
	const registro = await buscarHierarquiaPorId(hierarquiaId);

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

	return httpOk<Hierarquia>(registro);
}
