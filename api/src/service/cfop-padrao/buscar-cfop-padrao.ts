import type { CFOPPadrao } from "@/model/cfop-padrao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCfopPadraoPorId } from "@/repositories/cfop-padrao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarCfopPadraoParametros = {
	cfopPadraoId: string;
	idusuario: string;
};

export async function buscarCfopPadraoService({
	cfopPadraoId,
	idusuario,
}: BuscarCfopPadraoParametros): Promise<HttpResponse<CFOPPadrao | null>> {
	const registro = await buscarCfopPadraoPorId(cfopPadraoId);

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

	return httpOk<CFOPPadrao>(registro);
}
