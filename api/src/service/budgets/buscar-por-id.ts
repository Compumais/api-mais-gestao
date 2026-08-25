import type { Budget } from "@/model/budget-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarBudgetPorId } from "@/repositories/budget-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarBudgetPorIdParametros = {
	id: string;
	idusuario: string;
};

export async function buscarBudgetPorIdService({
	id,
	idusuario,
}: BuscarBudgetPorIdParametros): Promise<HttpResponse<Budget>> {
	const budget = await buscarBudgetPorId(id);

	if (!budget) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		budget.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<Budget>(budget);
}
