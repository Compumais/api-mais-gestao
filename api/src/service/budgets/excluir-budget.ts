import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarBudgetPorId,
	excluirBudget,
} from "@/repositories/budget-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirBudgetParametros = {
	id: string;
	idusuario: string;
};

export async function excluirBudgetService({
	id,
	idusuario,
}: ExcluirBudgetParametros): Promise<HttpResponse<void>> {
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

	const budgetExcluido = await excluirBudget(id);

	if (!budgetExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
