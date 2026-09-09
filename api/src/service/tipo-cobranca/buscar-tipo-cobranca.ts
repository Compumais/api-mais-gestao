import type { HttpResponse } from "@/model/http-model.js";
import type { TipoCobranca } from "@/model/tipo-cobranca-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarTipoCobrancaPorId } from "@/repositories/tipo-cobranca-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarTipoCobrancaParametros = {
	tipoCobrancaId: string;
	idusuario: string;
};

export async function buscarTipoCobrancaService({
	tipoCobrancaId,
	idusuario,
}: BuscarTipoCobrancaParametros): Promise<HttpResponse<TipoCobranca | null>> {
	const registro = await buscarTipoCobrancaPorId(tipoCobrancaId);

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
