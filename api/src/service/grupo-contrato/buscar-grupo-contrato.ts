import type { GrupoContrato } from "@/model/grupo-contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarGrupoContratoPorId } from "@/repositories/grupo-contrato-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export async function buscarGrupoContratoService({
	grupoContratoId,
	idusuario,
}: {
	grupoContratoId: string;
	idusuario: string;
}): Promise<HttpResponse<GrupoContrato | null>> {
	const registro = await buscarGrupoContratoPorId(grupoContratoId);
	if (!registro) return httpNaoEncontrado();

	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);
	if (!pertence) return httpProibido();

	return httpOk(registro);
}
