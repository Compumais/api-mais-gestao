import type { Budget } from "@/model/budget-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarBudget,
	buscarBudgetDuplicado,
	buscarBudgetPorId,
} from "@/repositories/budget-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarPlanoContasPorId } from "@/repositories/plano-contas-repositories.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type AtualizarBudgetParametros = {
	id: string;
	idusuario: string;
	dados: {
		idplanocontas?: string | undefined;
		ano?: number | undefined;
		periodicidade?: string | undefined;
		mes?: number | null | undefined;
		valor?: string | undefined;
	};
};

export async function atualizarBudgetService({
	id,
	idusuario,
	dados,
}: AtualizarBudgetParametros): Promise<HttpResponse<Budget>> {
	const budgetExistente = await buscarBudgetPorId(id);

	if (!budgetExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		budgetExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const periodicidade = dados.periodicidade ?? budgetExistente.periodicidade;
	const mes =
		periodicidade === "A"
			? null
			: dados.mes !== undefined
				? dados.mes
				: budgetExistente.mes;
	const ano = dados.ano ?? budgetExistente.ano;
	const idplanocontas = dados.idplanocontas ?? budgetExistente.idplanocontas;

	if (periodicidade === "M" && !mes) {
		return httpBadRequest("Mês é obrigatório para budget mensal");
	}

	if (dados.valor !== undefined && Number(dados.valor) <= 0) {
		return httpBadRequest("Valor limite deve ser maior que zero");
	}

	if (dados.idplanocontas) {
		const planoContas = await buscarPlanoContasPorId(dados.idplanocontas);

		if (
			!planoContas ||
			planoContas.idempresa !== budgetExistente.idempresa
		) {
			return httpBadRequest("Plano de contas inválido");
		}
	}

	const budgetDuplicado = await buscarBudgetDuplicado({
		idempresa: budgetExistente.idempresa,
		idplanocontas,
		ano,
		mes,
		ignorarId: id,
	});

	if (budgetDuplicado) {
		return httpRecursoExistente(
			"Já existe um budget para este plano de contas neste período",
		);
	}

	const budgetAtualizado = await atualizarBudget({
		id,
		dados: {
			...dados,
			periodicidade,
			mes,
			currenttimemillis: Date.now(),
		},
	});

	if (!budgetAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<Budget>(budgetAtualizado);
}
