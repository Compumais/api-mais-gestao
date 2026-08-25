import type { Budget, NovoBudget } from "@/model/budget-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarBudgetDuplicado,
	criarBudget,
} from "@/repositories/budget-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarPlanoContasPorId } from "@/repositories/plano-contas-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type CriarBudgetParametros = {
	idusuario: string;
	dadosBudget: Omit<NovoBudget, "currenttimemillis">;
};

export async function criarBudgetService({
	idusuario,
	dadosBudget,
}: CriarBudgetParametros): Promise<HttpResponse<Budget>> {
	if (!dadosBudget.idempresa) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosBudget.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (dadosBudget.periodicidade === "M" && !dadosBudget.mes) {
		return httpBadRequest("Mês é obrigatório para budget mensal");
	}

	if (Number(dadosBudget.valor) <= 0) {
		return httpBadRequest("Valor limite deve ser maior que zero");
	}

	const planoContas = await buscarPlanoContasPorId(dadosBudget.idplanocontas);

	if (!planoContas || planoContas.idempresa !== dadosBudget.idempresa) {
		return httpBadRequest("Plano de contas inválido");
	}

	const mes = dadosBudget.periodicidade === "A" ? null : dadosBudget.mes;

	const budgetDuplicado = await buscarBudgetDuplicado({
		idempresa: dadosBudget.idempresa,
		idplanocontas: dadosBudget.idplanocontas,
		ano: dadosBudget.ano,
		mes,
	});

	if (budgetDuplicado) {
		return httpRecursoExistente(
			"Já existe um budget para este plano de contas neste período",
		);
	}

	const budget = await criarBudget({
		...dadosBudget,
		mes,
		currenttimemillis: Date.now(),
	});

	if (!budget) {
		return httpErroInterno();
	}

	return httpCriacao<Budget>(budget);
}
