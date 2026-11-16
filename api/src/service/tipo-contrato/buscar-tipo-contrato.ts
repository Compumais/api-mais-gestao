import type { HttpResponse } from "@/model/http-model.js";
import type { TipoContrato } from "@/model/tipo-contrato-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarTipoContratoPorId } from "@/repositories/tipo-contrato-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarTipoContratoParametros = {
	tipoContratoId: string;
	idusuario: string;
};

export async function buscarTipoContratoService({
	tipoContratoId,
	idusuario,
}: BuscarTipoContratoParametros): Promise<HttpResponse<TipoContrato | null>> {
	const registro = await buscarTipoContratoPorId(tipoContratoId);

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

	return httpOk(registro);
}
