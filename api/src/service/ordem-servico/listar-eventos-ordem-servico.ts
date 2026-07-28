import type { HttpResponse } from "@/model/http-model.js";
import type { OrdemServicoEvento } from "@/model/ordem-servico-evento-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarEventosPorOrdemServico } from "@/repositories/ordem-servico-evento-repositories.js";
import { buscarOrdemServicoPorIdEempresa } from "@/repositories/ordem-servico-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export async function listarEventosOrdemServicoService(params: {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<OrdemServicoEvento[]>> {
	const os = await buscarOrdemServicoPorIdEempresa(
		params.ordemServicoId,
		params.idempresa,
	);
	if (!os) return httpNaoEncontrado();

	const ok = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!ok) return httpProibido();

	const eventos = await listarEventosPorOrdemServico(
		params.ordemServicoId,
		params.idempresa,
	);
	return httpOk(eventos);
}
