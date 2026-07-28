import type { HttpResponse } from "@/model/http-model.js";
import type { OrdemServicoFaturamento } from "@/model/ordem-servico-faturamento-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarFaturamentosPorOrdemServico } from "@/repositories/ordem-servico-faturamento-repositories.js";
import { buscarOrdemServicoPorIdEempresa } from "@/repositories/ordem-servico-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export async function listarFaturamentosOrdemServicoService(params: {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<OrdemServicoFaturamento[]>> {
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

	const faturamentos = await listarFaturamentosPorOrdemServico(
		params.ordemServicoId,
		params.idempresa,
	);
	return httpOk(faturamentos);
}
