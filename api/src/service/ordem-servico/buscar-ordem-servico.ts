import type { OrdemServico } from "@/model/ordem-servico-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarOrdemServicoPorId } from "@/repositories/ordem-servico-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarOrdemServicoParametros = {
	ordemServicoId: string;
	idusuario: string;
};

export async function buscarOrdemServicoService({
	ordemServicoId,
	idusuario,
}: BuscarOrdemServicoParametros): Promise<HttpResponse<OrdemServico | null>> {
	const registro = await buscarOrdemServicoPorId(ordemServicoId);

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

	return httpOk<OrdemServico>(registro);
}
